"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSesi } from "@/components/sesi";
import { CONFIG } from "@/lib/config";

export default function Masuk() {
  const { masuk, state, loading } = useSesi();
  const router = useRouter();
  const [kode, setKode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [proses, setProses] = useState(false);

  useEffect(() => {
    if (!loading && state) router.replace(state.peserta.consent_at ? "/dasbor" : "/persetujuan");
  }, [loading, state, router]);

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    setProses(true); setErr(null);
    const g = await masuk(kode.trim().toUpperCase());
    setProses(false);
    if (g) setErr(g);
  }

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-form">
          <div className="login-logo">
            <span className="logo-mark">Li<i>V</i>E</span>
            <span className="logo-text">UNPAD</span>
          </div>
          <h1>Masuk ke ruang eksperimen</h1>
          <p className="muted">Gunakan <b>kode peserta</b> yang diberikan fasilitator. Kamu tidak perlu memasukkan akun PAuS-ID atau kata sandi apa pun.</p>
          {err && <div className="alert alert-danger">{err}</div>}
          <form onSubmit={kirim}>
            <div className="form-row">
              <label className="form-label" htmlFor="kode">Kode peserta</label>
              <input id="kode" className="form-control" placeholder="Contoh: P01" value={kode} autoComplete="off"
                onChange={(e) => setKode(e.target.value.toUpperCase())} style={{ fontSize: 18, letterSpacing: 2, fontWeight: 700 }} />
            </div>
            <button className="btn btn-primary btn-lg btn-block" disabled={proses || !kode.trim()} id="btn-masuk">
              {proses ? "Memproses…" : "Log in"}
            </button>
          </form>
          <hr className="login-hr" />
          <p className="login-note">Kode yang berlaku: P01–P60 (peserta), T01–T99 (uji coba), PL01–PL99 (pilot).</p>
          <p className="login-note"><Link href="/fasilitator">Halaman fasilitator</Link></p>
        </div>
        <div className="login-bg">
          <h2>LiVE UNPAD</h2>
          <p>Belajar di Universitas Padjadjaran didukung oleh dosen yang berdedikasi, program yang beragam, dan aktivitas yang menarik.</p>
          <p style={{ fontSize: 12, opacity: .85, marginTop: 8 }}>{CONFIG.COURSE_CATEGORY}</p>
        </div>
      </div>
    </div>
  );
}
