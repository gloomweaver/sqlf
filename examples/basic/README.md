# @sqlf/example-basic

Self-contained example for `sqlf`.

## What it contains

- Docker Compose Postgres database
- `schema.sql` to create + seed `users`
- SQL CRUD queries in `sql/queries.sql`
- committed generated output in `generated/index.ts`
- Effect `HttpApi` in `src/httpApi.ts`
- runnable Node server in `src/server.ts`

## Commands

```bash
pnpm run db:start
pnpm run generate
pnpm run start
```

Reset the database volume:

```bash
pnpm run db:stop
pnpm run db:start
```

## API

- `POST /users`
- `GET /users`
- `GET /users/:id`
- `PUT /users/:id`
- `DELETE /users/:id`

## Sample requests

```bash
curl http://127.0.0.1:3000/users

curl http://127.0.0.1:3000/users/11111111-1111-1111-1111-111111111111

curl -X POST http://127.0.0.1:3000/users \
  -H 'content-type: application/json' \
  -d '{"email":"grace@example.com"}'
```
