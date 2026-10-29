import { db, getPeserta, langkahMap, transaksi } from "@/lib/db";
import { fiturPeserta, kepatuhanIstirahat } from "@/lib/fitur";
import { cekPin, gagal, json, normKode } from "@/lib/api";

type Ctx = { params: Promise<{ kode: string }> };

export async function GET(req: Request, { params }: Ctx) {
  if (!cekPin(req)) return gagal("PIN salah.", 401);
  const kode = normKode((await params).kode);
  const p = await getPeserta(kode);
  if (!p) return gagal("Peserta tidak ditemukan.", 404);
  const q = (sql: string) => db.all(sql, kode);
  const [times, jawaban, hasil, tlx, bobot, istirahat, forum, fitur, jenis_event, event_terakhir] = await Promise.all([
    langkahMap(kode),
    q("SELECT * FROM jawaban WHERE kode = ? ORDER BY blok, soal_id"),
    q("SELECT * FROM hasil_blok WHERE kode = ? ORDER BY blok"),
    q("SELECT * FROM tlx WHERE kode = ? ORDER BY blok"),
    db.get("SELECT * FROM tlx_bobot WHERE kode = ?", kode),
    kepatuhanIstirahat(kode),
    db.get("SELECT * FROM forum_post WHERE kode = ?", kode),
    fiturPeserta(p),
    q("SELECT tipe, COUNT(*) AS n FROM events WHERE kode = ? GROUP BY tipe ORDER BY n DESC"),
    q("SELECT ts, page, blok, tipe, data FROM events WHERE kode = ? ORDER BY ts DESC, id DESC LIMIT 60"),
  ]);
  return json({ peserta: p, times, jawaban, hasil, tlx, bobot: bobot || null, istirahat, forum: forum || null, fitur, jenis_event, event_terakhir });
}

/** Hapus seluruh data satu peserta (mis. sesi uji coba). */
export async function DELETE(req: Request, { params }: Ctx) {
  if (!cekPin(req)) return gagal("PIN salah.", 401);
  const kode = normKode((await params).kode);
  await transaksi(async (d) => {
    for (const t of ["events", "langkah", "draf", "jawaban", "hasil_blok", "tlx", "tlx_bobot", "istirahat", "forum_post", "peserta"]) {
      await d.run(`DELETE FROM ${t} WHERE kode = ?`, kode);
    }
  });
  return json({ ok: true });
}
