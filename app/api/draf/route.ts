import { db, now } from "@/lib/db";
import { bacaPeserta, gagal, json } from "@/lib/api";

/** Simpan otomatis isian sementara: blok 0–3 = jawaban, 100–103 = rating TLX, -1 = perbandingan berpasangan, 200 = balasan forum. */
export async function POST(req: Request) {
  const r = await bacaPeserta(req); if (r instanceof Response) return r;
  const [b, kode] = r;
  const blok = Number(b.blok);
  if (![-1, 0, 1, 2, 3, 100, 101, 102, 103, 200].includes(blok)) return gagal("Blok tidak valid.");
  await db.run("INSERT INTO draf (kode, blok, data, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT (kode, blok) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at",
    kode, blok, JSON.stringify(b.data ?? {}), now());
  return json({ ok: true });
}
