/* Pengaturan eksperimen. Ubah di sini sebelum pengambilan data. */
export const CONFIG = {
  SITE_NAME: "LiVE Unpad",
  SITE_TAGLINE: "Learning in Virtual Environment",
  COURSE_NAME: "Latihan Potensi Skolastik",
  COURSE_SHORT: "LPS-01",
  COURSE_CATEGORY: "Eksperimen Penelitian · Teknik Informatika FMIPA",

  // Mode demo: tampilkan tombol "lewati" di halaman istirahat & penanda demo. Matikan saat pengambilan data.
  DEMO: process.env.NEXT_PUBLIC_DEMO !== "0",

  // Batas waktu MAKSIMUM (menit). Saat habis, jawaban dikirim otomatis. Blok 1–3 sama (volume tugas dikontrol,
  // yang berbeda hanya level kesulitan).
  DURASI_MENIT: { 0: 5, 1: 15, 2: 15, 3: 15 } as Record<string, number>,

  // Waktu baca minimal (detik) di halaman Bacaan sebelum nomor soal dan "Lanjut ke soal" aktif. Termasuk dalam batas
  // waktu blok. Bahan Blok 1–3 sama panjang (±270 kata, ±1,4 menit pada 200 kata/menit), jadi minimalnya sama.
  MIN_BACA_DETIK: { 0: 20, 1: 90, 2: 90, 3: 90 } as Record<string, number>,

  // Istirahat setelah NASA-TLX Blok 1 dan Blok 2 (durasi sama untuk semua peserta = variabel kontrol).
  // 90 dtk: tengah rentang 1–2 menit dari narasumber psikologi (wawancara 22-10-2026); 2 menit dinilai terlalu lama.
  ISTIRAHAT_DETIK: 90,
  // Bunyi pendek saat istirahat selesai (peserta tidak melihat layar selama istirahat hands-off).
  ISTIRAHAT_BUNYI: true,
  // Detik awal istirahat yang tidak dihitung sebagai pelanggaran hands-off (tangan baru dilepas dari mouse).
  ISTIRAHAT_TOLERANSI_DETIK: 3,

  // Perbandingan berpasangan NASA-TLX (15 pasang) sekali setelah TLX Blok 3.
  TLX_BOBOT: true,

  // Kirim batch log interaksi ke server tiap N milidetik.
  FLUSH_MS: 4000,

  // Kode peserta yang diterima: P01–P60 (utama), T01–T99 (uji/demo), PL01–PL99 (pilot).
  KODE_POLA: /^(P(0[1-9]|[1-5][0-9]|60)|T[0-9]{2}|PL[0-9]{2})$/,

  // Opsional: Contentsquare/Hotjar tag untuk session replay (kosong = tidak dimuat).
  CONTENTSQUARE_TAG: process.env.NEXT_PUBLIC_CONTENTSQUARE_TAG || "",
};

export function menit(kunci: string | number) {
  return CONFIG.DURASI_MENIT[String(kunci)] ?? 10;
}

export function minBaca(b: string | number) {
  return CONFIG.MIN_BACA_DETIK[String(b)] ?? 0;
}

/** Lama istirahat untuk teks peserta: "90 detik", atau "2 menit" bila kelipatan 60. */
export function lamaIstirahat() {
  const d = CONFIG.ISTIRAHAT_DETIK;
  return d % 60 === 0 ? `${d / 60} menit` : `${d} detik`;
}
