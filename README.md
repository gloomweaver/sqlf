# sqlf

`sqlf` is an MVP for a SQL-first TypeScript code generator targeting `effect` + `@effect/sql`.

It is inspired by `sqlc`, but uses:

- TypeScript / JS config via `defineConfig()`
- database introspection for result / parameter typing
- generated `Schema` + `SqlSchema.*` helpers for Effect-native usage

## Workspace

- `packages/core` — config loading, SQL parsing, Postgres analysis, code generation
- `packages/cli` — `sqlf generate`
- `examples/basic` — self-contained Postgres + generated CRUD example + Effect HTTP API

## MVP scope

Current MVP supports:

- JS / TS config via `defineConfig()`
- Postgres-only
- sqlc-style query annotations: `:one`, `:maybeOne`, `:many`, `:exec`
- named params via `@param`
- Postgres-backed result type inference
- generated Effect SQL wrappers via `SqlSchema.single/findOne/findAll/void`

## Commands

```bash
vp install
vp lint
vp run -r check
vp run -r test
vp run -r build
```

## Quick start

Generate the example output:

```bash
vp run -r build
vp run @sqlf/example-basic#generate
```

Start the example API:

```bash
vp run @sqlf/example-basic#start
```

Reset the example database if you want to re-run `schema.sql` from scratch:

```bash
cd examples/basic
pnpm run db:stop
pnpm run db:start
```

## Example: generated CRUD module

The basic example lives in `examples/basic` and is fully local:

- `examples/basic/compose.yaml` starts Postgres on `127.0.0.1:54329`
- `examples/basic/schema.sql` creates and seeds the `users` table
- `examples/basic/sql/queries.sql` defines CRUD queries
- `examples/basic/generated/index.ts` is committed generated output
- `examples/basic/src/httpApi.ts` shows how to use generated queries inside an Effect `HttpApi`

The example SQL includes:

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

-- name: UpdateUser :one
UPDATE users
SET email = @email::text
WHERE id = @id::uuid
RETURNING id, email, created_at;

-- name: DeleteUser :exec
DELETE FROM users
WHERE id = @id::uuid;
```

## Example: direct generated usage

You can call the generated functions directly by providing a SQL client layer:

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

## Example: generated output shape

Generated modules export:

- `*ParamsSchema`
- `*ResultSchema`
- `*Params` / `*Result` type aliases
- raw `*Sql` strings
- `SqlSchema.*` wrappers

Example output from `examples/basic/generated/index.ts`:

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

## Example: Effect HTTP API

`examples/basic/src/httpApi.ts` wires the generated module into an Effect `HttpApi`.

It exposes:

- `POST /users`
- `GET /users`
- `GET /users/:id`
- `PUT /users/:id`
- `DELETE /users/:id`

Start it:

```bash
vp run @sqlf/example-basic#start
```

Then try it:

```bash
curl http://127.0.0.1:3000/users

curl http://127.0.0.1:3000/users/11111111-1111-1111-1111-111111111111

curl -X POST http://127.0.0.1:3000/users \
  -H 'content-type: application/json' \
  -d '{"email":"grace@example.com"}'

curl -X PUT http://127.0.0.1:3000/users/11111111-1111-1111-1111-111111111111 \
  -H 'content-type: application/json' \
  -d '{"email":"ada+updated@example.com"}'

curl -X DELETE http://127.0.0.1:3000/users/11111111-1111-1111-1111-111111111111
```

## Generated output notes

The generator currently emits:

- query doc comments with source file + SQL
- Effect schemas for params and results
- raw SQL strings
- executable wrappers built on `SqlSchema`

## Integration testing

`packages/core/tests/postgres.integration.test.ts` runs against either:

- `SQLF_TEST_DATABASE_URL`, or
- an ephemeral Docker `postgres:16-alpine` container
