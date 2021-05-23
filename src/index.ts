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
export type Node = { [key: string]: Node | string };
export const scalarLocations : Record<string,Node> = ${JSON.stringify(locations, null, 2)};
`;
};

