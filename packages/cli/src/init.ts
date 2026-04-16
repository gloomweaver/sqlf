import { spawn } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import cliPackageJson from "../package.json" with { type: "json" };

const DEFAULT_CONFIG_FILE = "effql.config.ts";
const DEFAULT_QUERIES_FILE = "sql/queries.sql";
const DEFAULT_PACKAGES = [
  `@effql/cli@${cliPackageJson.version}`,
  `@effql/core@${cliPackageJson.version}`,
] as const;

type PackageManager = "pnpm" | "npm" | "yarn" | "bun";

export interface InitOptions {
  readonly cwd?: string;
  readonly configFile?: string;
  readonly skipInstall?: boolean;
}

export interface InitResult {
  readonly configFile: string;
  readonly queriesFile: string;
  readonly queriesFileCreated: boolean;
  readonly packageManager: PackageManager;
  readonly installCommand: readonly [string, ...string[]];
  readonly installedPackages: readonly string[];
  readonly packageJsonCreated: boolean;
}

export async function initProject(options: InitOptions = {}): Promise<InitResult> {
  const cwd = resolve(options.cwd ?? process.cwd());
  const configFile = resolve(cwd, options.configFile ?? DEFAULT_CONFIG_FILE);

  if (await fileExists(configFile)) {
    throw new Error(`Config file already exists: ${configFile}`);
  }

  const packageJsonFile = resolve(cwd, "package.json");
  const queriesFile = resolve(cwd, DEFAULT_QUERIES_FILE);
  const packageJsonCreated = !(await fileExists(packageJsonFile));

  if (packageJsonCreated) {
    await writeFile(packageJsonFile, renderPackageJson(basename(cwd)), "utf8");
  }

  await mkdir(dirname(configFile), { recursive: true });
  await writeFile(configFile, renderInitConfig(), "utf8");

  await mkdir(dirname(queriesFile), { recursive: true });
  const queriesFileCreated = !(await fileExists(queriesFile));
  if (queriesFileCreated) {
    await writeFile(queriesFile, renderQueriesFile(), "utf8");
  }

  const packageManager = await detectPackageManager(cwd);
  const installCommand = buildInstallCommand(packageManager, [...DEFAULT_PACKAGES]);

  if (!options.skipInstall) {
    await runCommand(cwd, installCommand[0], installCommand.slice(1));
  }

  return {
    configFile,
    queriesFile,
    queriesFileCreated,
    packageManager,
    installCommand,
    installedPackages: [...DEFAULT_PACKAGES],
    packageJsonCreated,
  };
}

export function renderInitConfig(): string {
  return [
    '/// <reference types="node" />',
    "",
    'import { defineConfig } from "@effql/core";',
    "",
    "export default defineConfig({",
    '  dialect: "postgres",',
    "  db: {",
    '    url: process.env.DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:5432/postgres",',
    "  },",
    '  queries: ["./sql/**/*.sql"],',
    '  outDir: "./generated",',
    "});",
    "",
  ].join("\n");
}

export function renderQueriesFile(): string {
  return ["-- name: Healthcheck :one", "SELECT now() AS current_time;", ""].join("\n");
}

export function buildInstallCommand(
  packageManager: PackageManager,
  packages: readonly string[],
): readonly [string, ...string[]] {
  switch (packageManager) {
    case "pnpm":
      return ["pnpm", "add", "-D", ...packages];
    case "npm":
      return ["npm", "install", "-D", ...packages];
    case "yarn":
      return ["yarn", "add", "-D", ...packages];
    case "bun":
      return ["bun", "add", "-d", ...packages];
  }
}

export async function detectPackageManager(cwd: string): Promise<PackageManager> {
  const packageJsonFile = resolve(cwd, "package.json");
  if (await fileExists(packageJsonFile)) {
    const packageJson = JSON.parse(await readFile(packageJsonFile, "utf8")) as {
      readonly packageManager?: string;
    };
    const declared = parsePackageManager(packageJson.packageManager);
    if (declared !== undefined) {
      return declared;
    }
  }

  if (await fileExists(resolve(cwd, "pnpm-lock.yaml"))) {
    return "pnpm";
  }

  if (await fileExists(resolve(cwd, "yarn.lock"))) {
    return "yarn";
  }

  if (
    (await fileExists(resolve(cwd, "bun.lockb"))) ||
    (await fileExists(resolve(cwd, "bun.lock")))
  ) {
    return "bun";
  }

  if (
    (await fileExists(resolve(cwd, "package-lock.json"))) ||
    (await fileExists(resolve(cwd, "npm-shrinkwrap.json")))
  ) {
    return "npm";
  }

  return "npm";
}

function parsePackageManager(value: string | undefined): PackageManager | undefined {
  const name = value?.split("@")[0];

  switch (name) {
    case "pnpm":
    case "npm":
    case "yarn":
    case "bun":
      return name;
    default:
      return undefined;
  }
}

function renderPackageJson(name: string): string {
  return `${JSON.stringify(
    {
      name: toPackageName(name),
      version: "0.0.0",
      private: true,
      type: "module",
    },
    null,
    2,
  )}\n`;
}

function toPackageName(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized.length > 0 ? normalized : "effql-project";
}

async function fileExists(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function runCommand(cwd: string, command: string, args: readonly string[]): Promise<void> {
  await new Promise<void>((resolvePromise, rejectPromise) => {
    const child = spawn(command, [...args], {
      cwd,
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    child.on("error", rejectPromise);
    child.on("exit", (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      rejectPromise(
        new Error(`Command failed with exit code ${code}: ${[command, ...args].join(" ")}`),
      );
    });
  });
}
