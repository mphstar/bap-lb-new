import pg from "pg";
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/bap_lb",
});

async function main() {
  const client = await pool.connect();
  try {
    console.log("=== Starting Dosen List Deduplication ===");
    
    // Fetch all dosen rows
    const res = await client.query(`
      SELECT id, user_id, name, signature
      FROM dosen_list
      ORDER BY user_id, lower(trim(name))
    `);

    console.log(`Total dosen rows found: ${res.rows.length}`);

    // Group by (user_id, normalized_name)
    const groups = new Map();
    for (const row of res.rows) {
      const key = `${row.user_id}:::${row.name.trim().toLowerCase()}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(row);
    }

    const idsToDelete = [];
    let keptCount = 0;
    let duplicateGroupCount = 0;

    for (const [key, rows] of groups.entries()) {
      if (rows.length === 1) {
        keptCount++;
        continue;
      }

      duplicateGroupCount++;
      // Multiple rows: prioritize row with non-empty signature
      const rowsWithSig = rows.filter(r => r.signature && r.signature.trim().length > 0);
      
      let keepRow;
      if (rowsWithSig.length > 0) {
        keepRow = rowsWithSig[0]; // Take first with signature
        if (rowsWithSig.length > 1) {
          console.warn(`[Warning] Multiple rows with signature found for group ${key}:`, rowsWithSig.map(r => r.id));
        }
      } else {
        keepRow = rows[0];
      }

      for (const r of rows) {
        if (r.id !== keepRow.id) {
          idsToDelete.push(r.id);
        }
      }
      keptCount++;
    }

    console.log(`Duplicate groups found: ${duplicateGroupCount}`);
    console.log(`Rows to delete: ${idsToDelete.length}`);
    console.log(`Unique rows kept: ${keptCount}`);

    if (idsToDelete.length > 0) {
      await client.query("BEGIN");
      await client.query(
        `DELETE FROM dosen_list WHERE id = ANY($1::uuid[])`,
        [idsToDelete]
      );
      await client.query("COMMIT");
      console.log("Successfully deleted duplicate dosen_list rows.");
    } else {
      console.log("No duplicates to clean up.");
    }

    // Verify signatures
    const sigCheck = await client.query(`
      SELECT count(*) as count FROM dosen_list WHERE signature IS NOT NULL AND signature != ''
    `);
    console.log(`Total dosen with signatures remaining in DB: ${sigCheck.rows[0].count}`);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Deduplication error:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
