import { expect, test } from "vite-plus/test";
import { parseArgs, renderHelp } from "../src/args.js";

test("parses generate command", () => {
  expect(parseArgs(["generate", "--config", "effql.config.ts"])).toEqual({
    command: "generate",
    configFile: "effql.config.ts",
    skipInstall: false,
  });
});

test("parses short config flag", () => {
  expect(parseArgs(["generate", "-c", "effql.config.ts"])).toEqual({
    command: "generate",
    configFile: "effql.config.ts",
    skipInstall: false,
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
        effql init [--config <path>] [--skip-install]
        effql generate [--config <path>]
        effql help
      
      Options:
        -c, --config <path>   Path to effql config file
            --skip-install    Write config without installing packages
        -h, --help            Show help
      
      Examples:
        effql init
        effql init --config ./effql.config.ts
        effql generate
        effql generate --config ./effql.config.ts
      
      Default config names:
        effql.config.ts, effql.config.mts, effql.config.js, effql.config.mjs,
        effql.config.cts, effql.config.cjs
      ]
    `);
});

test("parses init command", () => {
  expect(parseArgs(["init"])).toEqual({
    command: "init",
    configFile: undefined,
    skipInstall: false,
  });
});

test("parses init skip-install flag", () => {
  expect(parseArgs(["init", "--skip-install"])).toEqual({
    command: "init",
    configFile: undefined,
    skipInstall: true,
  });
});

test("help text includes init", () => {
  expect(renderHelp()).toContain("effql init");
  expect(renderHelp()).toContain("effql generate --config ./effql.config.ts");
});
