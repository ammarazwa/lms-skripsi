import { cekPin, gagal, json } from "@/lib/api";

/** Verifikasi PIN fasilitator (dipakai untuk mengakhiri sesi peserta di PC lab). */
export async function POST(req: Request) {
  if (!cekPin(req)) return gagal("PIN salah.", 401);
  return json({ ok: true });
}
