/// <reference types="node" />

import { defineConfig } from "@sqlf/core";

export default defineConfig({
  dialect: "postgres",
  db: {
    url: process.env.DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:54329/postgres",
  },
  queries: ["./sql/*.sql"],
  outDir: "./generated",
});
