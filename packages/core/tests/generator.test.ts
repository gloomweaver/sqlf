import { expect, test } from "vite-plus/test";
import { renderEffectModule } from "../src/generator.js";
import type { AnalyzedQuery } from "../src/types.js";

test("renders an effect/sql module", () => {
  const module = renderEffectModule([
    {
      name: "GetUser",
      mode: "one",
      sourceFile: "/repo/users.sql",
      sql: "SELECT id, email FROM users WHERE id = @id::uuid",
      normalizedSql: "SELECT id, email FROM users WHERE id = $1::uuid",
      params: [
        {
          name: "id",
          index: 1,
          pgType: "uuid",
          tsType: "string",
          schema: "Schema.UUID",
        },
      ],
      fields: [
        {
          name: "id",
          nullable: false,
          pgType: "uuid",
          tsType: "string",
          schema: "Schema.UUID",
        },
        {
          name: "email",
          nullable: false,
          pgType: "text",
          tsType: "string",
          schema: "Schema.String",
        },
      ],
    } satisfies AnalyzedQuery,
  ]);

  expect(module).toContain('import { Effect, Schema } from "effect";');
  expect(module).toContain("export const GetUserParamsSchema = Schema.Struct");
  expect(module).toContain(
    "export type GetUserParams = Schema.Schema.Type<typeof GetUserParamsSchema>;",
  );
  expect(module).toContain("export const GetUserResultSchema = Schema.Struct");
  expect(module).toContain("export const getUser = SqlSchema.single");
  expect(module).toContain("sql.unsafe(getUserSql, [request.id])");
  expect(module).toContain("Query: GetUser");
});
