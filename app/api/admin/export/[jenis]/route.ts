import { db } from "@/lib/db";
import { datasetFitur, kepatuhanIstirahat, toCsv } from "@/lib/fitur";
import { cekPin, gagal } from "@/lib/api";

type Ctx = { params: Promise<{ jenis: string }> };

// Ekspor besar (events, dataset) membaca seluruh log; beri waktu lebih di Vercel.
export const maxDuration = 60;

const WIB = (kolom: string) => `to_char(to_timestamp(${kolom} / 1000.0) AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS')`;

const SQL: Record<string, string> = {
  peserta: `SELECT p.kode, p.gender, p.bidang, p.fakultas, p.usia, p.prodi, p.angkatan, p.frekuensi_lms, p.perangkat, p.consent_at,
      p.created_at AS mulai, s.ts AS selesai,
      ${WIB("p.created_at")} AS mulai_waktu,
      ${WIB("s.ts")} AS selesai_waktu,
      ROUND((s.ts - p.created_at) / 1000.0, 1) AS total_durasi_s
    FROM peserta p LEFT JOIN langkah s ON s.kode = p.kode AND s.kunci = 'selesai' ORDER BY p.kode`,
  langkah: "SELECT kode, kunci, ts FROM langkah ORDER BY kode, ts",
  jawaban: "SELECT kode, blok, soal_id, level, tipe, nilai, benar, jumlah_kata FROM jawaban ORDER BY kode, blok, soal_id",
  tlx: `SELECT t.kode, p.gender, t.blok, t."MD", t."PD", t."TD", t."OP", t."EF", t."FR", t.raw, t.ts FROM tlx t LEFT JOIN peserta p ON p.kode = t.kode ORDER BY t.kode, t.blok`,
  bobot: `SELECT kode, "MD", "PD", "TD", "OP", "EF", "FR", urutan, pilihan, ts FROM tlx_bobot ORDER BY kode`,
  forum: "SELECT f.kode, p.gender, f.isi, f.jumlah_kata, f.mulai, f.ts, f.ts - f.mulai AS durasi_tulis_ms FROM forum_post f LEFT JOIN peserta p ON p.kode = f.kode ORDER BY f.ts",
  events: "SELECT id, kode, ts, page, blok, tipe, data FROM events ORDER BY kode, ts, id",
};

export async function GET(req: Request, { params }: Ctx) {
  if (!cekPin(req)) return gagal("PIN salah.", 401);
  const jenis = (await params).jenis.replace(/\.csv$/, "");
  let rows: Record<string, unknown>[];
  if (jenis === "dataset") rows = (await datasetFitur(new URL(req.url).searchParams.get("semua") === "1")).rows;
  else if (jenis === "istirahat") {
    const ps = await db.all<{ kode: string }>("SELECT DISTINCT kode FROM istirahat ORDER BY kode");
    rows = [];
    for (const p of ps) rows.push(...(await kepatuhanIstirahat(p.kode)));
  } else if (SQL[jenis]) rows = await db.all(SQL[jenis]);
  else return gagal("Jenis ekspor tidak dikenal.", 404);
  const tgl = new Date().toISOString().slice(0, 10);
  return new Response(toCsv(rows) || "﻿(kosong)\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lms_${jenis}_${tgl}.csv"`,
    },
  });
}
