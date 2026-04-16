import { expect, test } from "vite-plus/test";
import { parseSqlFile } from "../src/query.js";

test("parses sqlc-style query annotations and named params", () => {
  const queries = parseSqlFile(
    "/repo/users.sql",
    `-- name: GetUser :one
SELECT id, email
FROM users
WHERE id = @id::uuid;

-- name: DeleteUser :exec
DELETE FROM users
WHERE id = @id::uuid;`,
  );

  expect(queries).toHaveLength(2);
  expect(queries[0]).toMatchObject({
    name: "GetUser",
    mode: "one",
    normalizedSql: "SELECT id, email\nFROM users\nWHERE id = $1::uuid",
    params: [{ name: "id", index: 1, pgType: "uuid" }],
  });
  expect(queries[1]).toMatchObject({
    name: "DeleteUser",
    mode: "exec",
    normalizedSql: "DELETE FROM users\nWHERE id = $1::uuid",
  });
});

test("throws when a named parameter has no explicit cast", () => {
  expect(() =>
    parseSqlFile(
      "/repo/users.sql",
      `-- name: GetUser :one
SELECT * FROM users WHERE id = @id;`,
    ),
  ).toThrow(/must use an explicit cast/);
});
