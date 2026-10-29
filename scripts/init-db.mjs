/* Buat tabel di basis data DATABASE_URL dari scripts/schema.sql (idempoten).
 * Pakai: npm run db:init   (membaca .env.local) */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL belum diisi. Isi di .env.local lalu jalankan lagi.");
  process.exit(1);
}
const here = path.dirname(fileURLToPath(import.meta.url));
const skema = fs.readFileSync(path.join(here, "schema.sql"), "utf8");
const sql = postgres(url, { prepare: false, max: 1, ssl: /localhost|127\.0\.0\.1/.test(url) ? false : "require" });
try {
  await sql.unsafe(skema);
  const t = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`;
  console.log("Skema siap. Tabel:", t.map((r) => r.table_name).join(", "));
} finally {
  await sql.end();
}
