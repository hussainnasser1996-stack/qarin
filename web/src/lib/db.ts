import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let _sql: NeonQueryFunction<false, false> | null = null;

/** Lazily created so builds without DATABASE_URL still compile. */
export function sql(strings: TemplateStringsArray, ...values: unknown[]) {
  if (!_sql) {
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    _sql = neon(url);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return _sql(strings, ...values) as Promise<any[]>;
}

/** For dynamic SQL built from trusted fragments + positional params. */
export function query(text: string, params: unknown[] = []) {
  if (!_sql) {
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    _sql = neon(url);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return _sql.query(text, params) as Promise<any[]>;
}

export const hasDb = () => Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL);
