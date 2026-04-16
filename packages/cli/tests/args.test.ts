import { expect, test } from "vite-plus/test";
import { parseArgs, renderHelp } from "../src/args.js";

test("parses generate command", () => {
  expect(parseArgs(["generate", "--config", "effql.config.ts"])).toEqual({
    command: "generate",
    configFile: "effql.config.ts",
  });
});

test("parses short config flag", () => {
  expect(parseArgs(["generate", "-c", "effql.config.ts"])).toEqual({
    command: "generate",
    configFile: "effql.config.ts",
  });
});

test("help is returned for no arguments", () => {
  expect(parseArgs([])).toEqual({ command: "help" });
});

test("throws for missing config value", () => {
  expect(() => parseArgs(["generate", "--config"])).toThrowErrorMatchingInlineSnapshot(`
      [Error: Missing value for --config
      
      effql - sqlc-style TypeScript code generation for Effect SQL
      
      Usage:
        effql generate [--config <path>]
        effql help
      
      Options:
        -c, --config <path>   Path to effql config file
        -h, --help            Show help
      
      Examples:
        effql generate
        effql generate --config ./effql.config.ts
      
      Default config names:
        effql.config.ts, effql.config.mts, effql.config.js, effql.config.mjs,
        effql.config.cts, effql.config.cjs
      ]
    `);
});

test("help text includes examples", () => {
  expect(renderHelp()).toContain("effql generate --config ./effql.config.ts");
});
