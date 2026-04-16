#!/usr/bin/env node
import { generate } from "../../core/src/index.ts";
import { parseArgs, renderHelp } from "./args.js";

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));

  if (parsed.command === "help") {
    console.log(renderHelp());
    return;
  }

  const result = await generate({
    cwd: process.cwd(),
    configFile: parsed.configFile,
  });

  console.log(`Generated ${result.queryCount} queries to ${result.outFile}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
