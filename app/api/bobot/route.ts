import { SKALA_ID } from "@/lib/konten";
import { now, stamp, stateOf, transaksi } from "@/lib/db";
import { bacaPeserta, gagal, json } from "@/lib/api";

/** Perbandingan berpasangan NASA-TLX: 15 pilihan → bobot tiap dimensi (jumlah = 15). */
export async function POST(req: Request) {
  const r = await bacaPeserta(req); if (r instanceof Response) return r;
  const [b, kode] = r;
  const urutan = b.urutan as string[][];
  const pilihan = b.pilihan as string[];
  if (!Array.isArray(urutan) || !Array.isArray(pilihan) || urutan.length !== 15 || pilihan.length !== 15) return gagal("Perbandingan belum lengkap.");
  const w: Record<string, number> = {};
  SKALA_ID.forEach((id) => (w[id] = 0));
  for (let i = 0; i < 15; i++) {
    if (!Array.isArray(urutan[i]) || !urutan[i].includes(pilihan[i])) return gagal("Pilihan tidak cocok dengan pasangan.");
    w[pilihan[i]] += 1;
  }
  await transaksi(async (d) => {
    await d.run(`INSERT INTO tlx_bobot (kode, "MD", "PD", "TD", "OP", "EF", "FR", urutan, pilihan, ts) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (kode) DO UPDATE SET "MD" = excluded."MD", "PD" = excluded."PD", "TD" = excluded."TD", "OP" = excluded."OP",
      "EF" = excluded."EF", "FR" = excluded."FR", urutan = excluded.urutan, pilihan = excluded.pilihan, ts = excluded.ts`,
      kode, ...SKALA_ID.map((id) => w[id]), JSON.stringify(urutan), JSON.stringify(pilihan), now());
    await d.run("DELETE FROM draf WHERE kode = ? AND blok = -1", kode);
    await stamp(kode, "bobot_end", now(), d);
    await stamp(kode, "bobot", now(), d);
  });
  return json(await stateOf(kode));
}
