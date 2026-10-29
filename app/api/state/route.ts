import { CONFIG } from "@/lib/config";
import { stateOf } from "@/lib/db";
import { gagal, json, normKode } from "@/lib/api";

export async function GET(req: Request) {
  const kode = normKode(new URL(req.url).searchParams.get("kode"));
  if (!CONFIG.KODE_POLA.test(kode)) return gagal("Kode peserta tidak valid.");
  const s = await stateOf(kode);
  if (!s) return gagal("Peserta belum terdaftar.", 404);
  return json(s);
}
