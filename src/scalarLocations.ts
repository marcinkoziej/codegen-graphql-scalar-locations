import _ from 'lodash';
import {
  IntrospectionInputTypeRef,
  IntrospectionTypeRef,
  IntrospectionQuery,
  IntrospectionInputObjectType,
  IntrospectionType,
  IntrospectionObjectType,
  IntrospectionInterfaceType,
} from "graphql";

/* 
 v2:
 - different strategy: store input / output types that can have scalars of interest
 - they they can be tree-walked on runtime
 */
/*
type FieldPath = {
  type: string;
  fieldType: string;
  path: string[];
};
*/

type ObjectFieldTypes = {
  [key: string]: { [key: string]: string | string[] }
};

type OpTypes = {
  [key: string]: string | string[]
}

// type Node = {[key:string]: Node | string};

const scalarLocations = (
  introspectionQuery: IntrospectionQuery,
  scalars: string[]
) => {
  const wantedScalar = (n: string) => scalars.indexOf(n) > -1;

  const inputTypes = introspectionQuery.__schema.types
    .filter(({ kind }) => kind === "INPUT_OBJECT")
    .reduce(
      (
        a: Record<string, IntrospectionInputObjectType>,
        x: IntrospectionType
      ) => {
        a[x.name] = x as IntrospectionInputObjectType;
        return a;
      },
      {}
    );

  const outputTypes = introspectionQuery.__schema.types
    .filter(({ kind }) => kind === "OBJECT")
    .reduce(
      (a: Record<string, IntrospectionObjectType>, x: IntrospectionType) => {
        a[x.name] = x as IntrospectionObjectType;
        return a;
      },
      {}
    );


  const interfaceTypes = introspectionQuery.__schema.types
    .filter(({ kind }) => kind === "INTERFACE")
    .reduce(
      (a: Record<string, IntrospectionInterfaceType>, x: IntrospectionType) => {
        a[x.name] = x as IntrospectionInterfaceType;
        return a;
      },
      {}
    );


  /* Input Object types */

  const inputObjectFieldTypes: ObjectFieldTypes = {}; // _.fromPairs(scalars.map(type => [type, type]));

  for (const name in inputTypes) {
    const typeInfo: IntrospectionInputObjectType = inputTypes[name];
    const typeMap: { [key: string]: string } = {};

    for (const field of typeInfo.inputFields) {
      const fieldType = unpackInputType(field.type);

      if (fieldType === undefined) continue; // ENUMs, others?

      if (fieldType.kind === "SCALAR" && wantedScalar(fieldType.name)) {
        typeMap[field.name] = fieldType.name
      } else if (fieldType.kind === "INPUT_OBJECT") {
        typeMap[field.name] = fieldType.name
      }
    }

    if (!_.isEmpty(typeMap))
      inputObjectFieldTypes[name] = typeMap;
  }

  /* OUTPUT: split between objects and operation type */
  function getObjectFieldTypes(typeInfo: IntrospectionObjectType) {
    const typeMap: { [key: string]: string | string[] } = {};

    for (const field of typeInfo.fields) {
      const fieldType = unpackOutputType(field.type);
      if (fieldType === undefined) continue; // ENUMs, others?

      if (fieldType.kind === "OBJECT" && fieldType.name.startsWith("__"))
        continue;

      if (fieldType.kind === "SCALAR" && wantedScalar(fieldType.name)) {
        typeMap[field.name] = fieldType.name;
      } else if (fieldType.kind === "OBJECT") {
        typeMap[field.name] = fieldType.name;
      } else if (fieldType.kind === "INTERFACE") {
        const iface = interfaceTypes[fieldType.name];
        typeMap[field.name] = iface.possibleTypes.map(t => t.name)
      }
    }

    return typeMap;
  }

  const outputObjectFieldTypes: ObjectFieldTypes = {};
  const operationMap: OpTypes = {};


  for (const name in outputTypes) {
    if (name === "RootMutationType" || name === "RootQueryType") {
      const rootType = outputTypes[name];

      Object.assign(operationMap, getObjectFieldTypes(rootType));
    } else {
      const objectType = outputTypes[name]

      if (name.startsWith("__")) continue; // __Schema, __Type, and other metadatas
      const fields = getObjectFieldTypes(objectType);
      if (!_.isEmpty(fields))
        outputObjectFieldTypes[name] = fields;
    }
  }



  return { inputObjectFieldTypes, outputObjectFieldTypes, operationMap };
};

/*
const makeTree = (paths : FieldPath[], includeTypeName : boolean) => {
  const scalarTree : Node = {}

  const nest = (map: Node, path: string[], idx: number, fieldType: string) => {
    if (idx >= path.length - 1) {
      // last element 
      if (path[idx] in map) throw new Error(`Path ${path} already exists in ${map}`)
      map[path[idx]] = fieldType;
    } else {
      const next = map[path[idx]] || {};
      if (typeof next === 'string') throw new Error(`Path ${path} overlaps with another path in existing map ${map}`)
      map[path[idx]] = next;
      nest(next, path, idx + 1, fieldType);
    }
  }

  for (const fp of paths) {
    const p = includeTypeName ? [fp.type].concat(fp.path) : fp.path;
    nest(scalarTree, p, 0, fp.fieldType);
  }
  return scalarTree;
}
*/


const unpackInputType = (
  type: IntrospectionInputTypeRef
): IntrospectionInputTypeRef | undefined => {
  if (type.kind === "SCALAR" || type.kind === "INPUT_OBJECT") return type;

  if (type.kind === "LIST" || type.kind === "NON_NULL")
    return unpackInputType(type.ofType);

  return
};

const unpackOutputType = (
  type: IntrospectionTypeRef
): IntrospectionTypeRef | undefined => {
  if (type.kind === "SCALAR" || type.kind === "OBJECT" || type.kind === "INTERFACE") return type;

  if (type.kind === "LIST" || type.kind === "NON_NULL")
    return unpackOutputType(type.ofType);

  return
};


export default scalarLocations;
