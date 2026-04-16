import { defineConfig } from "../../packages/core/src/index.ts";

export default defineConfig({
  dialect: "postgres",
  db: {
    url: process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/postgres",
  },
  queries: ["./sql/*.sql"],
  outDir: "./generated",
});
