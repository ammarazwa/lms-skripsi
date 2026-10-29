import { CONFIG } from "@/lib/config";
import { kata } from "@/lib/konten";
import { db, langkahMap, now, stamp, stateOf, transaksi } from "@/lib/db";
import { bacaPeserta, gagal, json, normKode } from "@/lib/api";

/* Forum diskusi tipe tanya-jawab (Q and A forum Moodle): setiap peserta mengirim SATU balasan,
 * dan balasan peserta lain baru terlihat setelah ia mengirim. Peserta hanya melihat kelompok kodenya
 * sendiri (P = peserta utama, T = uji, PL = pilot) supaya data uji tidak tampil saat pengambilan data. */
function kelompok(kode: string) {
  return kode.startsWith("PL") ? "PL" : kode.slice(0, 1);
}

async function isiForum(kode: string) {
  const milik = (await db.get("SELECT kode, isi, jumlah_kata, ts FROM forum_post WHERE kode = ?", kode)) || null;
  const g = kelompok(kode);
  const semua = await db.all("SELECT kode, isi, ts FROM forum_post WHERE kode != ? ORDER BY ts", kode);
  const sekelompok = semua.filter((r) => kelompok(String(r.kode)) === g);
  return { milik, lain: milik ? sekelompok : [], jumlah_lain: sekelompok.length };
}

export async function GET(req: Request) {
  const kode = normKode(new URL(req.url).searchParams.get("kode"));
  if (!CONFIG.KODE_POLA.test(kode)) return gagal("Kode peserta tidak valid.");
  return json(await isiForum(kode));
}

export async function POST(req: Request) {
  const r = await bacaPeserta(req); if (r instanceof Response) return r;
  const [b, kode] = r;
  const t = await langkahMap(kode);
  const need = CONFIG.TLX_BOBOT ? "bobot" : "tlx3";
  if (!t[need]) return gagal("Forum terbuka setelah NASA-TLX selesai.");
  if (t.forum) return gagal("Kamu sudah mengirim balasan. Forum ini hanya menerima satu balasan per peserta.");
  const isi = String(b.isi || "").trim();
  if (kata(isi) < 3) return gagal("Tulis balasanmu terlebih dahulu (minimal satu kalimat).");
  if (isi.length > 5000) return gagal("Balasan terlalu panjang.");
  const ts = now();
  await transaksi(async (d) => {
    await d.run("INSERT INTO forum_post (kode, isi, jumlah_kata, mulai, ts) VALUES (?, ?, ?, ?, ?)", kode, isi, kata(isi), t.forum_start ?? null, ts);
    await d.run("DELETE FROM draf WHERE kode = ? AND blok = 200", kode);
    await stamp(kode, "forum_end", ts, d);
    await stamp(kode, "forum", ts, d);
  });
  return json({ ...(await stateOf(kode)), forum: await isiForum(kode) });
}
