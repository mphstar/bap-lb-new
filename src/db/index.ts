import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/bap_db",
});

export const db = drizzle(pool, { schema });
export * from "./schema";

// Ensure newly added tables and columns exist safely
pool.query(`
  ALTER TABLE user_data ADD COLUMN IF NOT EXISTS academic_year text DEFAULT '2025/2026';
  ALTER TABLE user_data ADD COLUMN IF NOT EXISTS academic_semester text DEFAULT 'Genap';
  CREATE TABLE IF NOT EXISTS custom_sidebar_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    title text NOT NULL,
    href text NOT NULL,
    icon text NOT NULL DEFAULT 'Link',
    "order" integer NOT NULL DEFAULT 0,
    is_private boolean NOT NULL DEFAULT false,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
  );
`).catch((err) => {
  console.error("[DB Schema Sync] Failed to ensure schema updates:", err);
});
