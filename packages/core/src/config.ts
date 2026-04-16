import { access } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import createJiti from "jiti";
import type { ConfigEnv, ResolvedConfig, UserConfig, UserConfigExport } from "./types.js";

const CONFIG_NAMES = [
  "sqlf.config.ts",
  "sqlf.config.mts",
  "sqlf.config.js",
  "sqlf.config.mjs",
  "sqlf.config.cts",
  "sqlf.config.cjs",
] as const;

export function defineConfig(config: UserConfigExport): UserConfigExport {
  return config;
}

export async function loadConfig(
  options: {
    readonly cwd?: string;
    readonly configFile?: string;
    readonly command?: ConfigEnv["command"];
    readonly mode?: string;
  } = {},
): Promise<ResolvedConfig> {
  const cwd = resolve(options.cwd ?? process.cwd());
  const configFile = options.configFile
    ? resolve(cwd, options.configFile)
    : await findConfigFile(cwd);

  if (configFile === undefined) {
    throw new Error(
      `Could not find a sqlf config file in ${cwd}. Looked for: ${CONFIG_NAMES.join(", ")}`,
    );
  }

  const jiti = createJiti(import.meta.url, {
    interopDefault: true,
    moduleCache: false,
    fsCache: false,
  });
  const loaded = (await jiti.import(configFile)) as
    | UserConfigExport
    | {
        readonly default?: UserConfigExport;
      };
  const exported =
    typeof loaded === "object" && loaded !== null && "default" in loaded
      ? (loaded.default ?? loaded)
      : loaded;

  const env: ConfigEnv = {
    command: options.command ?? "generate",
    mode: options.mode ?? process.env.NODE_ENV ?? "development",
  };
  const config = typeof exported === "function" ? await exported(env) : exported;

  return resolveConfig(config as UserConfig, configFile);
}

async function findConfigFile(cwd: string): Promise<string | undefined> {
  for (const name of CONFIG_NAMES) {
    const file = resolve(cwd, name);
    if (await fileExists(file)) {
      return file;
    }
  }

  return undefined;
}

async function fileExists(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

function resolveConfig(config: UserConfig, configFile: string): ResolvedConfig {
  if (!config.db?.url) {
    throw new Error("Missing config.db.url");
  }

  if (!Array.isArray(config.queries) || config.queries.length === 0) {
    throw new Error("config.queries must contain at least one glob pattern");
  }

  if (!config.outDir) {
    throw new Error("Missing config.outDir");
  }

  const rootDir = dirname(configFile);

  return {
    rootDir,
    configFile,
    dialect: "postgres",
    db: {
      url: config.db.url,
    },
    queryPatterns: config.queries,
    outDir: resolve(rootDir, config.outDir),
    target: config.target ?? "effect",
    types: config.types ?? {},
  };
}
