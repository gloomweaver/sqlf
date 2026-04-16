# effql

[![CI](https://github.com/gloomweaver/effql/actions/workflows/ci.yml/badge.svg)](https://github.com/gloomweaver/effql/actions/workflows/ci.yml)
[![npm: @effql/cli](https://img.shields.io/npm/v/%40effql%2Fcli?label=%40effql%2Fcli)](https://www.npmjs.com/package/@effql/cli)
[![npm: @effql/core](https://img.shields.io/npm/v/%40effql%2Fcore?label=%40effql%2Fcore)](https://www.npmjs.com/package/@effql/core)

`effql` is a `sqlc`-style TypeScript code generator for `effect` / `@effect/sql`.

It keeps a SQL-first workflow, uses Postgres introspection to infer types, and emits Effect-native code built around `Schema` and `SqlSchema.*`.

## Packages

- [`@effql/cli`](https://www.npmjs.com/package/@effql/cli) — CLI package providing the `effql` command
- [`@effql/core`](https://www.npmjs.com/package/@effql/core) — config loading, SQL parsing, Postgres analysis, and code generation

## Installation

```bash
npm install -D @effql/cli @effql/core
```

```bash
pnpm add -D @effql/cli @effql/core
```

## CLI usage

Bootstrap a project:

```bash
npx @effql/cli init
npx @effql/cli init --config ./effql.config.ts
```

This creates:

- `effql.config.ts`
- `sql/queries.sql`
- `package.json` if one does not already exist

Installed locally:

```bash
npx effql init
npx effql generate
npx effql generate --config ./effql.config.ts
```

One-off without installing:

```bash
npx @effql/cli generate
npx @effql/cli generate --config ./effql.config.ts
```

Also works with pnpm:

```bash
pnpm dlx @effql/cli generate
```

Yes — `npx` works because `@effql/cli` publishes the `effql` bin.

## Quick start

Try the example in two commands:

```bash
vp run -r build
vp run @effql/example-basic#generate
```

Then start the example API:

```bash
vp run @effql/example-basic#start
```

Or run the full smoke test used by CI:

```bash
pnpm run example:smoke
```

## Config

`effql` uses code-based config:

```ts
import { defineConfig } from "@effql/core";

export default defineConfig({
  dialect: "postgres",
  db: {
    url: process.env.DATABASE_URL!,
  },
  queries: ["./sql/**/*.sql"],
  outDir: "./generated",
});
```

Supported config filenames:

- `effql.config.ts`
- `effql.config.mts`
- `effql.config.js`
- `effql.config.mjs`
- `effql.config.cts`
- `effql.config.cjs`

## SQL example

```sql
-- name: CreateUser :one
INSERT INTO users (id, email, created_at)
VALUES (@id::uuid, @email::text, now())
RETURNING id, email, created_at;

-- name: GetUser :one
SELECT id, email, created_at
FROM users
WHERE id = @id::uuid;
```

## Generated output shape

Starter `sql/queries.sql` contains a simple `Healthcheck` query you can edit right away.

Generated modules export:

- `*ParamsSchema`
- `*ResultSchema`
- `*Params` / `*Result` type aliases
- raw `*Sql` strings
- executable `SqlSchema.*` wrappers

```ts
export const CreateUserResultSchema = Schema.Struct({
  id: Schema.UUID,
  email: Schema.String,
  created_at: Schema.DateFromSelf,
});

export const createUser = SqlSchema.single({
  Request: CreateUserParamsSchema,
  Result: CreateUserResultSchema,
  execute: (request) =>
    Effect.flatMap(SqlClient.SqlClient, (sql) =>
      sql.unsafe(createUserSql, [request.id, request.email]),
    ),
});
```

## Example project

See `examples/basic` for the easiest end-to-end demo:

- `compose.yaml` starts Postgres on `127.0.0.1:54329`
- `schema.sql` creates and seeds `users`
- `sql/queries.sql` defines CRUD queries
- `generated/index.ts` is committed generated output
- `src/httpApi.ts` and `src/server.ts` show runtime usage

## Status

This is an early **Postgres-only MVP**.

What works today:

- TS / JS config via `defineConfig()`
- query annotations: `:one`, `:maybeOne`, `:many`, `:exec`
- named params via `@param`
- Postgres-backed type inference
- generated `Schema` exports and `SqlSchema.single/findOne/findAll/void` wrappers
- self-contained CRUD example with Docker Compose and an Effect HTTP API

## Known limitations

Current MVP limitations:

- Postgres only
- generation requires a live database connection
- named params currently work best with explicit casts, for example `@id::uuid`
- nullability inference is intentionally conservative
- output is currently a single generated module per target
- API / config shape may still evolve before a stable release

## Publishing

A GitHub Actions release workflow publishes the npm packages when a GitHub release is marked as `published`.

Before using it:

- add an `NPM_TOKEN` repository secret if you keep token-based publishing
- make sure you own/publish to both `@effql/cli` and `@effql/core` on npm
- create releases with tags that match the package versions, for example `v0.1.1`

The release workflow:

- installs dependencies
- verifies the release tag matches `packages/cli` and `packages/core` versions
- builds, lints, formats, tests, and runs the example smoke test
- publishes `@effql/core`
- publishes `@effql/cli`

## Development

```bash
vp install
vp lint
vp fmt
vp test
vp run -r build
pnpm run example:smoke
```
