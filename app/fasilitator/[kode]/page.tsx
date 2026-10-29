"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Bar, durasi, usePin } from "@/components/fasilitator";

type Detail = {
  peserta: Record<string, unknown>;
  times: Record<string, number>;
  jawaban: Record<string, unknown>[];
  hasil: Record<string, unknown>[];
  tlx: Record<string, unknown>[];
  bobot: Record<string, unknown> | null;
  istirahat: Record<string, unknown>[];
  forum: Record<string, unknown> | null;
  fitur: Record<string, unknown>[];
  jenis_event: { tipe: string; n: number }[];
  event_terakhir: { ts: number; page: string; blok: number | null; tipe: string; data: string | null }[];
};

const jam = (t: unknown) => (t ? new Date(Number(t)).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "–");

function Tabel({ rows, cols }: { rows: Record<string, unknown>[]; cols?: string[] }) {
  if (!rows.length) return <p className="muted">Belum ada data.</p>;
  const c = cols || Object.keys(rows[0]);
  return (
    <div className="tabel-wrap" style={{ marginBottom: 20 }}>
      <table className="tabel">
        <thead><tr>{c.map((k) => <th key={k}>{k}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{c.map((k) => {
          const v = r[k];
          const s = v === null || v === undefined ? "–" : typeof v === "object" ? JSON.stringify(v) : String(v);
          return <td key={k} className={s.length > 50 ? "wrap-ok" : ""}>{s}</td>;
        })}</tr>)}</tbody>
      </table>
    </div>
  );
}

export default function DetailPeserta() {
  const kode = useParams<{ kode: string }>().kode;
  const router = useRouter();
  const [pin] = usePin();
  const [d, setD] = useState<Detail | null>(null);

  const muat = useCallback(async () => {
    if (!pin) return;
    const r = await fetch("/api/admin/peserta/" + kode, { headers: { "x-pin": pin }, cache: "no-store" });
    if (r.ok) setD(await r.json());
  }, [pin, kode]);

  useEffect(() => {
    muat();
    const iv = setInterval(muat, 5000);
    return () => clearInterval(iv);
  }, [muat]);

  async function hapus() {
    if (!pin || !confirm(`Hapus SEMUA data peserta ${kode}? Tindakan ini tidak bisa dibatalkan.`)) return;
    await fetch("/api/admin/peserta/" + kode, { method: "DELETE", headers: { "x-pin": pin } });
    router.push("/fasilitator");
  }

  if (pin === null) return <><Bar /><div className="page page-full"><Link href="/fasilitator">Masukkan PIN dulu</Link></div></>;
  if (!d) return <><Bar /><div className="page page-full"><p className="muted">Memuat…</p></div></>;

  const p = d.peserta;
  const langkah = Object.entries(d.times).sort((a, b) => a[1] - b[1]).map(([kunci, ts]) => ({ kunci, waktu: jam(ts) }));
  return (
    <>
      <Bar><Link href="/fasilitator" className="top-btn">Semua peserta</Link></Bar>
      <div className="page page-full">
        <div className="dash-head">
          <div>
            <h1>Peserta {String(p.kode)}</h1>
            <p className="muted" style={{ margin: 0 }}>{String(p.gender || "gender belum diisi")} · {String(p.fakultas || "fakultas belum diisi")} · {String(p.bidang || "bidang belum diisi")} · {String(p.usia ?? "–")} th · {String(p.prodi || "–")} · angkatan {String(p.angkatan || "–")} · LMS: {String(p.frekuensi_lms || "–")} · {String(p.perangkat || "–")}</p>
          </div>
          <button className="btn btn-danger btn-sm" onClick={hapus}>Hapus data peserta</button>
        </div>
        <div className="stat-row">
          <div className="stat"><span className="muted">Mulai (login pertama)</span><b>{jam(p.created_at)}</b></div>
          <div className="stat"><span className="muted">Selesai (halaman Penutup)</span><b>{jam(d.times.selesai)}</b></div>
          <div className="stat"><span className="muted">Total durasi</span><b>{d.times.selesai ? durasi(d.times.selesai - Number(p.created_at)) : durasi(Date.now() - Number(p.created_at)) + " (berjalan)"}</b></div>
        </div>

        <h3>Fitur utama Tabel 3.4 (segmen: halaman blok terbuka sampai halaman NASA-TLX terbuka)</h3>
        <Tabel rows={d.fitur} cols={["blok", "level_bloom", "access_duration_s", "click_count", "text_input_chars", "page_visits", "u_turn_count", "RTLX", "WWL"]} />
        <h3>Fitur tambahan (analisis sensitivitas)</h3>
        <Tabel rows={d.fitur} cols={["blok", "idle_ratio", "click_rate_per_min", "deletion_ratio", "burst_len_mean", "inter_burst_pause_s", "story_revisits", "mouse_dist_per_min", "rage_click_count", "text_return_count", "text_return_time_s", "initial_reading_s", "essay_words", "skor_benar"]} />

        <div className="grid-2" style={{ alignItems: "start" }}>
          <div>
            <h3>NASA-TLX</h3>
            <Tabel rows={d.tlx.map((r) => ({ ...r, ts: jam(r.ts) }))} cols={["blok", "MD", "PD", "TD", "OP", "EF", "FR", "raw", "ts"]} />
            <h3>Bobot (perbandingan berpasangan)</h3>
            <Tabel rows={d.bobot ? [d.bobot] : []} cols={["MD", "PD", "TD", "OP", "EF", "FR"]} />
            <h3>Istirahat</h3>
            <Tabel rows={d.istirahat.map((r) => ({ ...r, mulai: jam(r.mulai), selesai: jam(r.selesai), hands_off: r.hands_off ? "ya" : "tidak" }))} cols={["ke", "mulai", "selesai", "durasi_s", "hands_off", "klik_saat_istirahat", "ketik_saat_istirahat", "scroll_saat_istirahat", "detik_mouse_bergerak", "alasan"]} />
            <h3>Skor blok</h3>
            <Tabel rows={d.hasil.map((r) => ({ ...r, ts: jam(r.ts) }))} cols={["blok", "skor", "maks", "alasan", "ts"]} />
          </div>
          <div>
            <h3>Urutan langkah</h3>
            <Tabel rows={langkah} />
            <h3>Jumlah event per jenis</h3>
            <Tabel rows={d.jenis_event} />
          </div>
        </div>

        <h3>Forum diskusi</h3>
        <Tabel rows={d.forum ? [{ ...d.forum, mulai: jam(d.forum.mulai), ts: jam(d.forum.ts) }] : []} cols={["isi", "jumlah_kata", "mulai", "ts"]} />

        <h3>Jawaban</h3>
        <Tabel rows={d.jawaban} cols={["blok", "soal_id", "level", "tipe", "nilai", "benar", "jumlah_kata"]} />

        <h3>60 event terakhir (live)</h3>
        <Tabel rows={d.event_terakhir.map((e) => ({ ...e, ts: jam(e.ts) }))} cols={["ts", "page", "blok", "tipe", "data"]} />
      </div>
    </>
  );
}
