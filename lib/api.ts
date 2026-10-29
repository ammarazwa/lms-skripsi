import { NextResponse } from "next/server";
import { CONFIG } from "./config";
import { getPeserta } from "./db";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function gagal(pesan: string, status = 400) {
  return NextResponse.json({ error: pesan }, { status });
}

export function normKode(k: unknown) {
  return String(k || "").trim().toUpperCase();
}

/** Ambil body JSON + validasi peserta. Mengembalikan [body, kode] atau Response error. */
export async function bacaPeserta(req: Request): Promise<[Record<string, unknown>, string] | Response> {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return gagal("Body bukan JSON."); }
  const kode = normKode(body.kode);
  if (!CONFIG.KODE_POLA.test(kode)) return gagal("Kode peserta tidak valid.");
  if (!(await getPeserta(kode))) return gagal("Peserta belum terdaftar.", 404);
  return [body, kode];
}

// Saat deploy (Vercel), WAJIB isi FASILITATOR_PIN; nilai bawaan hanya untuk uji lokal.
export const PIN = process.env.FASILITATOR_PIN || "2468";

/** PIN hanya diterima lewat header x-pin. Dulu boleh lewat ?pin= di URL, tapi itu ikut tersimpan di riwayat browser
 * dan log request Vercel. */
export function cekPin(req: Request) {
  return req.headers.get("x-pin") === PIN;
}
