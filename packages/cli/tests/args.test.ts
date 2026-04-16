import { expect, test } from "vite-plus/test";
import { parseArgs, renderHelp } from "../src/args.js";

test("parses generate command", () => {
  expect(parseArgs(["generate", "--config", "sqlf.config.ts"])).toEqual({
    command: "generate",
    configFile: "sqlf.config.ts",
  });
});

test("parses short config flag", () => {
  expect(parseArgs(["generate", "-c", "sqlf.config.ts"])).toEqual({
    command: "generate",
    configFile: "sqlf.config.ts",
  });
});

test("help is returned for no arguments", () => {
  expect(parseArgs([])).toEqual({ command: "help" });
});

test("throws for missing config value", () => {
  expect(() => parseArgs(["generate", "--config"])).toThrowErrorMatchingInlineSnapshot(`
      [Error: Missing value for --config
      
      sqlf - sqlc-style TypeScript code generation for Effect SQL
      
      Usage:
        sqlf generate [--config <path>]
        sqlf help
      
      Options:
        -c, --config <path>   Path to sqlf config file
        -h, --help            Show help
      
      Examples:
        sqlf generate
        sqlf generate --config ./sqlf.config.ts
      
      Default config names:
        sqlf.config.ts, sqlf.config.mts, sqlf.config.js, sqlf.config.mjs,
        sqlf.config.cts, sqlf.config.cjs
      ]
    `);
});

test("help text includes examples", () => {
  expect(renderHelp()).toContain("sqlf generate --config ./sqlf.config.ts");
});
