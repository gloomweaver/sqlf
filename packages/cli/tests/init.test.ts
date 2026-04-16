import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test } from "vite-plus/test";
import {
  buildInstallCommand,
  detectPackageManager,
  initProject,
  renderInitConfig,
  renderQueriesFile,
} from "../src/init.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

test("renderInitConfig uses core defineConfig", () => {
  expect(renderInitConfig()).toContain('import { defineConfig } from "@effql/core";');
  expect(renderInitConfig()).toContain('queries: ["./sql/**/*.sql"]');
});

test("renderQueriesFile creates starter query", () => {
  expect(renderQueriesFile()).toContain("-- name: Healthcheck :one");
  expect(renderQueriesFile()).toContain("SELECT now() AS current_time;");
});

test("detectPackageManager prefers packageManager field", async () => {
  const cwd = await createTempDir();
  await writeFile(
    join(cwd, "package.json"),
    JSON.stringify({ packageManager: "pnpm@10.33.0" }),
    "utf8",
  );

  await expect(detectPackageManager(cwd)).resolves.toBe("pnpm");
});

test("buildInstallCommand uses dev dependency flags", () => {
  expect(buildInstallCommand("pnpm", ["@effql/cli", "@effql/core"])).toEqual([
    "pnpm",
    "add",
    "-D",
    "@effql/cli",
    "@effql/core",
  ]);
  expect(buildInstallCommand("npm", ["@effql/cli", "@effql/core"])).toEqual([
    "npm",
    "install",
    "-D",
    "@effql/cli",
    "@effql/core",
  ]);
});

test("initProject writes config, queries file, and package.json when missing", async () => {
  const cwd = await createTempDir();

  const result = await initProject({ cwd, skipInstall: true });
  const config = await readFile(join(cwd, "effql.config.ts"), "utf8");
  const queries = await readFile(join(cwd, "sql", "queries.sql"), "utf8");
  const packageJson = JSON.parse(await readFile(join(cwd, "package.json"), "utf8")) as {
    readonly private: boolean;
    readonly type: string;
  };

  expect(result.packageJsonCreated).toBe(true);
  expect(result.queriesFileCreated).toBe(true);
  expect(result.packageManager).toBe("npm");
  expect(config).toContain('import { defineConfig } from "@effql/core";');
  expect(queries).toContain("-- name: Healthcheck :one");
  expect(packageJson.private).toBe(true);
  expect(packageJson.type).toBe("module");
});

test("initProject keeps existing queries file", async () => {
  const cwd = await createTempDir();
  await mkdir(join(cwd, "sql"), { recursive: true });
  await writeFile(join(cwd, "sql", "queries.sql"), "-- custom\nSELECT 1;\n", "utf8");

  const result = await initProject({ cwd, skipInstall: true });
  const queries = await readFile(join(cwd, "sql", "queries.sql"), "utf8");

  expect(result.queriesFileCreated).toBe(false);
  expect(queries).toBe("-- custom\nSELECT 1;\n");
});

async function createTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "effql-cli-"));
  tempDirs.push(dir);
  return dir;
}
