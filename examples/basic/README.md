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

curl -X PUT http://127.0.0.1:3000/users/11111111-1111-1111-1111-111111111111 \
  -H 'content-type: application/json' \
  -d '{"email":"ada+updated@example.com"}'

curl -X DELETE http://127.0.0.1:3000/users/11111111-1111-1111-1111-111111111111
```

## Sample responses

`GET /users`

```json
[
  {
    "id": "22222222-2222-2222-2222-222222222222",
    "email": "linus@example.com",
    "created_at": "2024-01-02T00:00:00.000Z"
  },
  {
    "id": "11111111-1111-1111-1111-111111111111",
    "email": "ada@example.com",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
]
```

`POST /users`

```json
{
  "id": "4aa76787-2fbd-42f4-802f-e7b15f2960c8",
  "email": "grace@example.com",
  "created_at": "2026-04-16T11:03:24.092Z"
}
```

`DELETE /users/:id`

```text
204 No Content
```
