import {
  IntrospectionInputTypeRef,
  IntrospectionTypeRef,
  IntrospectionQuery,
  IntrospectionInputObjectType,
  IntrospectionType,
  IntrospectionObjectType,
} from "graphql";

type FieldPath = {
  type: string;
  fieldType: string;
  path: string[];
};

type Node = {[key:string]: Node | string};

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

  const inputFieldPaths: FieldPath[] = scalars.map(type => ({type: type, fieldType: type, path: []}));
  const outputFieldPaths: FieldPath[] = [];

  const searchInputScalars = (
    type: string,
    current: IntrospectionInputObjectType,
    path: string[]
  ) => {
    for (const field of current.inputFields) {
      const fieldType = unpackInputType(field.type);

      if (fieldType === undefined) continue; // ENUMs, others?

      if (fieldType.kind === "SCALAR" && wantedScalar(fieldType.name)) {
        inputFieldPaths.push({
          type: type,
          fieldType: fieldType.name,
          path: path.concat([field.name]),
        });
      } else if (fieldType.kind === "INPUT_OBJECT") {
        searchInputScalars(
          type,
          inputTypes[fieldType.name],
          path.concat([field.name])
        );
      }
    }
  };

  const searchOutputScalars = (
    type: string,
    current: IntrospectionObjectType,
    path: string[]
  ) => {
    if (path.length > 16) return; // dumb loop protection

    for (const field of current.fields) {
      const fieldType = unpackOutputType(field.type);

      if (fieldType === undefined) continue; // ENUMs, others?
      if (fieldType.kind === "OBJECT" && fieldType.name.startsWith("__"))
        continue;

      if (fieldType.kind === "SCALAR" && wantedScalar(fieldType.name)) {
        outputFieldPaths.push({
          type: type,
          fieldType: fieldType.name,
          path: path.concat([field.name]),
        });
      } else if (fieldType.kind === "OBJECT") {
        searchOutputScalars(
          type,
          outputTypes[fieldType.name],
          path.concat([field.name])
        );
      }
    }
  };

  for (const name in inputTypes) {
    searchInputScalars(name, inputTypes[name], []);
  }

  for (const name in outputTypes) {
    if (name === "RootMutationType" || name === "RootQueryType") {
      searchOutputScalars(name, outputTypes[name], []);
    }
  }

  const inputScalars = makeTree(inputFieldPaths, true);
  const outputScalars = makeTree(outputFieldPaths, false);

  return { inputScalars, outputScalars };
};

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
  if (type.kind === "SCALAR" || type.kind === "OBJECT") return type;

  if (type.kind === "LIST" || type.kind === "NON_NULL")
    return unpackOutputType(type.ofType);

  return 
};


export default scalarLocations;
