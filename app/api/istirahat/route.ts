import { CONFIG } from "@/lib/config";
import { db, now, stamp, stateOf } from "@/lib/db";
import { bacaPeserta, gagal, json } from "@/lib/api";

/** Istirahat setelah NASA-TLX Blok 1 dan Blok 2. aksi: "mulai" | "selesai". */
export async function POST(req: Request) {
  const r = await bacaPeserta(req); if (r instanceof Response) return r;
  const [b, kode] = r;
  const ke = Number(b.ke);
  if (![1, 2].includes(ke)) return gagal("Istirahat tidak valid.");
  const t = now();
  if (b.aksi === "mulai") {
    await db.run("INSERT INTO istirahat (kode, ke, mulai) VALUES (?, ?, ?) ON CONFLICT (kode, ke) DO NOTHING", kode, ke, t);
    await stamp(kode, "rehat" + ke + "_start", t);
  } else if (b.aksi === "selesai") {
    const row = await db.get("SELECT mulai, selesai FROM istirahat WHERE kode = ? AND ke = ?", kode, ke);
    if (!row) return gagal("Istirahat belum dimulai.");
    if (!row.selesai) {
      const mulai = Number(row.mulai);
      const alasan = String(b.alasan || "selesai");
      const lewati = alasan === "lewati_demo" && CONFIG.DEMO;
      if (!lewati && t - mulai < CONFIG.ISTIRAHAT_DETIK * 1000 - 3000) return gagal("Waktu istirahat belum habis.");
      await db.run("UPDATE istirahat SET selesai = ?, durasi_ms = ?, alasan = ? WHERE kode = ? AND ke = ?", t, t - mulai, alasan, kode, ke);
      await stamp(kode, "rehat" + ke + "_end", t);
      await stamp(kode, "rehat" + ke, t);
    }
  } else return gagal("Aksi tidak dikenal.");
  return json(await stateOf(kode));
}
