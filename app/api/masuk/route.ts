import { CONFIG } from "@/lib/config";
import { db, now, stateOf } from "@/lib/db";
import { gagal, json, normKode } from "@/lib/api";

/** Masuk dengan kode peserta. Kode baru otomatis terdaftar. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const kode = normKode(body.kode);
  if (!CONFIG.KODE_POLA.test(kode)) return gagal("Kode peserta tidak dikenali. Gunakan kode dari fasilitator (contoh: P01).");
  await db.run("INSERT INTO peserta (kode, created_at, pc) VALUES (?, ?, ?) ON CONFLICT (kode) DO NOTHING", kode, now(), String(body.pc || "") || null);
  return json(await stateOf(kode));
}
