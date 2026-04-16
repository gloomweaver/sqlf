export interface CliArgs {
  readonly command: "generate" | "init" | "help";
  readonly configFile?: string;
  readonly skipInstall?: boolean;
}

export function parseArgs(argv: readonly string[]): CliArgs {
  const args = [...argv];

  if (args.length === 0 || args[0] === "help" || args.includes("--help") || args.includes("-h")) {
    return { command: "help" };
  }

  const command = args[0];
  if (command !== "generate" && command !== "init") {
    throw new Error(`Unknown command: ${command}\n\n${renderHelp()}`);
  }

  let configFile: string | undefined;
  let skipInstall = false;

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

    if (arg === "--skip-install") {
      if (command !== "init") {
        throw new Error(`Unknown argument: ${arg}\n\n${renderHelp()}`);
      }

      skipInstall = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}\n\n${renderHelp()}`);
  }

  return {
    command,
    configFile,
    skipInstall,
  };
}

export function renderHelp(): string {
  return [
    "effql - sqlc-style TypeScript code generation for Effect SQL",
    "",
    "Usage:",
    "  effql init [--config <path>] [--skip-install]",
    "  effql generate [--config <path>]",
    "  effql help",
    "",
    "Options:",
    "  -c, --config <path>   Path to effql config file",
    "      --skip-install    Write config without installing packages",
    "  -h, --help            Show help",
    "",
    "Examples:",
    "  effql init",
    "  effql init --config ./effql.config.ts",
    "  effql generate",
    "  effql generate --config ./effql.config.ts",
    "",
    "Default config names:",
    "  effql.config.ts, effql.config.mts, effql.config.js, effql.config.mjs,",
    "  effql.config.cts, effql.config.cjs",
    "",
  ].join("\n");
}
