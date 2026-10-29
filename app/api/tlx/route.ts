import { SKALA_ID } from "@/lib/konten";
import { now, stamp, stateOf, transaksi } from "@/lib/db";
import { bacaPeserta, gagal, json } from "@/lib/api";

/** Rating NASA-TLX (6 dimensi, 0–100 kelipatan 5). Raw TLX = rata-rata enam dimensi. */
export async function POST(req: Request) {
  const r = await bacaPeserta(req); if (r instanceof Response) return r;
  const [b, kode] = r;
  const blok = Number(b.blok);
  if (![0, 1, 2, 3].includes(blok)) return gagal("Blok tidak valid.");
  const n = (b.nilai || {}) as Record<string, unknown>;
  const v = SKALA_ID.map((id) => Number(n[id]));
  if (SKALA_ID.some((id) => n[id] === undefined || n[id] === null) || v.some((x) => !Number.isFinite(x) || x < 0 || x > 100 || x % 5 !== 0)) return gagal("Semua skala wajib diisi (0–100).");
  const raw = Math.round((100 * v.reduce((a, c) => a + c, 0)) / 6) / 100;
  await transaksi(async (d) => {
    await d.run(`INSERT INTO tlx (kode, blok, "MD", "PD", "TD", "OP", "EF", "FR", raw, ts) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (kode, blok) DO UPDATE SET "MD" = excluded."MD", "PD" = excluded."PD", "TD" = excluded."TD", "OP" = excluded."OP",
      "EF" = excluded."EF", "FR" = excluded."FR", raw = excluded.raw, ts = excluded.ts`, kode, blok, ...v, raw, now());
    await d.run("DELETE FROM draf WHERE kode = ? AND blok = ?", kode, 100 + blok);
    await stamp(kode, "tlx" + blok + "_end", now(), d);
    await stamp(kode, "tlx" + blok, now(), d);
  });
  return json(await stateOf(kode));
}
