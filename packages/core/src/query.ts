import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { glob } from "tinyglobby";
import type { ParsedParameter, ParsedQuery, QueryMode, ResolvedConfig } from "./types.js";

const QUERY_HEADER_RE = /^--\s*name:\s*([A-Za-z][A-Za-z0-9_]*)\s+:(one|maybeOne|many|exec)\s*$/gm;
const PARAM_RE = /@([A-Za-z_][A-Za-z0-9_]*)/g;
const CAST_RE = /@([A-Za-z_][A-Za-z0-9_]*)\s*::\s*([A-Za-z_][A-Za-z0-9_.]*(?:\[\])?)/g;
const CAST_FUNCTION_RE =
  /CAST\(\s*@([A-Za-z_][A-Za-z0-9_]*)\s+AS\s+([A-Za-z_][A-Za-z0-9_.]*(?:\[\])?)\s*\)/gi;

export async function loadQueries(config: ResolvedConfig): Promise<readonly ParsedQuery[]> {
  const files = await glob(config.queryPatterns, {
    cwd: config.rootDir,
    absolute: true,
    onlyFiles: true,
  });
  const sortedFiles = [...files].sort();

  const queries = await Promise.all(
    sortedFiles.map(async (file) => parseSqlFile(file, await readFile(file, "utf8"))),
  );

  return queries.flat();
}

export function parseSqlFile(sourceFile: string, contents: string): readonly ParsedQuery[] {
  const matches = [...contents.matchAll(QUERY_HEADER_RE)];

  return matches.map((match, index) => {
    const nextMatch = matches[index + 1];
    const sqlStart = (match.index ?? 0) + match[0].length;
    const sql = stripSql(contents.slice(sqlStart, nextMatch?.index));

    if (sql.length === 0) {
      throw new Error(`Query ${match[1]} in ${basename(sourceFile)} does not contain SQL`);
    }

    const params = parseParameters(sql, match[1], sourceFile);

    return {
      name: match[1],
      mode: match[2] as QueryMode,
      sourceFile,
      sql,
      normalizedSql: normalizeParameters(sql, params),
      params,
    } satisfies ParsedQuery;
  });
}

function stripSql(value: string | undefined): string {
  return (value ?? "").trim().replace(/;+\s*$/, "");
}

function parseParameters(
  sql: string,
  queryName: string,
  sourceFile: string,
): readonly ParsedParameter[] {
  const paramNames = new Map<string, number>();

  for (const match of sql.matchAll(PARAM_RE)) {
    const name = match[1];
    if (!paramNames.has(name)) {
      paramNames.set(name, paramNames.size + 1);
    }
  }

  const inferredTypes = new Map<string, string>();

  for (const match of sql.matchAll(CAST_RE)) {
    setParamType(inferredTypes, match[1], match[2], queryName, sourceFile);
  }
  for (const match of sql.matchAll(CAST_FUNCTION_RE)) {
    setParamType(inferredTypes, match[1], match[2], queryName, sourceFile);
  }

  return [...paramNames.entries()].map(([name, index]) => {
    const pgType = inferredTypes.get(name);

    if (pgType === undefined) {
      throw new Error(
        `Parameter @${name} in ${queryName} (${basename(
          sourceFile,
        )}) must use an explicit cast like @${name}::uuid for MVP analysis`,
      );
    }

    return {
      name,
      index,
      pgType,
    } satisfies ParsedParameter;
  });
}

function setParamType(
  inferredTypes: Map<string, string>,
  name: string,
  pgType: string,
  queryName: string,
  sourceFile: string,
): void {
  const existing = inferredTypes.get(name);

  if (existing !== undefined && existing !== pgType) {
    throw new Error(
      `Parameter @${name} in ${queryName} (${basename(
        sourceFile,
      )}) has conflicting casts: ${existing} and ${pgType}`,
    );
  }

  inferredTypes.set(name, pgType);
}

function normalizeParameters(sql: string, params: readonly ParsedParameter[]): string {
  const indexes = new Map(params.map((param) => [param.name, param.index]));

  return sql.replace(PARAM_RE, (_, name: string) => `$${indexes.get(name)}`);
}
