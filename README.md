# sqlf

[![CI](https://github.com/gloomweaver/sqlf/actions/workflows/ci.yml/badge.svg)](https://github.com/gloomweaver/sqlf/actions/workflows/ci.yml)

`sqlf` is a `sqlc`-style TypeScript code generator for `effect` / `@effect/sql`.

It keeps a SQL-first workflow, uses Postgres introspection to infer types, and emits Effect-native code built around `Schema` and `SqlSchema.*`.

## Why sqlf

- write raw SQL in `.sql` files
- keep familiar query annotations like `-- name: GetUser :one`
- use TypeScript / JavaScript config via `defineConfig()` instead of YAML
- infer result shapes from a real Postgres database
- generate executable Effect wrappers instead of plain DTOs

## Status

This is an early **Postgres-only MVP**.

What works today:

- TS / JS config via `defineConfig()`
- query annotations: `:one`, `:maybeOne`, `:many`, `:exec`
- named params via `@param`
- Postgres-backed type inference
- generated `Schema` exports and `SqlSchema.single/findOne/findAll/void` wrappers
- self-contained CRUD example with Docker Compose and an Effect HTTP API

## Quick start

Try the example in two commands:

```bash
vp run -r build
vp run @sqlf/example-basic#generate
```

Then start the example API:

```bash
vp run @sqlf/example-basic#start
```

Or run the full smoke test used by CI:

```bash
pnpm run example:smoke
```

## Workspace

- `packages/core` — config loading, SQL parsing, Postgres analysis, code generation
- `packages/cli` — `sqlf generate`
- `examples/basic` — self-contained Postgres + generated CRUD module + Effect HTTP API

## CLI

```bash
sqlf --help
sqlf generate --config ./sqlf.config.ts
```

## Config

`sqlf` uses code-based config:

```ts
import { defineConfig } from "@sqlf/core";

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

- `sqlf.config.ts`
- `sqlf.config.mts`
- `sqlf.config.js`
- `sqlf.config.mjs`
- `sqlf.config.cts`
- `sqlf.config.cjs`

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

-- name: ListUsers :many
SELECT id, email, created_at
FROM users
ORDER BY created_at DESC;
```

## Generated output shape

Generated modules export:

- `*ParamsSchema`
- `*ResultSchema`
- `*Params` / `*Result` type aliases
- raw `*Sql` strings
- executable `SqlSchema.*` wrappers

Example:

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

## Direct usage example

You can call generated functions by providing a SQL client layer:

```ts
import { PgClient } from "@effect/sql-pg";
import { Effect, Redacted } from "effect";
import { createUser, listUsers } from "./generated/index.ts";

const program = Effect.gen(function* () {
  const created = yield* createUser({
    id: "33333333-3333-3333-3333-333333333333",
    email: "grace@example.com",
  });

  const users = yield* listUsers({});

  return { created, users };
});

const runnable = program.pipe(
  Effect.provide(
    PgClient.layer({
      url: Redacted.make("postgres://postgres:postgres@127.0.0.1:54329/postgres"),
    }),
  ),
);
```

## Effect HTTP API example

`examples/basic/src/httpApi.ts` wires generated CRUD queries into an Effect `HttpApi`.

Routes:

- `POST /users`
- `GET /users`
- `GET /users/:id`
- `PUT /users/:id`
- `DELETE /users/:id`

Try it:

```bash
curl http://127.0.0.1:3000/users

curl http://127.0.0.1:3000/users/11111111-1111-1111-1111-111111111111

curl -X POST http://127.0.0.1:3000/users \
  -H 'content-type: application/json' \
  -d '{"email":"grace@example.com"}'
```

## Known limitations

Current MVP limitations:

- Postgres only
- generation requires a live database connection
- named params currently work best with explicit casts, for example `@id::uuid`
- nullability inference is intentionally conservative
- output is currently a single generated module per target
- API / config shape may still evolve before a stable release

## Validation and CI

Current checks cover:

- formatting and linting
- workspace typechecking
- unit tests
- Postgres integration tests
- example generation smoke test in GitHub Actions
- example API smoke test via `pnpm run example:smoke`

## Example project

See `examples/basic` for the easiest end-to-end demo:

- `compose.yaml` starts Postgres on `127.0.0.1:54329`
- `schema.sql` creates and seeds `users`
- `sql/queries.sql` defines CRUD queries
- `generated/index.ts` is committed generated output
- `src/httpApi.ts` and `src/server.ts` show runtime usage

## Development commands

```bash
vp install
vp lint
vp run -r check
vp run -r test
vp run -r build
pnpm run example:smoke
```
