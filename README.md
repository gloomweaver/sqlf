# sqlf

MVP for a SQL-first TypeScript code generator targeting `effect` + `@effect/sql`.

## Workspace

- `packages/core` — config loading, SQL parsing, Postgres analysis, code generation
- `packages/cli` — `sqlf generate` command
- `examples/basic` — example config and SQL queries

## Commands

```bash
vp install
vp lint
vp run -r check
vp run -r test
vp run -r build
node packages/cli/dist/index.mjs generate --config examples/basic/sqlf.config.ts
```

## Generated output

The generated module now emits:

- `*ParamsSchema` and `*ResultSchema`
- `*Params` and `*Result` type aliases via `Schema.Schema.Type<...>`
- raw `*Sql` constants
- query docs with source file + SQL
- `SqlSchema.single/findOne/findAll/void` wrappers

## Integration testing

`packages/core/tests/postgres.integration.test.ts` runs against:

- `SQLF_TEST_DATABASE_URL`, if provided, or
- an ephemeral Docker `postgres:16-alpine` container

## MVP scope

- JS/TS config via `defineConfig()`
- Postgres-only
- Query annotations inspired by sqlc (`:one`, `:maybeOne`, `:many`, `:exec`)
- Named params via `@param`
- Result type inference through lightweight Postgres analysis
- Effect SQL code generation
