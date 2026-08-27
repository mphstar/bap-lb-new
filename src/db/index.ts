import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/bap_db",
});

export const db = drizzle(pool, { schema });
export * from "./schema";

// Ensure newly added columns exist in user_data table safely
pool.query(`
  ALTER TABLE user_data ADD COLUMN IF NOT EXISTS academic_year text DEFAULT '2025/2026';
  ALTER TABLE user_data ADD COLUMN IF NOT EXISTS academic_semester text DEFAULT 'Genap';
`).catch((err) => {
  console.error("[DB Schema Sync] Failed to ensure user_data columns:", err);
});
