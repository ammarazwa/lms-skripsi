/* Materi, soal, dan teks NASA-TLX. Soal bergaya Tes Potensi Skolastik (TPS) UTBK-SNBT, ditulis orisinal untuk penelitian
 * ini berdasarkan subtes TPS (PU, PPU, PBM, PK) — baseline prior knowledge yang disarankan narasumber (wawancara 22-10-2026).
 * Blok 1–3 sama strukturnya (8 soal: 6 PG + 2 isian, 4 verbal + 4 kuantitatif, 6 berbasis bahan + 2 mandiri);
 * yang naik hanya level Bloom: LOTS C1–C2, MOTS C3, HOTS C4–C5. Level dan judul blok TIDAK ditampilkan ke peserta
 * (supaya ekspektasi "blok terakhir paling sulit" tidak ikut menaikkan rating NASA-TLX); hanya ada di data & fasilitator.
 * Teks NASA-TLX mengikuti Widyanti, Johnson & de Waard (2010), terjemahan NASA TLX v1.0 (Hart & Staveland, 1988). */
import data from "./konten-data.json";
import { CONFIG, lamaIstirahat } from "./config";

export type Soal = {
  id: string;
  tipe: "pg" | "urut" | "jodoh" | "esai";
  level: string;
  teks: string;
  opsi?: string[];
  butir?: string[];
  kunci?: number | number[];
  min_kata?: number;
  subtes?: "PU" | "PPU" | "PBM" | "PK";
  ranah?: "verbal" | "kuantitatif";
  /** Soal mandiri: tidak memakai bahan, ditampilkan tanpa panel bahan. */
  mandiri?: boolean;
};
/** Bahan satu blok: Teks A + Tabel B, tampil di samping soal yang memakainya. */
export type Bahan = {
  teks: { judul: string; paragraf: string[] };
  tabel: { judul: string; kolom: string[]; baris: string[][]; catatan?: string };
};
export type Blok = { nama: string; judul: string; level: string; pengantar: string; bahan?: Bahan; soal: Soal[] };
export type Skala = { id: "MD" | "PD" | "TD" | "OP" | "EF" | "FR"; nama: string; en: string; kiri: string; kanan: string; deskripsi: string };

export const BLOK = data.blok as unknown as Record<string, Blok>;
export const TLX = data.tlx as { sumber: string; instruksi_rating: string[]; skala: Skala[]; instruksi_bobot: string[] };
export const SKALA_ID = ["MD", "PD", "TD", "OP", "EF", "FR"] as const;

/* Langkah-langkah kursus. `need` = langkah yang harus selesai dulu; `done` = kunci progres saat selesai. */
export type Item = { id: string; tipe: "forum" | "quiz" | "assign" | "feedback" | "page" | "break"; nama: string; href: string; need: string | null; done: string | null; ket?: string };
export type Seksi = { id: string; nama: string; ringkas?: string; items: Item[] };

export function kursus(): Seksi[] {
  const bobot = CONFIG.TLX_BOBOT;
  const ringkasBlok = (b: number) => `${BLOK[b].soal.length} soal pilihan ganda dan isian.`;
  const rehat = lamaIstirahat();
  return [
    { id: "umum", nama: "Umum", items: [
      { id: "pengumuman", tipe: "forum", nama: "Pengumuman", href: "/kursus/pengumuman", need: null, done: null },
    ] },
    { id: "latihan", nama: "Latihan", ringkas: "Membiasakan diri dengan tampilan LMS dan formulir NASA-TLX.", items: [
      { id: "b0", tipe: "quiz", nama: "Latihan memakai LMS", href: "/kursus/blok/0/bacaan", need: null, done: "b0", ket: `Batas waktu ${CONFIG.DURASI_MENIT[0]} menit` },
      { id: "tlx0", tipe: "feedback", nama: "NASA-TLX (latihan)", href: "/kursus/tlx/0", need: "b0", done: "tlx0" },
    ] },
    { id: "blok1", nama: "Blok 1", ringkas: ringkasBlok(1), items: [
      { id: "b1", tipe: "quiz", nama: "Kuis Blok 1", href: "/kursus/blok/1/mulai", need: "tlx0", done: "b1", ket: `Batas waktu ${CONFIG.DURASI_MENIT[1]} menit` },
      { id: "tlx1", tipe: "feedback", nama: "NASA-TLX Blok 1", href: "/kursus/tlx/1", need: "b1", done: "tlx1" },
      { id: "rehat1", tipe: "break", nama: "Istirahat sejenak", href: "/kursus/istirahat/1", need: "tlx1", done: "rehat1", ket: `${rehat}, tanpa menyentuh komputer` },
    ] },
    { id: "blok2", nama: "Blok 2", ringkas: ringkasBlok(2), items: [
      { id: "b2", tipe: "quiz", nama: "Kuis Blok 2", href: "/kursus/blok/2/mulai", need: "rehat1", done: "b2", ket: `Batas waktu ${CONFIG.DURASI_MENIT[2]} menit` },
      { id: "tlx2", tipe: "feedback", nama: "NASA-TLX Blok 2", href: "/kursus/tlx/2", need: "b2", done: "tlx2" },
      { id: "rehat2", tipe: "break", nama: "Istirahat sejenak", href: "/kursus/istirahat/2", need: "tlx2", done: "rehat2", ket: `${rehat}, tanpa menyentuh komputer` },
    ] },
    { id: "blok3", nama: "Blok 3", ringkas: ringkasBlok(3), items: [
      { id: "b3", tipe: "quiz", nama: "Kuis Blok 3", href: "/kursus/blok/3/mulai", need: "rehat2", done: "b3", ket: `Batas waktu ${CONFIG.DURASI_MENIT[3]} menit` },
      { id: "tlx3", tipe: "feedback", nama: "NASA-TLX Blok 3", href: "/kursus/tlx/3", need: "b3", done: "tlx3" },
      ...(bobot ? [{ id: "bobot", tipe: "feedback" as const, nama: "NASA-TLX: perbandingan berpasangan", href: "/kursus/bobot", need: "tlx3", done: "bobot" }] : []),
    ] },
    { id: "diskusi", nama: "Forum Diskusi", ringkas: "Bagikan hasil kegiatanmu hari ini. Setiap peserta mengirim satu balasan.", items: [
      { id: "forum", tipe: "forum", nama: "Forum diskusi: hasil kegiatan hari ini", href: "/kursus/forum", need: bobot ? "bobot" : "tlx3", done: "forum", ket: "Kirim satu balasan" },
    ] },
    { id: "penutup", nama: "Penutup", items: [
      { id: "selesai", tipe: "page", nama: "Penutup & terima kasih", href: "/kursus/selesai", need: "forum", done: "selesai" },
    ] },
  ];
}

export function semuaItem(): Item[] {
  return kursus().flatMap((s) => s.items);
}

/* Fakultas di Universitas Padjadjaran. `bidang` = isian awal rumpun STEM/non-STEM (peserta tetap bisa mengubah);
 * null = tidak diisi otomatis karena klasifikasinya berbeda antar-sumber (Psikologi) atau tidak diketahui (Lainnya). */
export const FAKULTAS: { nama: string; singkat: string; bidang: "STEM" | "non-STEM" | null }[] = [
  { nama: "Fakultas Hukum", singkat: "FH", bidang: "non-STEM" },
  { nama: "Fakultas Ekonomi dan Bisnis", singkat: "FEB", bidang: "non-STEM" },
  { nama: "Fakultas Kedokteran", singkat: "FK", bidang: "STEM" },
  { nama: "Fakultas Matematika dan Ilmu Pengetahuan Alam", singkat: "FMIPA", bidang: "STEM" },
  { nama: "Fakultas Pertanian", singkat: "Faperta", bidang: "STEM" },
  { nama: "Fakultas Kedokteran Gigi", singkat: "FKG", bidang: "STEM" },
  { nama: "Fakultas Ilmu Sosial dan Ilmu Politik", singkat: "FISIP", bidang: "non-STEM" },
  { nama: "Fakultas Ilmu Budaya", singkat: "FIB", bidang: "non-STEM" },
  { nama: "Fakultas Psikologi", singkat: "Fapsi", bidang: null },
  { nama: "Fakultas Peternakan", singkat: "Fapet", bidang: "STEM" },
  { nama: "Fakultas Ilmu Komunikasi", singkat: "Fikom", bidang: "non-STEM" },
  { nama: "Fakultas Keperawatan", singkat: "Fkep", bidang: "STEM" },
  { nama: "Fakultas Perikanan dan Ilmu Kelautan", singkat: "FPIK", bidang: "STEM" },
  { nama: "Fakultas Teknologi Industri Pertanian", singkat: "FTIP", bidang: "STEM" },
  { nama: "Fakultas Farmasi", singkat: "Farmasi", bidang: "STEM" },
  { nama: "Fakultas Teknik Geologi", singkat: "FTG", bidang: "STEM" },
  { nama: "Lainnya", singkat: "Lainnya", bidang: null },
];

export function kata(s: string | null | undefined) {
  const t = (s || "").trim();
  return t ? t.split(/\s+/).length : 0;
}
