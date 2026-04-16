import { readFile } from "node:fs/promises";
import { expect, test } from "vite-plus/test";
import { renderEffectModule } from "../src/generator.js";
import type { AnalyzedQuery } from "../src/types.js";

test("renders an effect/sql module", async () => {
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

  const expected = await readFile(
    new URL("./fixtures/effect-module.golden.txt", import.meta.url),
    "utf8",
  );

  expect(module).toBe(expected);
});
