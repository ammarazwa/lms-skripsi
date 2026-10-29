import { db, now, stamp, stateOf } from "@/lib/db";
import { FAKULTAS } from "@/lib/konten";
import { bacaPeserta, gagal, json } from "@/lib/api";

const GENDER = ["Laki-laki", "Perempuan"];

/** Persetujuan (informed consent) + data demografi. Gender = variabel pengelompokan (bukan fitur model). */
export async function POST(req: Request) {
  const r = await bacaPeserta(req); if (r instanceof Response) return r;
  const [b, kode] = r;
  if (b.setuju !== true) return gagal("Persetujuan partisipasi wajib dicentang.");
  if (!GENDER.includes(String(b.gender))) return gagal("Pilih jenis kelamin.");
  const usia = Number(b.usia);
  if (!Number.isInteger(usia) || usia < 15 || usia > 60) return gagal("Usia tidak valid.");
  if (!FAKULTAS.some((x) => x.nama === b.fakultas)) return gagal("Pilih fakultas.");
  if (!String(b.prodi || "").trim()) return gagal("Program studi wajib diisi.");
  if (!["STEM", "non-STEM"].includes(String(b.bidang))) return gagal("Pilih rumpun program studi.");
  await db.run("UPDATE peserta SET gender = ?, bidang = ?, fakultas = ?, usia = ?, prodi = ?, angkatan = ?, frekuensi_lms = ?, perangkat = ?, consent_at = ? WHERE kode = ?",
    String(b.gender), String(b.bidang), String(b.fakultas), usia, String(b.prodi).trim(), String(b.angkatan || ""), String(b.frekuensi_lms || ""), String(b.perangkat || ""), now(), kode);
  await stamp(kode, "consent");
  return json(await stateOf(kode));
}
