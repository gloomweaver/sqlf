import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { Client } from "pg";
import { expect, test } from "vite-plus/test";
import { writeEffectModule } from "../src/generator.js";
import { analyzeQueries } from "../src/postgres.js";
import { loadQueries } from "../src/query.js";
import type { ResolvedConfig } from "../src/types.js";

const execFileAsync = promisify(execFile);

interface PostgresFixture {
  readonly url: string;
  readonly client: Client;
  readonly cleanup: () => Promise<void>;
}

test("analyzes postgres queries and generates effect/sql output", async () => {
  const fixture = await startPostgresFixture();
  if (fixture === undefined) {
    console.warn(
      "postgres integration test skipped: set EFFQL_TEST_DATABASE_URL or install Docker",
    );
    return;
  }

  const tempDir = await mkdtemp(join(tmpdir(), "effql-integration-"));

  try {
    await fixture.client.query(`
        DROP TABLE IF EXISTS users;
        CREATE TABLE users (
          id uuid PRIMARY KEY,
          email text NOT NULL,
          bio text,
          tags text[] NOT NULL DEFAULT '{}',
          created_at timestamptz NOT NULL
        );
      `);

    const queryFile = join(tempDir, "queries.sql");
    await writeFile(
      queryFile,
      `-- name: CreateUser :one
INSERT INTO users (id, email, bio, tags, created_at)
VALUES (@id::uuid, @email::text, @bio::text, @tags::text[], now())
RETURNING id, email, bio, tags, created_at;

-- name: GetUser :one
SELECT id, email, bio, tags, created_at
FROM users
WHERE id = @id::uuid;

-- name: ListUsers :many
SELECT id, email, bio, tags, created_at
FROM users
ORDER BY created_at DESC;

-- name: UpdateUser :one
UPDATE users
SET email = @email::text,
    bio = @bio::text
WHERE id = @id::uuid
RETURNING id, email, bio, tags, created_at;

-- name: DeleteUser :exec
DELETE FROM users
WHERE id = @id::uuid;
`,
    );

    const config: ResolvedConfig = {
      rootDir: tempDir,
      configFile: join(tempDir, "effql.config.ts"),
      dialect: "postgres",
      db: { url: fixture.url },
      queryPatterns: ["./queries.sql"],
      outDir: join(tempDir, "generated"),
      target: "effect",
      types: {},
    };

    const queries = await loadQueries(config);
    const analyzed = await analyzeQueries(config, queries);
    const result = await writeEffectModule(config, analyzed);

    expect(analyzed).toHaveLength(5);
    expect(analyzed.map((query) => query.name)).toEqual([
      "CreateUser",
      "GetUser",
      "ListUsers",
      "UpdateUser",
      "DeleteUser",
    ]);

    const userFields = [
      {
        name: "id",
        nullable: false,
        pgType: "uuid",
        tsType: "string",
        schema: "Schema.UUID",
      },
      {
        name: "email",
        nullable: false,
        pgType: "text",
        tsType: "string",
        schema: "Schema.String",
      },
      {
        name: "bio",
        nullable: true,
        pgType: "text",
        tsType: "string | null",
        schema: "Schema.NullOr(Schema.String)",
      },
      {
        name: "tags",
        nullable: false,
        pgType: "_text",
        tsType: "ReadonlyArray<string>",
        schema: "Schema.Array(Schema.String)",
      },
      {
        name: "created_at",
        nullable: false,
        pgType: "timestamptz",
        tsType: "Date",
        schema: "Schema.DateFromSelf",
      },
    ];

    expect(analyzed[0]?.fields).toEqual(userFields);
    expect(analyzed[1]?.fields).toEqual(userFields);
    expect(analyzed[2]?.fields).toEqual(userFields);
    expect(analyzed[3]?.fields).toEqual(userFields);
    expect(analyzed[4]?.fields).toEqual([]);
    expect(result.outFile).toBe(join(tempDir, "generated", "index.ts"));

    const output = await readFile(result.outFile, "utf8");
    expect(output).toContain("export const CreateUserParamsSchema = Schema.Struct");
    expect(output).toContain("export const CreateUserResultSchema = Schema.Struct");
    expect(output).toContain("export const createUser = SqlSchema.single");
    expect(output).toContain(
      "sql.unsafe(createUserSql, [request.id, request.email, request.bio, request.tags])",
    );
    expect(output).toContain("export const GetUserParamsSchema = Schema.Struct");
    expect(output).toContain(
      "export type GetUserParams = Schema.Schema.Type<typeof GetUserParamsSchema>;",
    );
    expect(output).toContain(
      "export const GetUserResultSchema = Schema.Struct({\n  id: Schema.UUID,",
    );
    expect(output).toContain("bio: Schema.NullOr(Schema.String)");
    expect(output).toContain("tags: Schema.Array(Schema.String)");
    expect(output).toContain("export const getUser = SqlSchema.single");
    expect(output).toContain("sql.unsafe(getUserSql, [request.id])");
    expect(output).toContain("export const UpdateUserResultSchema = Schema.Struct");
    expect(output).toContain("export const updateUser = SqlSchema.single");
    expect(output).toContain("sql.unsafe(updateUserSql, [request.email, request.bio, request.id])");
    expect(output).toContain("Query: GetUser");
    expect(output).toContain("Query: UpdateUser");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
    await fixture.cleanup();
  }
}, 60_000);

async function startPostgresFixture(): Promise<PostgresFixture | undefined> {
  const envUrl = process.env.EFFQL_TEST_DATABASE_URL;
  if (envUrl !== undefined) {
    const client = new Client({ connectionString: envUrl });
    await client.connect();

    return {
      url: envUrl,
      client,
      cleanup: async () => {
        await client.end();
      },
    };
  }

  if (!(await hasDocker())) {
    return undefined;
  }

  const containerName = `effql-test-${randomUUID()}`;
  await execFileAsync("docker", [
    "run",
    "-d",
    "--rm",
    "--name",
    containerName,
    "-e",
    "POSTGRES_USER=postgres",
    "-e",
    "POSTGRES_PASSWORD=postgres",
    "-e",
    "POSTGRES_DB=postgres",
    "-p",
    "127.0.0.1::5432",
    "postgres:16-alpine",
  ]);

  try {
    const { stdout } = await execFileAsync("docker", ["port", containerName, "5432/tcp"]);
    const address = stdout.trim().split("\n")[0]?.trim();

    if (address === undefined || address.length === 0) {
      throw new Error("Could not determine Docker mapped port for postgres fixture");
    }

    const url = `postgres://postgres:postgres@${address}/postgres`;
    const client = await waitForClient(url, 30_000);

    return {
      url,
      client,
      cleanup: async () => {
        await client.end().catch(() => undefined);
        await execFileAsync("docker", ["rm", "-f", containerName]).catch(() => undefined);
      },
    };
  } catch (error) {
    await execFileAsync("docker", ["rm", "-f", containerName]).catch(() => undefined);
    throw error;
  }
}

async function hasDocker(): Promise<boolean> {
  try {
    await execFileAsync("docker", ["version", "--format", "{{.Server.Version}}"]);
    return true;
  } catch {
    return false;
  }
}

async function waitForClient(url: string, timeoutMs: number): Promise<Client> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const client = new Client({ connectionString: url });

    try {
      await client.connect();
      return client;
    } catch {
      await client.end().catch(() => undefined);
      await sleep(500);
    }
  }

  throw new Error(`Timed out waiting for postgres fixture: ${url}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
