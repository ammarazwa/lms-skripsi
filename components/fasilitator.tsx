"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export const EKSPOR = [
  ["dataset", "Dataset siap pipeline (P01–P60)"],
  ["dataset?semua=1", "Dataset termasuk uji/pilot"],
  ["peserta", "Peserta & demografi"],
  ["jawaban", "Jawaban"],
  ["tlx", "NASA-TLX rating"],
  ["bobot", "NASA-TLX bobot"],
  ["istirahat", "Istirahat"],
  ["forum", "Forum diskusi"],
  ["langkah", "Timestamp langkah"],
  ["events", "Log interaksi mentah"],
];

/** Durasi dalam format j:mm:ss (mis. 1:05:12) atau m:ss bila di bawah satu jam. */
export function durasi(ms: number | null) {
  if (ms === null || ms < 0) return "–";
  const s = Math.round(ms / 1000), j = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), d = s % 60;
  const p = (n: number) => (n < 10 ? "0" : "") + n;
  return j ? `${j}:${p(m)}:${p(d)}` : `${m}:${p(d)}`;
}

export function usePin() {
  const [pin, setPin] = useState<string | null>(null);
  useEffect(() => { try { setPin(sessionStorage.getItem("lms.pin")); } catch { setPin(null); } }, []);
  const simpan = (p: string | null) => { try { if (p) sessionStorage.setItem("lms.pin", p); else sessionStorage.removeItem("lms.pin"); } catch { } setPin(p); };
  return [pin, simpan] as const;
}

export function Bar({ children }: { children?: React.ReactNode }) {
  return (
    <header className="rui-topbar">
      <Link href="/fasilitator" className="rui-logo"><span className="logo-mark">Li<i>V</i>E</span><span className="logo-text">FASILITATOR</span></Link>
      <div className="top-right">{children}</div>
    </header>
  );
}

