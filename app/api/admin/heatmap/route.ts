import { heatmap } from "@/lib/heatmap";
import { toCsv } from "@/lib/fitur";
import { cekPin, gagal, json } from "@/lib/api";

export const maxDuration = 60;

const HALAMAN = /^\/kursus\/(forum|blok\/[0-3]\/(\d+|bacaan)|tlx\/[0-3])$/;

export async function GET(req: Request) {
  if (!cekPin(req)) return gagal("PIN salah.", 401);
  const q = new URL(req.url).searchParams;
  const halaman = q.get("halaman") || "/kursus/blok/1/bacaan";
  if (!HALAMAN.test(halaman)) return gagal("Halaman tidak dikenal.");
  const hasil = await heatmap({
    halaman,
    gender: q.get("gender") || undefined,
    bidang: q.get("bidang") || undefined,
    uji: q.get("uji") === "1",
    kode: q.get("kode") || undefined,
  });
  if (q.get("format") === "csv") {
    const nama = halaman.replace(/^\/kursus\//, "").replace(/\//g, "-");
    return new Response(toCsv(hasil.zona.sort((a, b) => b.rata_terlihat_s - a.rata_terlihat_s)) || "﻿(kosong)\n", {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="lms_zona_${nama}.csv"` },
    });
  }
  return json(hasil);
}
