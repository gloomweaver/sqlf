# @effql/core

[![npm: @effql/core](https://img.shields.io/npm/v/%40effql%2Fcore?label=%40effql%2Fcore)](https://www.npmjs.com/package/@effql/core)

Core library for `effql`.

It provides:

- `defineConfig()`
- config loading
- SQL query parsing
- Postgres-backed query analysis
- Effect-oriented code generation

## Install

```bash
npm install -D @effql/core
```

```bash
pnpm add -D @effql/core
```

## Usage

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

See the main repo README for the full CLI flow and example project.
