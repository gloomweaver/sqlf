# @effql/cli

[![npm: @effql/cli](https://img.shields.io/npm/v/%40effql%2Fcli?label=%40effql%2Fcli)](https://www.npmjs.com/package/@effql/cli)

CLI package for `effql`.

It publishes the `effql` command.

## Install

```bash
npm install -D @effql/cli @effql/core
```

```bash
pnpm add -D @effql/cli @effql/core
```

## Usage

Bootstrap a project:

```bash
npx @effql/cli init
npx @effql/cli init --config ./effql.config.ts
```

This writes:

- `effql.config.ts`
- `sql/queries.sql`
- `package.json` if missing

Installed locally:

```bash
npx effql init
npx effql generate
npx effql generate --config ./effql.config.ts
```

One-off usage:

```bash
npx @effql/cli generate
pnpm dlx @effql/cli generate
```

## Help

```bash
effql --help
```

See the main repo README for config details and the end-to-end example.
