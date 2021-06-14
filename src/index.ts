import  { introspectionFromSchema, GraphQLSchema } from 'graphql';
import scalarLocations from './scalarLocations';

interface Config {
  scalars?: string[]
}

export const plugin = (schema: GraphQLSchema, _documents : any, config: Config) => {
  if (!config.scalars) throw new Error("graphql-codegen-scalar-locations needs config key 'scalars' with list of scalar names");
  const intro = introspectionFromSchema(schema);

  const locations = scalarLocations(intro, config.scalars)

  return `
export type ObjectFieldTypes = {
    [key: string]: { [key: string]: string | string[] }
};

export type OpTypes = {
    [key: string]: string | string[]
};

export type ScalarLocations = {
 scalars: string[],
 inputObjectFieldTypes: ObjectFieldTypes;
 outputObjectFieldTypes: ObjectFieldTypes;
 operationMap: OpTypes;
};

export const scalarLocations : ScalarLocations = ${JSON.stringify({...locations, scalars: config.scalars} , null, 2)};
`;
};

