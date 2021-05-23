# Code gen scalar locations 


This is a plugin for [Codegen](https://https://www.graphql-code-generator.com/) which finds custom scalars in your schema and outputs a spanning tree of their positions in 1. argument types and 2. query and mutation results 

This information can be used for instance to serialize/deserialize the custom scalars with [urql-serialize-scalars-exchange](https://www.npmjs.com/package/urql-serialize-scalars-exchange)

## Usage

Add as dev dependency, and configure in your `codegen.yml`:

```
overwrite: true
schema: "schema/schema.graphql"
generates:
  ./src/queries/scalarLocations.ts:
    plugins:
      - graphql-scalar-locations
    config:
      scalars: 
        - Json
        - NaiveDateTime
        - Date
```

See doc for [urql-serialize-scalars-exchange](https://www.npmjs.com/package/urql-serialize-scalars-exchange) on how to use it in this exchange.
