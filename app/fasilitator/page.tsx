"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Bar, EKSPOR, durasi, usePin } from "@/components/fasilitator";
import { FAKULTAS } from "@/lib/konten";

type Row = {
  kode: string; gender: string | null; fakultas: string | null; usia: number | null; prodi: string | null; progres: number; total: number; posisi: string;
  events: number; terakhir_aktif: number | null; created_at: number; times: Record<string, number>;
};
type Ringkasan = { peserta: Row[]; statistik: { total: number; laki: number; perempuan: number; selesai: number; events: number } };

const jam = (t: number | null) => (t ? new Date(t).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "–");

export default function Fasilitator() {
  const [pin, setPin] = usePin();
  const [input, setInput] = useState("");
  const [data, setData] = useState<Ringkasan | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [unduhan, setUnduhan] = useState<string | null>(null);

  /** Unduh CSV lewat fetch + header x-pin, supaya PIN tidak masuk URL (riwayat browser, log server). */
  async function unduh(k: string) {
    if (!pin || unduhan) return;
    setUnduhan(k);
    try {
      const r = await fetch(`/api/admin/export/${k}`, { headers: { "x-pin": pin }, cache: "no-store" });
      if (r.status === 401) { setErr("PIN salah."); setPin(null); return; }
      if (!r.ok) { setErr(`Ekspor gagal (${r.status}).`); return; }
      const nama = /filename="([^"]+)"/.exec(r.headers.get("Content-Disposition") || "")?.[1] || `lms_${k.split("?")[0]}.csv`;
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement("a");
      a.href = url; a.download = nama;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setErr(null);
    } catch {
      setErr("Ekspor gagal. Periksa koneksi lalu coba lagi.");
    } finally {
      setUnduhan(null);
    }
  }

  const muat = useCallback(async (p: string) => {
    const r = await fetch("/api/admin/ringkasan", { headers: { "x-pin": p }, cache: "no-store" });
    if (r.status === 401) { setErr("PIN salah."); setPin(null); return; }
    setErr(null); setData(await r.json());
  }, [setPin]);

  useEffect(() => {
    if (!pin) return;
    muat(pin);
    const iv = setInterval(() => muat(pin), 5000);
    return () => clearInterval(iv);
  }, [pin, muat]);

  if (!pin) {
    return (
      <>
        <Bar />
        <div className="page page-full" style={{ maxWidth: 420 }}>
          <h1>Halaman fasilitator</h1>
          <p className="muted">Masukkan PIN untuk melihat data peserta.</p>
          {err && <div className="alert alert-danger">{err}</div>}
          <form onSubmit={(e) => { e.preventDefault(); setPin(input); }}>
            <input className="form-control" type="password" placeholder="PIN" value={input} onChange={(e) => setInput(e.target.value)} autoFocus />
            <button className="btn btn-primary btn-block" style={{ marginTop: 12 }}>Buka</button>
          </form>
        </div>
      </>
    );
  }

  const s = data?.statistik;
  return (
    <>
      <Bar><button className="top-btn" onClick={() => setPin(null)}>Kunci</button></Bar>
      <div className="page page-full">
        <h1>Data pengambilan eksperimen</h1>
        <p className="muted">Diperbarui otomatis setiap 5 detik. Semua data tersimpan di basis data Supabase (PostgreSQL).</p>
        {err && <div className="alert alert-danger">{err}</div>}
        {s && (
          <div className="stat-row">
            <div className="stat"><span className="muted">Peserta</span><b>{s.total}</b></div>
            <div className="stat"><span className="muted">Laki-laki</span><b>{s.laki}</b></div>
            <div className="stat"><span className="muted">Perempuan</span><b>{s.perempuan}</b></div>
            <div className="stat"><span className="muted">Selesai</span><b>{s.selesai}</b></div>
            <div className="stat"><span className="muted">Event interaksi</span><b>{s.events.toLocaleString("id-ID")}</b></div>
          </div>
        )}
        <div className="aksi-bawah" style={{ marginTop: 0, marginBottom: 20 }}>
          <Link className="btn btn-secondary" href="/fasilitator/heatmap">Heatmap &amp; zoning per halaman</Link>
        </div>
        <h3>Ekspor CSV</h3>
        <div className="export-row">
          {EKSPOR.map(([k, l]) => (
            <button key={k} type="button" className={"btn btn-sm " + (k === "dataset" ? "btn-primary" : "btn-secondary")}
              disabled={unduhan !== null} onClick={() => unduh(k)}>{unduhan === k ? "Mengunduh…" : l}</button>
          ))}
        </div>
        <h3>Peserta</h3>
        <div className="tabel-wrap">
          <table className="tabel">
            <thead><tr><th>Kode</th><th>Gender</th><th>Fakultas</th><th>Usia</th><th>Prodi</th><th>Progres</th><th>Posisi sekarang</th><th>Mulai</th><th>Selesai</th><th>Total durasi</th><th>Event</th><th>Terakhir aktif</th><th /></tr></thead>
            <tbody>
              {data?.peserta.length === 0 && <tr><td colSpan={13} className="muted">Belum ada peserta.</td></tr>}
              {data?.peserta.map((p) => (
                <tr key={p.kode}>
                  <td><b>{p.kode}</b></td>
                  <td>{p.gender || <span className="muted">belum isi</span>}</td>
                  <td>{FAKULTAS.find((x) => x.nama === p.fakultas)?.singkat || "–"}</td>
                  <td>{p.usia ?? "–"}</td>
                  <td>{p.prodi || "–"}</td>
                  <td style={{ minWidth: 140 }}>
                    <div className="progress"><span style={{ width: (100 * p.progres) / p.total + "%" }} /></div>
                    <span className="muted" style={{ fontSize: 12 }}>{p.progres}/{p.total}</span>
                  </td>
                  <td>{p.posisi}</td>
                  <td>{jam(p.created_at)}</td>
                  <td>{jam(p.times.selesai ?? null)}</td>
                  <td>{p.times.selesai ? <b>{durasi(p.times.selesai - p.created_at)}</b>
                    : <span className="muted">{durasi(Date.now() - p.created_at)} (berjalan)</span>}</td>
                  <td>{p.events.toLocaleString("id-ID")}</td>
                  <td>{jam(p.terakhir_aktif)}</td>
                  <td><Link className="btn btn-secondary btn-sm" href={"/fasilitator/" + p.kode}>Detail</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
