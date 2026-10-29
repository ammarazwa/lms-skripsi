"use client";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Bar, usePin } from "@/components/fasilitator";
import { HALAMAN_HEATMAP, PreviewHalaman } from "@/components/preview";
import { cssRamp, gambarHeat, RAMP_BIRU } from "@/components/heat";
import { CONFIG } from "@/lib/config";

type BarisZona = { zona: string; klik: number; peserta_klik: number; persen_peserta_klik: number; persen_peserta_melihat: number; rata_terlihat_s: number };
type Data = {
  n_peserta: number; n_dengan_zona: number; kode_tersedia: string[]; n_uji_tersembunyi: number; klik: { z: string; rx: number; ry: number; kode: string }[]; klik_tanpa_zona: number;
  zona: BarisZona[]; kurva: { kedalaman: number; persen_peserta: number }[];
};
type Kotak = { top: number; left: number; w: number; h: number };
type Mode = "klik" | "scroll" | "zoning";
type MetrikZona = "klik" | "waktu" | "lihat";

const NAMA_ZONA: Record<string, string> = {
  header: "Judul halaman", bar: "Bilah waktu", aksi: "Tombol bawah", "nav-soal": "Nomor soal", instruksi: "Instruksi TLX", topik: "Topik forum",
  "form-balasan": "Form balasan", "balasan-milik": "Balasan sendiri", "balasan-lain": "Balasan peserta lain",
  topbar: "Navbar atas", drawer: "Course index", breadcrumb: "Breadcrumb", footer: "Footer", modal: "Dialog konfirmasi", main: "Area kosong konten",
};
const namaZona = (z: string) => NAMA_ZONA[z] || (z.startsWith("par-") ? "Paragraf " + z.slice(4) : z.startsWith("que-") ? "Soal " + z.slice(4) : z.startsWith("tlx-") ? "Skala " + z.slice(4) : z.startsWith("tabel-") ? "Tabel " + z.slice(6) : z);

export default function Heatmap() {
  const [pin] = usePin();
  const [halaman, setHalaman] = useState("/kursus/blok/1/bacaan");
  const [gender, setGender] = useState("");
  const [bidang, setBidang] = useState("");
  const [uji, setUji] = useState(CONFIG.DEMO); // masa uji coba: kode uji ikut tampil
  const [kode, setKode] = useState("");
  const [mode, setMode] = useState<Mode>("klik");
  const [metrik, setMetrik] = useState<MetrikZona>("waktu");
  const [data, setData] = useState<Data | null>(null);
  const [kotak, setKotak] = useState<Record<string, Kotak>>({});
  const [tinggi, setTinggi] = useState(0);
  const [skala, setSkala] = useState(1);
  const [hover, setHover] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const info = HALAMAN_HEATMAP.find((h) => h.path === halaman)!;

  const muat = useCallback(async () => {
    if (!pin) return;
    const q = new URLSearchParams({ halaman, ...(gender && { gender }), ...(bidang && { bidang }), ...(uji && { uji: "1" }), ...(kode && { kode }) });
    const r = await fetch("/api/admin/heatmap?" + q, { headers: { "x-pin": pin }, cache: "no-store" });
    if (r.ok) setData(await r.json());
  }, [pin, halaman, gender, bidang, uji, kode]);
  useEffect(() => { muat(); }, [muat]);

  // ukur posisi zona di replika (koordinat tanpa skala)
  const ukur = useCallback(() => {
    const wrap = wrapRef.current, inner = innerRef.current;
    if (!wrap || !inner) return;
    const s = Math.min(1, wrap.clientWidth / info.lebar);
    const ir = inner.getBoundingClientRect();
    const k: Record<string, Kotak> = {};
    inner.querySelectorAll<HTMLElement>("[data-zona]").forEach((el) => {
      const r = el.getBoundingClientRect();
      k[el.dataset.zona!] = { top: (r.top - ir.top) / s, left: (r.left - ir.left) / s, w: r.width / s, h: r.height / s };
    });
    const pg = inner.querySelector<HTMLElement>(".page");
    if (pg) { const r = pg.getBoundingClientRect(); k.main = { top: 0, left: 0, w: r.width / s, h: r.height / s }; }
    setSkala(s); setKotak(k); setTinggi(pg ? pg.getBoundingClientRect().height / s : 0);
  }, [info.lebar]);
  useLayoutEffect(() => { ukur(); }, [ukur, halaman, pin]);
  useEffect(() => {
    document.fonts?.ready.then(ukur);
    window.addEventListener("resize", ukur);
    return () => window.removeEventListener("resize", ukur);
  }, [ukur]);

  // heatmap klik
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !data) return;
    c.width = info.lebar; c.height = Math.max(1, tinggi);
    if (mode !== "klik") { c.getContext("2d")?.clearRect(0, 0, c.width, c.height); return; }
    const titik = data.klik.filter((p) => kotak[p.z]).map((p) => {
      const b = kotak[p.z];
      return { x: b.left + p.rx * b.w, y: b.top + p.ry * b.h };
    });
    gambarHeat(c, titik);
  }, [data, kotak, tinggi, mode, info.lebar]);

  const statZona = useMemo(() => Object.fromEntries((data?.zona || []).map((z) => [z.zona, z])), [data]);
  const totalKlik = data?.klik.length || 0;
  const klikLuar = (data?.klik || []).filter((p) => !kotak[p.z]).length;
  const nilaiZona = (z: BarisZona | undefined) => !z ? 0 : metrik === "klik" ? z.klik : metrik === "waktu" ? z.rata_terlihat_s : z.persen_peserta_melihat;
  const maksZona = Math.max(1e-9, ...Object.keys(kotak).map((k) => nilaiZona(statZona[k])));
  const labelZona = (z: BarisZona | undefined) => !z ? "–" : metrik === "klik" ? `${z.klik} klik · ${z.peserta_klik} peserta` : metrik === "waktu" ? `${z.rata_terlihat_s.toLocaleString("id-ID")} dtk` : `${z.persen_peserta_melihat.toLocaleString("id-ID")}% melihat`;
  // pita scroll: zona konten diurutkan dari atas
  const pita = Object.entries(kotak).filter(([k]) => k !== "main" && k !== "bar").sort((a, b) => a[1].top - b[1].top);

  if (pin === null) return <><Bar /><div className="page page-full"><Link href="/fasilitator">Masukkan PIN dulu</Link></div></>;
  const hz = hover ? statZona[hover] : undefined;

  return (
    <>
      <Bar><Link href="/fasilitator" className="top-btn">Semua peserta</Link></Bar>
      <div className="page page-full">
        <h1>Heatmap &amp; zoning</h1>
        <p className="muted">Posisi klik dicatat relatif terhadap zona (soal, paragraf, skala), sehingga data dari layar dengan resolusi berbeda tetap jatuh di tempat yang sama pada replika ini.</p>

        <div className="hm-filter">
          <label>Halaman
            <select className="form-control" value={halaman} onChange={(e) => setHalaman(e.target.value)}>
              {HALAMAN_HEATMAP.map((h) => <option key={h.path} value={h.path}>{h.nama}</option>)}
            </select>
          </label>
          <label>Peserta
            <select className="form-control" value={kode} onChange={(e) => setKode(e.target.value)}>
              <option value="">Semua (sesuai filter)</option>
              {(data?.kode_tersedia || []).map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </label>
          <label>Gender
            <select className="form-control" value={gender} onChange={(e) => setGender(e.target.value)} disabled={!!kode}>
              <option value="">Semua</option><option value="L">Laki-laki</option><option value="P">Perempuan</option>
            </select>
          </label>
          <label>Bidang
            <select className="form-control" value={bidang} onChange={(e) => setBidang(e.target.value)} disabled={!!kode}>
              <option value="">Semua</option><option value="STEM">STEM</option><option value="non-STEM">Non-STEM</option>
            </select>
          </label>
          <label className="hm-cek"><input type="checkbox" checked={uji} disabled={!!kode} onChange={(e) => setUji(e.target.checked)} /> Termasuk kode uji/pilot</label>
        </div>
        {!!data?.n_uji_tersembunyi && (
          <div className="alert alert-info">
            {data.n_uji_tersembunyi} peserta uji/pilot (kode T/PL) membuka halaman ini tetapi disembunyikan.
            Centang &quot;Termasuk kode uji/pilot&quot; atau pilih kodenya di &quot;Peserta&quot; untuk melihatnya.
          </div>
        )}

        <div className="hm-filter">
          <div className="hm-tab" role="tablist">
            {(["klik", "scroll", "zoning"] as Mode[]).map((m) => (
              <button key={m} role="tab" aria-selected={mode === m} className={mode === m ? "aktif" : ""} onClick={() => setMode(m)}>
                {m === "klik" ? "Heatmap klik" : m === "scroll" ? "Heatmap scroll" : "Zoning"}
              </button>
            ))}
          </div>
          {mode === "zoning" && (
            <label>Metrik zona
              <select className="form-control" value={metrik} onChange={(e) => setMetrik(e.target.value as MetrikZona)}>
                <option value="waktu">Rata-rata waktu terlihat</option><option value="klik">Jumlah klik</option><option value="lihat">% peserta melihat</option>
              </select>
            </label>
          )}
        </div>

        <div className="stat-row">
          <div className="stat"><span className="muted">Peserta di halaman ini</span><b>{data?.n_peserta ?? "–"}</b>{data && data.n_dengan_zona < data.n_peserta && <span className="muted" style={{ fontSize: 12 }}>{data.n_dengan_zona} punya data zona (dasar persentase)</span>}</div>
          <div className="stat"><span className="muted">Klik di replika</span><b>{totalKlik - klikLuar}</b></div>
          <div className="stat"><span className="muted">Klik di luar replika</span><b>{klikLuar}</b><span className="muted" style={{ fontSize: 12 }}>navbar, course index, dialog</span></div>
          <div className="stat"><span className="muted">Klik tanpa data zona</span><b>{data?.klik_tanpa_zona ?? 0}</b><span className="muted" style={{ fontSize: 12 }}>data sebelum logger zona</span></div>
        </div>

        <div className="hm-grid">
          <div ref={wrapRef} className="hm-wrap" style={{ height: tinggi * skala || undefined }}>
            <div ref={innerRef} className="hm-inner" style={{ width: info.lebar, transform: `scale(${skala})` }}>
              <div className="page hm-replika"><PreviewHalaman path={halaman} /></div>
              <canvas ref={canvasRef} className="hm-canvas" />
              {mode === "scroll" && pita.map(([z, b], i) => {
                const akhir = i + 1 < pita.length ? pita[i + 1][1].top : tinggi;
                const pct = statZona[z]?.persen_peserta_melihat ?? 0;
                return (
                  <div key={z} className="hm-pita" style={{ top: b.top, height: Math.max(b.h, akhir - b.top), background: cssRamp(pct / 100, 0.42) }}>
                    <span className="hm-chip">{pct.toLocaleString("id-ID")}%</span>
                  </div>
                );
              })}
              {mode === "zoning" && Object.entries(kotak).filter(([z]) => z !== "main").map(([z, b]) => {
                const v = nilaiZona(statZona[z]) / maksZona;
                return (
                  <div key={z} className="hm-zona" style={{ top: b.top, left: b.left, width: b.w, height: b.h, background: cssRamp(v, 0.06 + v * 0.28), borderColor: cssRamp(Math.max(v, 0.35)) }}>
                    <span className="hm-chip">{labelZona(statZona[z])}</span>
                  </div>
                );
              })}
              {Object.entries(kotak).filter(([z]) => z !== "main").map(([z, b]) => (
                <div key={"h-" + z} className={"hm-hit" + (hover === z ? " aktif" : "")} style={{ top: b.top, left: b.left, width: b.w, height: b.h }}
                  onMouseEnter={() => setHover(z)} onMouseLeave={() => setHover((x) => (x === z ? null : x))} />
              ))}
            </div>
          </div>

          <aside className="hm-panel">
            <div className="card">
              <h3>{mode === "klik" ? "Kepadatan klik" : mode === "scroll" ? "% peserta yang melihat bagian ini" : metrik === "klik" ? "Jumlah klik per zona" : metrik === "waktu" ? "Rata-rata waktu terlihat per peserta" : "% peserta melihat zona"}</h3>
              <div className="hm-legenda" style={{ background: `linear-gradient(90deg, ${RAMP_BIRU.join(",")})` }} />
              <div className="hm-legenda-label"><span>{mode === "scroll" ? "0%" : "rendah"}</span><span>{mode === "scroll" ? "100%" : "tinggi"}</span></div>
            </div>
            <div className="card">
              <h3>{hover ? namaZona(hover) : "Arahkan kursor ke zona"}</h3>
              {hover && (
                <table className="tabel"><tbody>
                  <tr><td>Klik</td><td><b>{hz?.klik ?? 0}</b></td></tr>
                  <tr><td>Peserta yang mengklik</td><td><b>{hz?.peserta_klik ?? 0}</b> ({(hz?.persen_peserta_klik ?? 0).toLocaleString("id-ID")}%)</td></tr>
                  <tr><td>Peserta yang melihat</td><td><b>{(hz?.persen_peserta_melihat ?? 0).toLocaleString("id-ID")}%</b></td></tr>
                  <tr><td>Rata-rata terlihat</td><td><b>{(hz?.rata_terlihat_s ?? 0).toLocaleString("id-ID")} dtk</b></td></tr>
                </tbody></table>
              )}
            </div>
            <div className="card">
              <h3>Jangkauan scroll</h3>
              <p className="muted" style={{ fontSize: 12 }}>% peserta yang layarnya pernah mencapai kedalaman halaman</p>
              {(data?.kurva || []).filter((k) => k.kedalaman % 10 === 0 && k.kedalaman > 0).map((k) => (
                <div className="hm-kurva" key={k.kedalaman} title={`Kedalaman ${k.kedalaman}%: ${k.persen_peserta}% peserta`}>
                  <span className="muted">{k.kedalaman}%</span>
                  <span className="hm-kurva-bar"><span style={{ width: k.persen_peserta + "%" }} /></span>
                  <span>{k.persen_peserta.toLocaleString("id-ID")}%</span>
                </div>
              ))}
            </div>
          </aside>
        </div>

        <div className="dash-head" style={{ marginTop: 24 }}>
          <h3 style={{ margin: 0 }}>Tabel zona</h3>
          {pin && <a className="btn btn-secondary btn-sm" href={"/api/admin/heatmap?" + new URLSearchParams({ halaman, pin, format: "csv", ...(gender && { gender }), ...(bidang && { bidang }), ...(uji && { uji: "1" }) })}>Ekspor CSV</a>}
        </div>
        <div className="tabel-wrap">
          <table className="tabel">
            <thead><tr><th>Zona</th><th>Klik</th><th>Peserta mengklik</th><th>% peserta mengklik</th><th>% peserta melihat</th><th>Rata-rata terlihat (dtk)</th></tr></thead>
            <tbody>
              {(data?.zona.length ?? 0) === 0 && <tr><td colSpan={6} className="muted">Belum ada data untuk filter ini.</td></tr>}
              {[...(data?.zona || [])].sort((a, b) => b.rata_terlihat_s - a.rata_terlihat_s || b.klik - a.klik).map((z) => (
                <tr key={z.zona} onMouseEnter={() => setHover(z.zona)}>
                  <td>{namaZona(z.zona)}{!kotak[z.zona] && <span className="muted"> (di luar replika)</span>}</td>
                  <td>{z.klik}</td><td>{z.peserta_klik}</td>
                  <td>{z.persen_peserta_klik.toLocaleString("id-ID")}</td><td>{z.persen_peserta_melihat.toLocaleString("id-ID")}</td>
                  <td>{z.rata_terlihat_s.toLocaleString("id-ID")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
