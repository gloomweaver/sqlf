export type Awaitable<T> = T | Promise<T>;

export type QueryMode = "one" | "maybeOne" | "many" | "exec";

export interface TypeOverride {
  readonly tsType: string;
  readonly schema: string;
}

export interface UserConfig {
  readonly dialect: "postgres";
  readonly db: {
    readonly url: string;
  };
  readonly queries: readonly string[];
  readonly outDir: string;
  readonly target?: "effect";
  readonly types?: Readonly<Record<string, TypeOverride>>;
}

export interface ConfigEnv {
  readonly command: "generate";
  readonly mode: string;
}

export type UserConfigExport = UserConfig | ((env: ConfigEnv) => Awaitable<UserConfig>);

export interface ResolvedConfig {
  readonly rootDir: string;
  readonly configFile: string;
  readonly dialect: "postgres";
  readonly db: {
    readonly url: string;
  };
  readonly queryPatterns: readonly string[];
  readonly outDir: string;
  readonly target: "effect";
  readonly types: Readonly<Record<string, TypeOverride>>;
}

export interface ParsedParameter {
  readonly name: string;
  readonly index: number;
  readonly pgType: string;
}

export interface ParsedQuery {
  readonly name: string;
  readonly mode: QueryMode;
  readonly sourceFile: string;
  readonly sql: string;
  readonly normalizedSql: string;
  readonly params: readonly ParsedParameter[];
}

export interface AnalyzedField {
  readonly name: string;
  readonly nullable: boolean;
  readonly pgType: string;
  readonly tsType: string;
  readonly schema: string;
}

export interface AnalyzedParameter extends ParsedParameter {
  readonly tsType: string;
  readonly schema: string;
}

export interface AnalyzedQuery {
  readonly name: string;
  readonly mode: QueryMode;
  readonly sourceFile: string;
  readonly sql: string;
  readonly normalizedSql: string;
  readonly params: readonly AnalyzedParameter[];
  readonly fields: readonly AnalyzedField[];
}

export interface GenerateResult {
  readonly configFile: string;
  readonly outFile: string;
  readonly queryCount: number;
}
