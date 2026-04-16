import { Client } from "pg";
import type {
  AnalyzedField,
  AnalyzedParameter,
  AnalyzedQuery,
  ParsedQuery,
  ResolvedConfig,
  TypeOverride,
} from "./types.js";

interface PgTypeRow {
  readonly oid: number;
  readonly name: string;
  readonly kind: string;
  readonly category: string;
  readonly elementOid: number;
}

interface PgEnumRow {
  readonly oid: number;
  readonly label: string;
}

interface PgAttributeRow {
  readonly tableId: number;
  readonly columnId: number;
  readonly notNull: boolean;
}

interface PgTypeInfo {
  readonly oid: number;
  readonly name: string;
  readonly kind: string;
  readonly category: string;
  readonly elementOid: number;
  readonly enumValues: readonly string[];
}

export async function analyzeQueries(
  config: ResolvedConfig,
  queries: readonly ParsedQuery[],
): Promise<readonly AnalyzedQuery[]> {
  const client = new Client({
    connectionString: config.db.url,
  });

  await client.connect();

  try {
    const analyzed: AnalyzedQuery[] = [];

    for (const query of queries) {
      analyzed.push(await analyzeQuery(client, config, query));
    }

    return analyzed;
  } finally {
    await client.end();
  }
}

async function analyzeQuery(
  client: Client,
  config: ResolvedConfig,
  query: ParsedQuery,
): Promise<AnalyzedQuery> {
  const params = query.params.map((param) => ({
    ...param,
    ...resolvePgTypeByName(param.pgType, config.types),
  })) satisfies readonly AnalyzedParameter[];

  if (query.mode === "exec") {
    return {
      ...query,
      params,
      fields: [],
    };
  }

  const analysisSql = buildAnalysisSql(query);
  const result = await client.query(analysisSql);

  const oids = unique(result.fields.map((field) => field.dataTypeID));
  const typeMap = await loadTypeInfo(client, oids);
  const nullability = await loadNullability(client, result.fields);

  const fields = result.fields.map((field) => {
    const type = typeMap.get(field.dataTypeID);

    if (type === undefined) {
      throw new Error(
        `Could not resolve PostgreSQL type OID ${field.dataTypeID} for ${query.name}.${field.name}`,
      );
    }

    const mapped = mapType(type, typeMap, config.types);

    return {
      name: field.name,
      nullable: inferNullable(field.tableID, field.columnID, nullability),
      pgType: type.name,
      tsType: inferNullable(field.tableID, field.columnID, nullability)
        ? `${mapped.tsType} | null`
        : mapped.tsType,
      schema: inferNullable(field.tableID, field.columnID, nullability)
        ? `Schema.NullOr(${mapped.schema})`
        : mapped.schema,
    } satisfies AnalyzedField;
  });

  return {
    ...query,
    params,
    fields,
  };
}

function buildAnalysisSql(query: ParsedQuery): string {
  const substituted = query.normalizedSql.replace(/\$(\d+)\b/g, (_, rawIndex) => {
    const param = query.params[Number(rawIndex) - 1];

    if (param === undefined) {
      throw new Error(`Missing parameter for placeholder $${rawIndex} in ${query.name}`);
    }

    return `NULL::${param.pgType}`;
  });

  return `SELECT * FROM (${substituted}) AS __sqlf_analysis LIMIT 0`;
}

async function loadTypeInfo(
  client: Client,
  oids: readonly number[],
): Promise<Map<number, PgTypeInfo>> {
  if (oids.length === 0) {
    return new Map();
  }

  const oidList = oids.join(", ");
  const typeRows = await client.query<PgTypeRow>(`
    SELECT
      oid::int AS oid,
      typname AS name,
      typtype AS kind,
      typcategory AS category,
      typelem::int AS "elementOid"
    FROM pg_type
    WHERE oid IN (${oidList})
  `);

  const enumOids = typeRows.rows.filter((row) => row.kind === "e").map((row) => row.oid);

  const enumMap = new Map<number, string[]>();

  if (enumOids.length > 0) {
    const enumRows = await client.query<PgEnumRow>(`
      SELECT
        enumtypid::int AS oid,
        enumlabel AS label
      FROM pg_enum
      WHERE enumtypid IN (${enumOids.join(", ")})
      ORDER BY enumtypid, enumsortorder
    `);

    for (const row of enumRows.rows) {
      const labels = enumMap.get(row.oid) ?? [];
      labels.push(row.label);
      enumMap.set(row.oid, labels);
    }
  }

  return new Map(
    typeRows.rows.map((row) => [
      row.oid,
      {
        ...row,
        enumValues: enumMap.get(row.oid) ?? [],
      } satisfies PgTypeInfo,
    ]),
  );
}

async function loadNullability(
  client: Client,
  fields: readonly { tableID: number; columnID: number }[],
): Promise<Map<string, boolean>> {
  const pairs = uniqueBy(
    fields.filter((field) => field.tableID > 0 && field.columnID > 0),
    (field) => `${field.tableID}:${field.columnID}`,
  );

  if (pairs.length === 0) {
    return new Map();
  }

  const tupleList = pairs.map((pair) => `(${pair.tableID}, ${pair.columnID})`).join(", ");

  const rows = await client.query<PgAttributeRow>(`
    SELECT
      attrelid::int AS "tableId",
      attnum::int AS "columnId",
      attnotnull AS "notNull"
    FROM pg_attribute
    WHERE (attrelid, attnum) IN (${tupleList})
  `);

  return new Map(rows.rows.map((row) => [`${row.tableId}:${row.columnId}`, !row.notNull]));
}

function inferNullable(
  tableID: number,
  columnID: number,
  nullability: ReadonlyMap<string, boolean>,
): boolean {
  if (tableID === 0 || columnID === 0) {
    return true;
  }

  return nullability.get(`${tableID}:${columnID}`) ?? true;
}

function mapType(
  type: PgTypeInfo,
  typeMap: ReadonlyMap<number, PgTypeInfo>,
  overrides: Readonly<Record<string, TypeOverride>>,
): TypeOverride {
  const override = overrides[type.name.toLowerCase()];
  if (override !== undefined) {
    return override;
  }

  if (type.category === "A" && type.elementOid > 0) {
    const elementType = typeMap.get(type.elementOid);

    if (elementType === undefined) {
      return {
        tsType: "ReadonlyArray<unknown>",
        schema: "Schema.Array(Schema.Unknown)",
      };
    }

    const mapped = mapType(elementType, typeMap, overrides);

    return {
      tsType: `ReadonlyArray<${mapped.tsType}>`,
      schema: `Schema.Array(${mapped.schema})`,
    };
  }

  if (type.kind === "e" && type.enumValues.length > 0) {
    const values = type.enumValues.map((value) => JSON.stringify(value)).join(", ");

    return {
      tsType: type.enumValues.map((value) => JSON.stringify(value)).join(" | "),
      schema: `Schema.Literal(${values})`,
    };
  }

  return resolvePgTypeByName(type.name, overrides);
}

function resolvePgTypeByName(
  pgType: string,
  overrides: Readonly<Record<string, TypeOverride>>,
): TypeOverride {
  const override = overrides[pgType.toLowerCase()];
  if (override !== undefined) {
    return override;
  }

  switch (pgType.toLowerCase()) {
    case "uuid":
      return { tsType: "string", schema: "Schema.UUID" };
    case "text":
    case "varchar":
    case "bpchar":
    case "char":
    case "name":
    case "citext":
    case "date":
    case "time":
    case "timetz":
      return { tsType: "string", schema: "Schema.String" };
    case "bool":
      return { tsType: "boolean", schema: "Schema.Boolean" };
    case "int2":
    case "int4":
    case "float4":
    case "float8":
      return { tsType: "number", schema: "Schema.Number" };
    case "int8":
      return { tsType: "bigint", schema: "Schema.BigIntFromSelf" };
    case "numeric":
      return { tsType: "string", schema: "Schema.String" };
    case "timestamp":
    case "timestamptz":
      return { tsType: "Date", schema: "Schema.DateFromSelf" };
    case "json":
    case "jsonb":
      return { tsType: "unknown", schema: "Schema.Unknown" };
    default:
      return { tsType: "unknown", schema: "Schema.Unknown" };
  }
}

function unique(values: readonly number[]): number[] {
  return [...new Set(values)];
}

function uniqueBy<T>(values: readonly T[], getKey: (value: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const value of values) {
    const key = getKey(value);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(value);
  }

  return result;
}
