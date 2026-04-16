export interface CliArgs {
  readonly command: "generate" | "help";
  readonly configFile?: string;
}

export function parseArgs(argv: readonly string[]): CliArgs {
  const args = [...argv];

  if (args.length === 0 || args[0] === "help" || args.includes("--help") || args.includes("-h")) {
    return { command: "help" };
  }

  const command = args[0];
  if (command !== "generate") {
    throw new Error(`Unknown command: ${command}\n\n${renderHelp()}`);
  }

  let configFile: string | undefined;

  for (let index = 1; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--config" || arg === "-c") {
      configFile = args[index + 1];

      if (configFile === undefined || configFile.startsWith("-")) {
        throw new Error(`Missing value for ${arg}\n\n${renderHelp()}`);
      }

      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}\n\n${renderHelp()}`);
  }

  return {
    command,
    configFile,
  };
}

export function renderHelp(): string {
  return [
    "sqlf - sqlc-style TypeScript code generation for Effect SQL",
    "",
    "Usage:",
    "  sqlf generate [--config <path>]",
    "  sqlf help",
    "",
    "Options:",
    "  -c, --config <path>   Path to sqlf config file",
    "  -h, --help            Show help",
    "",
    "Examples:",
    "  sqlf generate",
    "  sqlf generate --config ./sqlf.config.ts",
    "",
    "Default config names:",
    "  sqlf.config.ts, sqlf.config.mts, sqlf.config.js, sqlf.config.mjs,",
    "  sqlf.config.cts, sqlf.config.cjs",
    "",
  ].join("\n");
}
