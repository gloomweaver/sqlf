import { loadConfig } from "./config.js";
import { writeEffectModule } from "./generator.js";
import { analyzeQueries } from "./postgres.js";
import { loadQueries } from "./query.js";
import type { GenerateResult } from "./types.js";

export async function generate(
  options: {
    readonly cwd?: string;
    readonly configFile?: string;
  } = {},
): Promise<GenerateResult> {
  const config = await loadConfig({
    cwd: options.cwd,
    configFile: options.configFile,
    command: "generate",
  });
  const queries = await loadQueries(config);
  const analyzed = await analyzeQueries(config, queries);

  return writeEffectModule(config, analyzed);
}
