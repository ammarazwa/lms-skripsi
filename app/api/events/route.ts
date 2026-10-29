import { sql } from "@/lib/db";
import { CONFIG } from "@/lib/config";
import { json, normKode } from "@/lib/api";

type Ev = { t: number; pl: string; k: number; pg: string; b: number | null; e: string; d?: unknown };

/** Terima batch log interaksi (klik, ketikan, scroll, navigasi, dll). Diterima juga lewat sendBeacon (text/plain).
 * Satu INSERT banyak baris; event yang sudah tersimpan (kode, pl, k sama, mis. kiriman ulang) dilewati. */
export async function POST(req: Request) {
  let body: { kode?: string; events?: Ev[] };
  try { body = JSON.parse(await req.text()); } catch { return json({ error: "Body bukan JSON." }, 400); }
  const kode = normKode(body.kode);
  if (!CONFIG.KODE_POLA.test(kode) || !Array.isArray(body.events)) return json({ error: "Data tidak valid." }, 400);
  const rows = body.events.slice(0, 2000)
    .filter((e) => e && typeof e.e === "string" && Number.isFinite(e.t))
    .map((e) => ({
      kode, ts: Math.round(e.t), pl: String(e.pl || ""), k: Number(e.k) || 0, page: String(e.pg || ""),
      blok: Number.isInteger(e.b) ? e.b : null, tipe: e.e.slice(0, 40), data: e.d === undefined ? null : JSON.stringify(e.d),
    }));
  if (!rows.length) return json({ ok: true, diterima: 0 });
  const s = sql();
  const res = await s`INSERT INTO events ${s(rows, "kode", "ts", "pl", "k", "page", "blok", "tipe", "data")} ON CONFLICT (kode, pl, k) DO NOTHING`;
  return json({ ok: true, diterima: res.count });
}
