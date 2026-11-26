import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Pool, type PoolClient } from "pg";
import { PGlite } from "@electric-sql/pglite";
import { SCHEMA_SQL } from "./schema-sql";

export interface QueryResult<T = Record<string, unknown>> {
  rows: T[];
  rowCount: number;
}

export interface DbClient {
  query<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ): Promise<QueryResult<T>>;
  exec(sql: string): Promise<void>;
}

const globalForDb = globalThis as unknown as {
  __ihqaPool?: Pool;
  __ihqaPglite?: PGlite;
  __ihqaInitPromise?: Promise<void>;
};

function getPgPool(): Pool | null {
  const conn = process.env.DATABASE_URL;
  if (!conn) return null;
  if (!globalForDb.__ihqaPool) {
    const isLocal =
      conn.includes("localhost") ||
      conn.includes("127.0.0.1") ||
      conn.includes("sslmode=disable");
    globalForDb.__ihqaPool = new Pool({
      connectionString: conn,
      max: process.env.VERCEL ? 5 : 20,
      idleTimeoutMillis: 30_000,
      ssl: isLocal ? false : { rejectUnauthorized: false },
    });
  }
  return globalForDb.__ihqaPool;
}

function getPglite(): PGlite {
  if (!globalForDb.__ihqaPglite) {
    const isServerless = Boolean(
      process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
    );
    try {
      const baseRoot = isServerless
        ? os.tmpdir()
        : path.join(process.cwd(), "data");
      fs.mkdirSync(baseRoot, { recursive: true });
      const dbDir = path.join(baseRoot, "ihqa-pgdata");
      globalForDb.__ihqaPglite = new PGlite(dbDir);
    } catch {
      // Fallback to in-memory PGlite if filesystem is strictly read-only
      globalForDb.__ihqaPglite = new PGlite();
    }
  }
  return globalForDb.__ihqaPglite;
}

async function rawQuery<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<QueryResult<T>> {
  const pool = getPgPool();
  if (pool) {
    const res = await pool.query(sql, params);
    return {
      rows: res.rows as T[],
      rowCount: res.rowCount ?? res.rows.length,
    };
  }
  const pgLite = getPglite();
  const res = await pgLite.query<T>(sql, params);
  return {
    rows: res.rows,
    rowCount: res.affectedRows ?? res.rows.length,
  };
}

async function rawExec(sql: string): Promise<void> {
  const pool = getPgPool();
  if (pool) {
    await pool.query(sql);
    return;
  }
  const pgLite = getPglite();
  await pgLite.exec(sql);
}

export async function ensureDbReady(): Promise<void> {
  if (!globalForDb.__ihqaInitPromise) {
    globalForDb.__ihqaInitPromise = (async () => {
      await rawExec(SCHEMA_SQL);
      const { seedDatabaseIfEmpty } = await import("./seed");
      await seedDatabaseIfEmpty({
        query: rawQuery,
        exec: rawExec,
      });
    })().catch((err) => {
      globalForDb.__ihqaInitPromise = undefined;
      throw err;
    });
  }
  return globalForDb.__ihqaInitPromise;
}

export async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<QueryResult<T>> {
  await ensureDbReady();
  return rawQuery<T>(sql, params);
}

export async function withTransaction<R>(
  fn: (tx: DbClient) => Promise<R>
): Promise<R> {
  await ensureDbReady();
  const pool = getPgPool();
  if (pool) {
    const client: PoolClient = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await fn({
        async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
          const res = await client.query(sql, params);
          return {
            rows: res.rows as T[],
            rowCount: res.rowCount ?? res.rows.length,
          };
        },
        async exec(sql: string) {
          await client.query(sql);
        },
      });
      await client.query("COMMIT");
      return result;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  const pgLite = getPglite();
  return pgLite.transaction(async (tx) => {
    return fn({
      async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
        const res = await tx.query<T>(sql, params);
        return {
          rows: res.rows,
          rowCount: res.affectedRows ?? res.rows.length,
        };
      },
      async exec(sql: string) {
        await tx.exec(sql);
      },
    });
  });
}

export function getDbMode(): "postgresql-pool" | "pglite-embedded" {
  return process.env.DATABASE_URL ? "postgresql-pool" : "pglite-embedded";
}
