import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var _bapPgPool: Pool | undefined;
}

const pool =
  globalThis._bapPgPool ??
  new Pool({
    connectionString:
      process.env.DATABASE_URL || "postgresql://postgres:@localhost:5432/bap_lb",
  });

if (process.env.NODE_ENV !== "production") {
  globalThis._bapPgPool = pool;
}

export const db = drizzle(pool, { schema });
export * from "./schema";
