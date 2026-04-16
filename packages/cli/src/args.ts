export interface CliArgs {
  readonly command: "generate" | "help";
  readonly configFile?: string;
}

export function parseArgs(argv: readonly string[]): CliArgs {
  const args = [...argv];

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    return { command: "help" };
  }

  const command = args[0];
  if (command !== "generate") {
    throw new Error(`Unknown command: ${command}`);
  }

  let configFile: string | undefined;

  for (let index = 1; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--config") {
      configFile = args[index + 1];
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return {
    command,
    configFile,
  };
}

export function renderHelp(): string {
  return [
    "sqlf - SQL-first Effect generator (MVP)",
    "",
    "Usage:",
    "  sqlf generate [--config path]",
    "",
  ].join("\n");
}
