/* Ekstraksi fitur interaksi per peserta × blok — kolom CSV sama dengan pipeline skripsi
 * (Pipeline_Final_Skripsi_Ammara/src/p3_fitur.py `fitur_log`), sehingga CSV dataset dari LMS
 * langsung terbaca notebook (MODE 'dataset') tanpa coding Hotjar. Definisi U-turn (09-11-2026): setiap perpindahan mundur
 * ke halaman yang lebih awal dalam urutan halaman blok, tanpa batas waktu (lihat `uTurn`); `hitung_log` di p2_data.py
 * hanya dipakai jalur lama (Hotjar/mock) dan tidak lagi menjadi acuan.
 *
 * Segmen blok b: t0 = halaman blok b (Bacaan /kursus/blok/b/bacaan atau soal /kursus/blok/b/N) pertama kali terbuka,
 * t1 = halaman NASA-TLX blok b pertama kali terbuka. Waktu baca termasuk segmen (masuk batas 15 menit). Istirahat,
 * pengisian NASA-TLX, dan forum berada di luar segmen.
 *
 * Sejak alur "Bacaan dulu" (29-10-2026), fitur kembali ke bahan dihitung dari page view: text_return_count dan
 * text_return_time_s hanya ada di LMS; pipeline membacanya dari CSV dataset (FITUR_EXT). */
import { db, langkahMap, type Peserta } from "./db";
import { SKALA_ID } from "./konten";
import { CONFIG } from "./config";

export type Ev = { ts: number; page: string; tipe: string; d: Record<string, unknown> };

/** Lima fitur utama Tabel 3.4 (nama kolom = FITUR di pipeline). */
export const FITUR = ["access_duration_s", "click_count", "text_input_chars", "page_visits", "u_turn_count"] as const;
/** Fitur tambahan untuk analisis sensitivitas (nama kolom = FITUR_EXT di pipeline). */
export const FITUR_EXT = ["idle_ratio", "click_rate_per_min", "deletion_ratio", "burst_len_mean", "inter_burst_pause_s",
  "story_revisits", "mouse_dist_per_min", "rage_click_count", "text_return_count", "text_return_time_s"] as const;

const AKTIVITAS = new Set(["click", "key", "scroll", "mm", "choice", "focus", "pv", "field"]);
const r4 = (x: number) => Math.round(x * 10000) / 10000;

export async function eventsPeserta(kode: string): Promise<Ev[]> {
  return (await db.all<{ ts: number; page: string; tipe: string; data: string | null }>("SELECT ts, page, tipe, data FROM events WHERE kode = ? ORDER BY ts, id", kode))
    .map((e) => ({ ts: Number(e.ts), page: String(e.page), tipe: String(e.tipe), d: e.data ? JSON.parse(e.data) : {} }));
}

/** Batas segmen blok dari page view; cadangan: timestamp server mulai/kirim blok. */
function segmen(ev: Ev[], t: Record<string, number>, b: number) {
  const pv = ev.filter((e) => e.tipe === "pv");
  const mulai = t["b" + b + "_start"], kirim = t["b" + b + "_end"];
  if (!mulai || !kirim) return null;
  const halSoal = (page: string) => page.match(/^\/kursus\/blok\/(\d)\/(?:\d+|bacaan)$/)?.[1] === String(b);
  const t0 = pv.find((e) => halSoal(e.page) && e.ts >= mulai - 5000)?.ts ?? mulai;
  const t1 = pv.find((e) => e.page === `/kursus/tlx/${b}` && e.ts >= t0)?.ts ?? kirim;
  return t1 > t0 ? { t0, t1 } : null;
}

/** Urutan halaman dalam satu blok: mulai (0) → Bacaan (1) → soal ke-n (1 + n). Halaman lain (NASA-TLX, istirahat, forum) → null. */
function urutHalaman(page: string): { b: number; i: number } | null {
  const m = page.match(/^\/kursus\/blok\/(\d)\/(mulai|bacaan|\d+)$/);
  if (!m) return null;
  return { b: Number(m[1]), i: m[2] === "mulai" ? 0 : m[2] === "bacaan" ? 1 : 1 + Number(m[2]) };
}

/** U-turn: jumlah navigasi kembali ke halaman sebelumnya, yaitu setiap page view di dalam segmen yang berpindah ke halaman
 * yang lebih awal dalam urutan halaman blok yang sama (soal → Bacaan, soal n → soal sebelumnya, dst.). Tidak ada batas waktu,
 * dan tidak dibedakan apakah lewat tombol "Sebelumnya", navigasi nomor soal/Bacaan, atau tombol back browser. Muat ulang
 * halaman yang sama tidak dihitung. */
function uTurn(ev: Ev[], t0: number, t1: number) {
  const pv = ev.filter((e) => e.tipe === "pv");
  let n = 0;
  for (let i = 1; i < pv.length; i++) {
    if (pv[i].ts < t0 || pv[i].ts >= t1) continue;
    const dari = urutHalaman(pv[i - 1].page), ke = urutHalaman(pv[i].page);
    if (dari && ke && dari.b === ke.b && ke.i < dari.i) n++;
  }
  return n;
}

/** Rage click: ≥ 5 klik dalam 500 ms (tidak tumpang tindih). */
function rage(klik: number[]) {
  let n = 0, i = 0;
  while (i + 4 < klik.length) {
    if (klik[i + 4] - klik[i] <= 500) { n++; i += 5; } else i++;
  }
  return n;
}

/** Kembali ke Bacaan: page view Bacaan blok b setelah soal pertama blok itu benar-benar tampil; lamanya sampai page view
 * berikutnya (paling lama t1). "Soal tampil" diambil dari event block_view, bukan page view, karena membuka alamat soal
 * sebelum waktu baca minimal tetap tercatat sebagai page view walau langsung dialihkan ke Bacaan.
 * bacaAwal = lama membaca dari t0 sampai soal pertama tampil (informasi, bukan fitur model). */
function kembaliBacaan(w: Ev[], b: number, t0: number, t1: number) {
  const pv = w.filter((e) => e.tipe === "pv");
  const bac = `/kursus/blok/${b}/bacaan`;
  const tSoal = w.find((e) => e.tipe === "block_view" && Number(e.d.blok) === b)?.ts;
  let n = 0, lama = 0;
  if (tSoal !== undefined) {
    for (let i = 0; i < pv.length; i++) {
      if (pv[i].page !== bac || pv[i].ts <= tSoal) continue;
      n++;
      lama += (Math.min(pv[i + 1]?.ts ?? t1, t1) - pv[i].ts) / 1000;
    }
  }
  const bacaAwal = tSoal !== undefined && pv[0]?.page === bac ? (tSoal - t0) / 1000 : null;
  return { n, lama, bacaAwal };
}

export function hitungFitur(ev: Ev[], t0: number, t1: number, b: number) {
  const w = ev.filter((e) => e.ts >= t0 && e.ts < t1);
  const kb = kembaliBacaan(w, b, t0, t1);
  const dur = (t1 - t0) / 1000;
  const keys = w.filter((e) => e.tipe === "key");
  const ch = keys.filter((e) => e.d.c === "c" || e.d.c === "s").length;
  const de = keys.filter((e) => e.d.c === "b" || e.d.c === "d").length;
  // burst ketikan: putus bila jeda > 2 detik
  const kt = keys.filter((e) => ["c", "s", "b", "d"].includes(String(e.d.c))).map((e) => e.ts);
  let burst = kt.length, jeda = 0;
  if (kt.length > 1) {
    const gaps = kt.slice(1).map((x, i) => x - kt[i]);
    const sizes: number[] = [];
    let cur = 1;
    gaps.forEach((g) => { if (g > 2000) { sizes.push(cur); cur = 1; } else cur++; });
    sizes.push(cur);
    burst = sizes.reduce((a, c) => a + c, 0) / sizes.length;
    const pauses = gaps.filter((g) => g > 2000).map((g) => g / 1000);
    jeda = pauses.length ? pauses.reduce((a, c) => a + c, 0) / pauses.length : 0;
  }
  // idle: jeda ≥ 5 detik antar-aktivitas (termasuk dari t0 dan sampai t1)
  const act = [t0, ...w.filter((e) => AKTIVITAS.has(e.tipe)).map((e) => e.ts), t1];
  let idle = 0;
  for (let i = 1; i < act.length; i++) { const g = (act[i] - act[i - 1]) / 1000; if (g >= 5) idle += g; }
  const klik = w.filter((e) => e.tipe === "click").map((e) => e.ts);
  const mouse = w.filter((e) => e.tipe === "mm").reduce((a, e) => a + (Number(e.d.d) || 0), 0);
  return {
    access_duration_s: r4(dur),
    click_count: klik.length,
    text_input_chars: ch,
    page_visits: w.filter((e) => e.tipe === "pv").length,
    u_turn_count: uTurn(ev, t0, t1),
    idle_ratio: dur > 0 ? r4(idle / dur) : null,
    click_rate_per_min: dur > 0 ? r4(klik.length / (dur / 60)) : null,
    deletion_ratio: ch + de ? r4(de / (ch + de)) : 0,
    burst_len_mean: r4(burst),
    inter_burst_pause_s: r4(jeda),
    story_revisits: w.filter((e) => e.tipe === "revisit").length,
    mouse_dist_per_min: dur > 0 ? r4(mouse / (dur / 60)) : null,
    rage_click_count: rage(klik),
    text_return_count: kb.n,
    text_return_time_s: r4(kb.lama),
    // informasi tambahan (tidak dipakai model)
    initial_reading_s: kb.bacaAwal === null ? null : r4(kb.bacaAwal),
    scroll_count: w.filter((e) => e.tipe === "scroll").length,
    window_blur_count: w.filter((e) => e.tipe === "wblur").length,
    paste_count: w.filter((e) => e.tipe === "paste").length,
  };
}

/** Kepatuhan istirahat hands-off: interaksi selama masa istirahat wajib, dari mulai + toleransi sampai
 * mulai + durasi istirahat (atau sampai istirahat ditutup bila lebih awal, mis. dilewati di mode demo).
 * Klik tombol "Lanjut" setelah waktu habis tidak dihitung. */
export async function kepatuhanIstirahat(kode: string) {
  const [rows, ev] = await Promise.all([db.all("SELECT * FROM istirahat WHERE kode = ? ORDER BY ke", kode), eventsPeserta(kode)]);
  return rows.map((r) => {
    const a = Number(r.mulai) + CONFIG.ISTIRAHAT_TOLERANSI_DETIK * 1000;
    const b = Math.min(Number(r.mulai) + CONFIG.ISTIRAHAT_DETIK * 1000, r.selesai ? Number(r.selesai) : Infinity);
    const w = ev.filter((e) => e.ts >= a && e.ts < b);
    const n = (tp: string) => w.filter((e) => e.tipe === tp).length;
    const klik = n("click"), ketik = n("key"), scroll = n("scroll");
    const mouse = w.filter((e) => e.tipe === "mm").reduce((s, e) => s + (Number(e.d.d) || 0), 0);
    return {
      ...r,
      durasi_s: r.durasi_ms ? Math.round(Number(r.durasi_ms) / 1000) : null,
      klik_saat_istirahat: klik, ketik_saat_istirahat: ketik, scroll_saat_istirahat: scroll,
      detik_mouse_bergerak: n("mm"), jarak_mouse_px: Math.round(mouse),
      hands_off: klik + ketik + scroll === 0 && n("mm") === 0 ? 1 : 0,
    };
  });
}

export type BarisFitur = Record<string, string | number | null>;

export async function fiturPeserta(p: Peserta): Promise<BarisFitur[]> {
  const [t, ev, tlxRows, bobot, hasil, kataEsai] = await Promise.all([
    langkahMap(p.kode),
    eventsPeserta(p.kode),
    db.all("SELECT * FROM tlx WHERE kode = ?", p.kode),
    db.get("SELECT * FROM tlx_bobot WHERE kode = ?", p.kode),
    db.all("SELECT blok, skor, maks, alasan FROM hasil_blok WHERE kode = ?", p.kode),
    db.all("SELECT blok, SUM(jumlah_kata) AS n FROM jawaban WHERE kode = ? AND tipe = 'esai' GROUP BY blok", p.kode),
  ]);
  const out: BarisFitur[] = [];
  for (const b of [1, 2, 3]) {
    const s = segmen(ev, t, b);
    if (!s) continue;
    const tl = tlxRows.find((r) => Number(r.blok) === b);
    const h = hasil.find((r) => Number(r.blok) === b);
    const ke = kataEsai.find((r) => Number(r.blok) === b);
    const tlx: BarisFitur = {};
    SKALA_ID.forEach((id) => (tlx[id] = tl ? Number(tl[id]) : null));
    const wwl = tl && bobot ? r4(SKALA_ID.reduce((a, id) => a + Number(tl[id]) * Number(bobot[id]), 0) / 15) : null;
    const w: BarisFitur = {};
    SKALA_ID.forEach((id) => (w["w_" + id] = bobot ? Number(bobot[id]) : null));
    out.push({
      peserta: p.kode,
      gender: p.gender === "Laki-laki" ? "L" : p.gender === "Perempuan" ? "P" : null,
      bidang: p.bidang,
      fakultas: p.fakultas,
      blok: b,
      level_bloom: b === 1 ? "LOTS" : b === 2 ? "MOTS" : "HOTS",
      ...tlx,
      RTLX: tl ? Number(tl.raw) : null,
      WWL: wwl,
      ...w,
      ...hitungFitur(ev, s.t0, s.t1, b),
      essay_words: ke ? Number(ke.n) : 0,
      skor_benar: h ? Number(h.skor) : null,
      skor_maks: h ? Number(h.maks) : null,
      akhir_blok: h ? String(h.alasan) : null,
      t0: s.t0,
      t1: s.t1,
    });
  }
  return out;
}

/** Dataset siap model. Default hanya kode peserta utama (P01–P60); `semua` = ikut kode uji (T) & pilot (PL). */
export async function datasetFitur(semua = false) {
  const ps = await db.all<Peserta>("SELECT * FROM peserta ORDER BY kode");
  const rows: BarisFitur[] = [];
  for (const p of ps.filter((x) => semua || /^P\d/.test(x.kode))) rows.push(...(await fiturPeserta(p)));
  const raws = rows.map((r) => r.RTLX).filter((x): x is number => typeof x === "number").sort((a, b) => a - b);
  const median = raws.length ? (raws.length % 2 ? raws[(raws.length - 1) / 2] : (raws[raws.length / 2 - 1] + raws[raws.length / 2]) / 2) : null;
  rows.forEach((r) => {
    r.median_rtlx = median;
    r.label_median_lms = median === null || r.RTLX === null ? null : Number(r.RTLX) >= median ? 1 : 0;
  });
  return { rows, median };
}

export function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const cols = Array.from(rows.reduce((s, r) => { Object.keys(r).forEach((k) => s.add(k)); return s; }, new Set<string>()));
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return "﻿" + [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\n");
}
