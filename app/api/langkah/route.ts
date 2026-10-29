import { stamp, stateOf } from "@/lib/db";
import { bacaPeserta, gagal, json } from "@/lib/api";

// Langkah yang boleh dicatat langsung dari klien (langkah yang menyimpan jawaban punya endpoint sendiri).
const BOLEH = /^(b[0-3]_start|b[0-3]_baca|m[1-3]|tlx[0-3]_start|bobot_start|forum_start|pengumuman|selesai)$/;

export async function POST(req: Request) {
  const r = await bacaPeserta(req); if (r instanceof Response) return r;
  const [b, kode] = r;
  const kunci = String(b.kunci || "");
  if (!BOLEH.test(kunci)) return gagal("Langkah tidak dikenal.");
  await stamp(kode, kunci);
  return json(await stateOf(kode));
}
