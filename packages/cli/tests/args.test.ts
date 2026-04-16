import { expect, test } from "vite-plus/test";
import { parseArgs } from "../src/args.js";

test("parses generate command", () => {
  expect(parseArgs(["generate", "--config", "sqlf.config.ts"])).toEqual({
    command: "generate",
    configFile: "sqlf.config.ts",
  });
});

test("help is returned for no arguments", () => {
  expect(parseArgs([])).toEqual({ command: "help" });
});
