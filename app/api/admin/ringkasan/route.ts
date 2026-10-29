import { db, type Peserta } from "@/lib/db";
import { semuaItem } from "@/lib/konten";
import { cekPin, gagal, json } from "@/lib/api";

export async function GET(req: Request) {
  if (!cekPin(req)) return gagal("PIN salah.", 401);
  const items = semuaItem().filter((i) => i.done);
  const [ps, evc, langkah, totEv] = await Promise.all([
    db.all<Peserta>("SELECT * FROM peserta ORDER BY created_at DESC"),
    db.all("SELECT kode, COUNT(*) AS n, MAX(ts) AS last FROM events GROUP BY kode"),
    db.all("SELECT kode, kunci, ts FROM langkah"),
    db.get("SELECT COUNT(*) AS n FROM events"),
  ]);
  const waktu: Record<string, Record<string, number>> = {};
  langkah.forEach((r) => ((waktu[String(r.kode)] ??= {})[String(r.kunci)] = Number(r.ts)));
  const peserta = ps.map((p) => {
    const t = waktu[p.kode] || {};
    const selesai = items.filter((i) => t[i.done!]).length;
    const sekarang = items.find((i) => !t[i.done!]);
    const e = evc.find((x) => x.kode === p.kode);
    return {
      ...p, times: t, progres: selesai, total: items.length,
      posisi: sekarang ? sekarang.nama : "Selesai",
      events: e ? Number(e.n) : 0, terakhir_aktif: e ? Number(e.last) : null,
    };
  });
  return json({
    peserta,
    statistik: {
      total: ps.length,
      laki: ps.filter((p) => p.gender === "Laki-laki").length,
      perempuan: ps.filter((p) => p.gender === "Perempuan").length,
      selesai: peserta.filter((p) => p.progres === p.total).length,
      events: totEv ? Number(totEv.n) : 0,
    },
  });
}
