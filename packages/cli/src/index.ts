#!/usr/bin/env node
import { generate } from "@effql/core";
import { parseArgs, renderHelp } from "./args.js";
import { initProject } from "./init.js";

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));

  if (parsed.command === "help") {
    console.log(renderHelp());
    return;
  }

  if (parsed.command === "init") {
    const result = await initProject({
      cwd: process.cwd(),
      configFile: parsed.configFile,
      skipInstall: parsed.skipInstall,
    });

    console.log(`Created ${result.configFile}`);
    if (result.packageJsonCreated) {
      console.log("Created package.json");
    }
    if (result.queriesFileCreated) {
      console.log(`Created ${result.queriesFile}`);
    }
    if (parsed.skipInstall) {
      console.log(`Skipped install: ${result.installCommand.join(" ")}`);
    } else {
      console.log(`Installed ${result.installedPackages.join(", ")}`);
    }
    console.log("Next steps:");
    console.log("  1. Set DATABASE_URL");
    console.log("  2. Edit ./sql/queries.sql");
    console.log("  3. Run effql generate");
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
