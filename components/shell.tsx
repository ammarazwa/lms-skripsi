"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CONFIG } from "@/lib/config";
import { kursus, type Item } from "@/lib/konten";
import { useSesi } from "./sesi";

/* ---------- ikon aktivitas (gaya Moodle 4: ubin pastel 30px) ---------- */
const IKON: Record<Item["tipe"], [string, string]> = {
  page: ["var(--ic-content)", '<path d="M7 3h7l5 5v13H7z" fill="none" stroke="#2c6aa0" stroke-width="1.8"/><path d="M14 3v5h5M9.5 13h7M9.5 16.5h7" stroke="#2c6aa0" stroke-width="1.8"/>'],
  quiz: ["var(--ic-assess)", '<path d="M9 7h10M9 12h10M9 17h10" stroke="#a8326e" stroke-width="1.8"/><circle cx="5.5" cy="7" r="1.3" fill="#a8326e"/><circle cx="5.5" cy="12" r="1.3" fill="#a8326e"/><circle cx="5.5" cy="17" r="1.3" fill="#a8326e"/>'],
  assign: ["var(--ic-assess)", '<path d="M5 19l1-4 9-9 3 3-9 9z" fill="none" stroke="#a8326e" stroke-width="1.8"/><path d="M13 8l3 3" stroke="#a8326e" stroke-width="1.8"/>'],
  feedback: ["var(--ic-comm)", '<path d="M6 18V11M11 18V7M16 18v-5M4 20h16" stroke="#1f7a46" stroke-width="2"/>'],
  forum: ["var(--ic-collab)", '<path d="M4 5h12v8H9l-4 3v-3H4z M18 9h2v8h-2v3l-3-3h-4" fill="none" stroke="#8a6414" stroke-width="1.6"/>'],
  break: ["var(--ic-collab)", '<path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z M16 10h2a2 2 0 0 1 0 4h-2" fill="none" stroke="#8a6414" stroke-width="1.8"/><path d="M8 3c0 2 2 2 2 4M12 3c0 2 2 2 2 4" stroke="#8a6414" stroke-width="1.5" fill="none"/>'],
};
export const NAMA_TIPE: Record<Item["tipe"], string> = { page: "Halaman", quiz: "Kuis", assign: "Tugas", feedback: "Kuesioner", forum: "Forum", break: "Istirahat" };

export function Ikon({ tipe, besar }: { tipe: Item["tipe"]; besar?: boolean }) {
  const [bg, svg] = IKON[tipe];
  const s = besar ? 28 : 19;
  return (
    <span className={"act-ikon" + (besar ? " besar" : "")} style={{ background: bg }}>
      <svg viewBox="0 0 24 24" width={s} height={s} aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />
    </span>
  );
}

export function terbuka(it: Item, t: Record<string, number>) {
  return !it.need || !!t[it.need];
}

function Topbar() {
  const { state } = useSesi();
  const path = usePathname();
  const [buka, setBuka] = useState(false);
  const [akhiri, setAkhiri] = useState(false);
  const kode = state?.peserta.kode;
  return (
    <header className="rui-topbar" data-zona="topbar">
      <Link href={kode ? "/dasbor" : "/"} className="rui-logo" aria-label="Beranda">
        <span className="logo-mark">Li<i>V</i>E</span>
        <span className="logo-text">UNPAD</span>
      </Link>
      <nav className="rui-nav">
        <Link href="/dasbor" className={path === "/dasbor" ? "aktif" : ""}>Dashboard</Link>
        <Link href="/kursus" className={path.startsWith("/kursus") ? "aktif" : ""}>My courses</Link>
      </nav>
      <div className="top-right">
        {CONFIG.DEMO && <span className="demo-pill">MODE DEMO</span>}
        <button className="top-btn" aria-label="Notifikasi" data-act="notif">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0" /></svg>
        </button>
        <button className="top-btn" aria-label="Pesan" data-act="pesan">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
        </button>
        {kode && (
          <button className="top-btn" onClick={() => setBuka(!buka)} data-act="user-menu" aria-label="Menu pengguna">
            <span className="avatar">{kode}</span>
          </button>
        )}
        {buka && kode && (
          <div className="user-menu" onMouseLeave={() => setBuka(false)}>
            <div className="um-head"><b>Peserta {kode}</b><div className="muted ket">{CONFIG.COURSE_NAME}</div></div>
            <button onClick={() => { setBuka(false); setAkhiri(true); }} data-act="keluar">Log out</button>
          </div>
        )}
        {akhiri && <ModalAkhiriSesi onBatal={() => setAkhiri(false)} />}
      </div>
    </header>
  );
}

function Drawer() {
  const { state } = useSesi();
  const path = usePathname();
  const t = state?.times || {};
  return (
    <aside className="drawer" aria-label="Course index" data-zona="drawer">
      <div className="drawer-judul">Course index</div>
      {kursus().map((s) => (
        <div key={s.id}>
          <div className="ci-sec">{s.nama}</div>
          {s.items.map((it) => {
            const open = terbuka(it, t);
            const done = it.done ? !!t[it.done] : false;
            const aktif = path === it.href || (it.href.endsWith("/mulai") && path.startsWith(it.href.replace("/mulai", "")));
            return (
              <Link key={it.id} href={it.href} className={"ci-item" + (open ? "" : " kunci") + (aktif ? " aktif" : "")} id={"ci-" + it.id}>
                <span className={"ci-dot" + (done ? " ok" : "")} />
                {it.nama}
              </Link>
            );
          })}
        </div>
      ))}
    </aside>
  );
}

function Footer() {
  return (
    <footer className="footer" data-zona="footer">
      <div className="footer-grid">
        <div><h4>Navigasi</h4><ul><li>Tentang kami</li><li>Website Unpad</li><li>Portal LiVE Unpad</li></ul></div>
        <div><h4>Layanan LMS</h4><ul><li>Panduan LMS LiVE Unpad</li><li>LMS MOOC Unpad</li></ul></div>
        <div><h4>Sumber Belajar</h4><ul><li>Kandaga Unpad</li><li>Repositori Unpad</li><li>Database Jurnal</li></ul></div>
        <div><h4>Kontak Peneliti</h4><ul><li>Kendala teknis? Angkat tangan,</li><li>fasilitator akan membantu.</li></ul></div>
      </div>
      <div className="footer-bottom">
        <span>Replika tampilan LiVE untuk penelitian skripsi Teknik Informatika FMIPA Unpad — bukan situs resmi LiVE Unpad.</span>
        <span>Data hanya dipakai untuk keperluan penelitian.</span>
      </div>
    </footer>
  );
}

export type Crumb = [string, string?];

/** Kerangka halaman peserta. Mengarahkan ke halaman masuk/persetujuan bila perlu. */
export function Shell({ children, crumbs, drawer = true, butuhConsent = true }: { children: React.ReactNode; crumbs?: Crumb[]; drawer?: boolean; butuhConsent?: boolean }) {
  const { state, loading, kode } = useSesi();
  const router = useRouter();
  useEffect(() => {
    if (loading) return;
    if (!kode || !state) router.replace("/");
    else if (butuhConsent && !state.peserta.consent_at) router.replace("/persetujuan");
  }, [loading, kode, state, butuhConsent, router]);
  const siap = !loading && state && (!butuhConsent || state.peserta.consent_at);
  return (
    <>
      <Topbar />
      <div className={"wrap" + (drawer ? "" : " fokus")}>
        {drawer && <Drawer />}
        <main className="page" id="region-main">
          {crumbs && (
            <ol className="breadcrumb" data-zona="breadcrumb">
              {crumbs.map(([label, href], i) => (
                <li key={i}>{href ? <Link href={href}>{label}</Link> : <span>{label}</span>}</li>
              ))}
            </ol>
          )}
          {siap ? children : <p className="muted">Memuat…</p>}
        </main>
      </div>
      <Footer />
    </>
  );
}

export function Modal({ judul, pesan, aksi }: { judul: string; pesan: string; aksi: { label: string; primary?: boolean; act: string; fn: () => void }[] }) {
  return (
    <div className="modal-bg">
      <div className="modal" role="dialog" aria-modal="true" data-zona="modal">
        <h3>{judul}</h3>
        <p>{pesan}</p>
        <div className="modal-aksi">
          {aksi.map((a) => (
            <button key={a.act} className={"btn " + (a.primary ? "btn-primary" : "btn-secondary")} data-act={a.act} onClick={a.fn}>{a.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Mengakhiri sesi peserta di PC ini — hanya fasilitator (butuh PIN). */
export function ModalAkhiriSesi({ onBatal }: { onBatal: () => void }) {
  const { keluar, ev } = useSesi();
  const [pin, setPin] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [proses, setProses] = useState(false);
  async function akhiri(e: React.FormEvent) {
    e.preventDefault();
    setProses(true); setErr(null);
    const r = await fetch("/api/admin/pin", { method: "POST", headers: { "x-pin": pin } });
    setProses(false);
    if (!r.ok) { setErr("PIN salah."); ev("akhiri_sesi_gagal"); return; }
    ev("akhiri_sesi", { oleh: "fasilitator" });
    keluar();
  }
  return (
    <div className="modal-bg">
      <form className="modal" role="dialog" aria-modal="true" onSubmit={akhiri} data-zona="modal">
        <h3>Akhiri sesi</h3>
        <p>Khusus fasilitator. Masukkan PIN untuk mengakhiri sesi peserta ini dan kembali ke halaman masuk.</p>
        {err && <div className="alert alert-danger">{err}</div>}
        <input className="form-control" type="password" id="pin-akhiri" placeholder="PIN fasilitator" value={pin} onChange={(e) => setPin(e.target.value)} autoFocus />
        <div className="modal-aksi">
          <button type="button" className="btn btn-secondary" data-act="batal-akhiri" onClick={onBatal}>Batal</button>
          <button className="btn btn-primary" data-act="konfirmasi-akhiri" disabled={!pin || proses}>Akhiri sesi</button>
        </div>
      </form>
    </div>
  );
}

export const CRUMB_KURSUS: Crumb[] = [["Dashboard", "/dasbor"], ["My courses", "/kursus"], [CONFIG.COURSE_NAME, "/kursus"]];
