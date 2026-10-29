"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CRUMB_KURSUS, Shell } from "@/components/shell";
import { mmss, useNow, useSesi } from "@/components/sesi";
import { CONFIG } from "@/lib/config";
import { BLOK } from "@/lib/konten";

/* Istirahat setelah NASA-TLX Blok 1 & 2 (saran dosen pembimbing: mengurangi kejenuhan mengisi kuesioner).
 * Diletakkan SETELAH TLX supaya penilaian beban kerja tetap diberikan segera setelah tugas.
 * Durasinya sama untuk semua peserta (variabel kontrol) dan berada di luar segmen fitur blok.
 * Hands-off: peserta tidak menyentuh komputer selama istirahat; interaksi yang tetap terjadi dicatat logger
 * dan dihitung sebagai kepatuhan istirahat di halaman fasilitator. */

/** Bunyi pendek dua nada saat istirahat selesai (peserta sedang tidak melihat layar). */
function bunyi() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ac = new Ctx();
    [[660, 0], [880, 0.25]].forEach(([f, dt]) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.frequency.value = f; o.type = "sine";
      g.gain.setValueAtTime(0.0001, ac.currentTime + dt);
      g.gain.exponentialRampToValueAtTime(0.25, ac.currentTime + dt + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dt + 0.4);
      o.connect(g).connect(ac.destination);
      o.start(ac.currentTime + dt); o.stop(ac.currentTime + dt + 0.45);
    });
  } catch { /* audio tidak tersedia */ }
}

export default function HalIstirahat() {
  const ke = Number(useParams<{ ke: string }>().ke);
  return (
    <Shell drawer={false} crumbs={[...CRUMB_KURSUS, ["Istirahat " + ke]]}>
      <Isi ke={ke} />
    </Shell>
  );
}

function Isi({ ke }: { ke: number }) {
  const { state, post, ev } = useSesi();
  const router = useRouter();
  const now = useNow(250);
  const t = state!.times;
  const mulai = useRef(false);
  const [proses, setProses] = useState(false);
  const [teguran, setTeguran] = useState(0);
  const terakhirTegur = useRef(0);
  const sudahBunyi = useRef(false);
  const total = CONFIG.ISTIRAHAT_DETIK * 1000;
  const next = ke + 1;

  useEffect(() => {
    if (![1, 2].includes(ke) || !t["tlx" + ke]) return;
    if (t["rehat" + ke]) { router.replace("/kursus/blok/" + next + "/mulai"); return; }
    if (!mulai.current && !t["rehat" + ke + "_start"]) { mulai.current = true; ev("break_start", { ke }); post("/api/istirahat", { ke, aksi: "mulai" }); }
  }, [ke, t, next, router, ev, post]);

  const s = t["rehat" + ke + "_start"];
  const sisaMs = s ? Math.max(0, s + total - now) : total;
  const habis = !!s && sisaMs <= 0;

  // teguran bila mouse/keyboard disentuh selama istirahat
  useEffect(() => {
    if (!s || habis) return;
    const tegur = () => {
      const n = Date.now();
      if (n - terakhirTegur.current < 500) return;
      terakhirTegur.current = n; setTeguran(n);
    };
    const tipe = ["mousemove", "mousedown", "keydown", "wheel", "touchstart"];
    tipe.forEach((x) => window.addEventListener(x, tegur, { passive: true }));
    return () => tipe.forEach((x) => window.removeEventListener(x, tegur));
  }, [s, habis]);

  // bunyi sekali saat waktu istirahat habis
  useEffect(() => {
    if (habis && !sudahBunyi.current) {
      sudahBunyi.current = true;
      if (CONFIG.ISTIRAHAT_BUNYI) bunyi();
    }
  }, [habis]);

  if (![1, 2].includes(ke)) return <div className="alert alert-danger">Halaman tidak ditemukan.</div>;
  if (!t["tlx" + ke]) return <div className="alert alert-warning">Istirahat terbuka setelah NASA-TLX {BLOK[ke].nama} selesai.</div>;

  const frac = s ? Math.min(1, (total - sisaMs) / total) : 0;
  const R = 96, C = 2 * Math.PI * R;
  const tampilTeguran = !habis && Date.now() - teguran < 4000;

  async function lanjut(alasan: string) {
    setProses(true);
    ev("break_end", { ke, alasan });
    const r = await post("/api/istirahat", { ke, aksi: "selesai", alasan });
    setProses(false);
    if (r) router.push("/kursus/blok/" + next + "/mulai");
  }

  return (
    <div className="rehat">
      <h1 style={{ fontSize: 30 }}>{habis ? "Istirahat selesai" : "Istirahat"}</h1>
      {habis ? (
        <p>Silakan kembali ke komputer dan lanjutkan ke {BLOK[next].nama}.</p>
      ) : (
        <p style={{ fontSize: 17, maxWidth: 620, margin: "0 auto 8px" }}>
          <b>Lepaskan tangan dari mouse dan keyboard.</b> Jangan menyentuh komputer sampai waktu istirahat selesai.
          Kamu boleh mengobrol, minum, atau meregangkan badan.
        </p>
      )}
      <div className="rehat-ring">
        <svg width="220" height="220" viewBox="0 0 220 220">
          <circle cx="110" cy="110" r={R} stroke="var(--gray-200)" strokeWidth="14" fill="none" />
          <circle cx="110" cy="110" r={R} stroke="var(--primary)" strokeWidth="14" fill="none" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={C * frac} style={{ transition: "stroke-dashoffset .25s linear" }} />
        </svg>
        <div className="angka" id="sisa-istirahat">{mmss(sisaMs)}</div>
      </div>
      {tampilTeguran && (
        <div className="alert alert-warning" id="teguran-istirahat" style={{ maxWidth: 520, margin: "0 auto 12px" }}>
          Istirahat belum selesai. Lepaskan tangan dari mouse dan keyboard.
        </div>
      )}
      {!habis && <p className="muted">Akan ada bunyi singkat saat istirahat selesai.</p>}
      <div className="aksi-bawah" style={{ justifyContent: "center" }}>
        {habis && (
          <button className="btn btn-primary btn-lg" id="btn-lanjut-istirahat" disabled={proses} onClick={() => lanjut("selesai")}>
            Lanjut ke {BLOK[next].nama}
          </button>
        )}
        {CONFIG.DEMO && !habis && (
          <button className="btn btn-secondary" id="btn-lewati-demo" disabled={proses} onClick={() => lanjut("lewati_demo")}>Lewati (mode demo)</button>
        )}
      </div>
    </div>
  );
}
