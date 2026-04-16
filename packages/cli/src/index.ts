#!/usr/bin/env node
import { generate } from "@effql/core";
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
  const message = error instanceof Error ? error.message : String(error);
  console.error(`effql: ${message}`);
  process.exitCode = 1;
});
