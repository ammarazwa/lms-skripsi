import { menit, minBaca } from "@/lib/config";

/** Blok yang sedang berjalan (sudah dimulai, belum dikirim). */
export function blokAktif(t: Record<string, number>) {
  for (let b = 1; b <= 3; b++) if (t["b" + b + "_start"] && !t["b" + b]) return b;
  return null;
}

/** Sisa waktu (ms) sebuah aktivitas berbatas waktu. */
export function sisa(t: Record<string, number>, mulaiKey: string, durasiKey: string | number, sekarang: number) {
  const s = t[mulaiKey];
  if (!s) return menit(durasiKey) * 60000;
  return s + menit(durasiKey) * 60000 - sekarang;
}

/** Sisa waktu baca minimal (ms) blok b, dihitung dari saat halaman Bacaan pertama kali dibuka (langkah b{b}_baca). */
export function sisaBaca(t: Record<string, number>, b: number, sekarang: number) {
  const s = t["b" + b + "_baca"];
  if (!s) return minBaca(b) * 1000;
  return s + minBaca(b) * 1000 - sekarang;
}

export const NEED_BLOK: Record<number, string | null> = { 0: null, 1: "tlx0", 2: "rehat1", 3: "rehat2" };
