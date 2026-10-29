import { BLOK, kata } from "@/lib/konten";
import { langkahMap, now, stamp, stateOf, transaksi } from "@/lib/db";
import { bacaPeserta, gagal, json } from "@/lib/api";

/** Kirim jawaban satu blok. Skor dihitung di server dari kunci jawaban. */
export async function POST(req: Request) {
  const r = await bacaPeserta(req); if (r instanceof Response) return r;
  const [b, kode] = r;
  const blok = Number(b.blok);
  const data = BLOK[blok];
  if (!data) return gagal("Blok tidak valid.");
  const t = await langkahMap(kode);
  if (t["b" + blok]) return json(await stateOf(kode)); // sudah terkirim — idempoten
  const jawab = (b.jawaban || {}) as Record<string, unknown>;
  const alasan = String(b.alasan || "kirim");
  let skor = 0, maks = 0;
  const baris: unknown[][] = [];
  for (const q of data.soal) {
    const v = jawab[q.id];
    let ok: number | null = null;
    if (q.tipe === "pg") { maks += 1; ok = v === q.kunci ? 1 : 0; skor += ok; }
    else if (q.tipe === "urut" || q.tipe === "jodoh") {
      maks += 1;
      const kunci = q.kunci as number[];
      const arr = Array.isArray(v) ? v : [];
      const benar = kunci.filter((kk, i) => arr[i] === kk).length;
      ok = Math.round((100 * benar) / kunci.length) / 100; skor += ok;
    }
    baris.push([kode, blok, q.id, q.level, q.tipe, JSON.stringify(v ?? null), ok, q.tipe === "esai" ? kata(String(v || "")) : null]);
  }
  await transaksi(async (d) => {
    for (const x of baris) {
      await d.run(`INSERT INTO jawaban (kode, blok, soal_id, level, tipe, nilai, benar, jumlah_kata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (kode, blok, soal_id) DO UPDATE SET level = excluded.level, tipe = excluded.tipe, nilai = excluded.nilai,
        benar = excluded.benar, jumlah_kata = excluded.jumlah_kata`, ...x);
    }
    await d.run(`INSERT INTO hasil_blok (kode, blok, skor, maks, alasan, ts) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT (kode, blok) DO UPDATE SET skor = excluded.skor, maks = excluded.maks, alasan = excluded.alasan, ts = excluded.ts`,
      kode, blok, skor, maks, alasan, now());
    await d.run("DELETE FROM draf WHERE kode = ? AND blok = ?", kode, blok);
    await stamp(kode, "b" + blok + "_end", now(), d);
    await stamp(kode, "b" + blok, now(), d);
  });
  return json(await stateOf(kode));
}
