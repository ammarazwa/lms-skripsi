"use client";
/* Sesi peserta + perekam interaksi (logger first-party).
 * Event yang direkam: click, key (kategori tombol, bukan isi), paste/cut/copy, change, focus, scroll, jarak mouse/detik,
 * visibilitas tab, blur/focus jendela, pv (page view), back (tombol kembali browser), dan penanda aktivitas. */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CONFIG } from "@/lib/config";

export type State = {
  peserta: { kode: string; gender: string | null; consent_at: number | null; [k: string]: unknown };
  times: Record<string, number>;
  draf: Record<string, unknown>;
  pairs: { urutan: string[][]; pilihan: string[] } | null;
  serverNow: number;
};

type Ctx = {
  kode: string | null;
  state: State | null;
  loading: boolean;
  skew: number;
  masuk: (kode: string) => Promise<string | null>;
  keluar: () => void;
  post: (url: string, body: Record<string, unknown>) => Promise<State | null>;
  simpanDraf: (blok: number, data: unknown, tundaMs?: number) => void;
  refresh: () => Promise<void>;
  ev: (tipe: string, data?: Record<string, unknown>) => void;
};

const SesiCtx = createContext<Ctx | null>(null);
export const useSesi = () => useContext(SesiCtx)!;

type Ev = { t: number; pl: string; k: number; pg: string; b: number | null; e: string; d?: Record<string, unknown> };
const PL = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
let K = 0;
const antre: Ev[] = [];

function blokDari(path: string): number | null {
  const m = path.match(/\/kursus\/(?:blok|tlx)\/(\d)/);
  return m ? Number(m[1]) : null;
}

function bacaKode() {
  try { return localStorage.getItem("lms.kode"); } catch { return null; }
}

export function SesiProvider({ children }: { children: React.ReactNode }) {
  const [kode, setKode] = useState<string | null>(null);
  const [state, setState] = useState<State | null>(null);
  const [loading, setLoading] = useState(true);
  const [skew, setSkew] = useState(0);
  const pathname = usePathname();
  const router = useRouter();
  const pathRef = useRef(pathname);
  const kodeRef = useRef<string | null>(null);
  const skewRef = useRef(0);
  const pvTerakhir = useRef<{ path: string; t: number } | null>(null);
  const layRef = useRef<((paksa?: boolean) => void) | null>(null);
  const tracked = !pathname.startsWith("/fasilitator");

  const terima = useCallback((s: State | null) => {
    if (s) { setState(s); setSkew(s.serverNow - Date.now()); skewRef.current = s.serverNow - Date.now(); }
  }, []);

  const ev = useCallback((tipe: string, data?: Record<string, unknown>) => {
    if (!kodeRef.current || pathRef.current.startsWith("/fasilitator")) return;
    antre.push({ t: Date.now(), pl: PL, k: K++, pg: pathRef.current, b: blokDari(pathRef.current), e: tipe, d: data });
  }, []);

  const flush = useCallback((beacon = false) => {
    if (!kodeRef.current || !antre.length) return;
    const batch = antre.splice(0, 500);
    // waktu event dikonversi ke jam server saat dikirim (selisih jam PC lab dikoreksi; selisih sudah diketahui setelah
    // /api/state pertama), supaya sejajar dengan timestamp langkah yang dicatat server
    const body = JSON.stringify({ kode: kodeRef.current, events: batch.map((e) => ({ ...e, t: e.t + skewRef.current })) });
    if (beacon && navigator.sendBeacon) {
      if (navigator.sendBeacon("/api/events", new Blob([body], { type: "text/plain" }))) return;
    }
    fetch("/api/events", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } })
      .then((r) => { if (!r.ok) throw new Error(); })
      .catch(() => antre.unshift(...batch));
  }, []);

  const refresh = useCallback(async () => {
    const k = kodeRef.current;
    if (!k) { setLoading(false); return; }
    const r = await fetch("/api/state?kode=" + encodeURIComponent(k), { cache: "no-store" }).catch(() => null);
    if (!r) { setLoading(false); return; } // server sedang tidak terjangkau; state lama tetap dipakai
    if (r.ok) terima(await r.json());
    else if (r.status === 404) { try { localStorage.removeItem("lms.kode"); } catch { } kodeRef.current = null; setKode(null); setState(null); }
    setLoading(false);
  }, [terima]);

  useEffect(() => {
    const k = bacaKode();
    kodeRef.current = k; setKode(k);
    refresh();
  }, [refresh]);

  const masuk = useCallback(async (k: string) => {
    const r = await fetch("/api/masuk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kode: k }) });
    const j = await r.json();
    if (!r.ok) return j.error || "Gagal masuk.";
    try { localStorage.setItem("lms.kode", j.peserta.kode); } catch { }
    kodeRef.current = j.peserta.kode; setKode(j.peserta.kode); terima(j);
    ev("login");
    return null;
  }, [terima, ev]);

  const keluar = useCallback(() => {
    ev("logout"); flush(true);
    try { localStorage.removeItem("lms.kode"); } catch { }
    kodeRef.current = null; setKode(null); setState(null);
    router.push("/");
  }, [ev, flush, router]);

  const post = useCallback(async (url: string, body: Record<string, unknown>) => {
    flush();
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kode: kodeRef.current, ...body }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { alert(j.error || "Terjadi kesalahan. Panggil fasilitator."); return null; }
    if (j && j.peserta) { terima(j); return j as State; }
    return null;
  }, [flush, terima]);

  // Draf disimpan ke state lokal seketika (supaya tidak hilang saat pindah halaman), lalu dikirim ke server (debounce per blok).
  const drafT = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const simpanDraf = useCallback((blok: number, data: unknown, tundaMs = 0) => {
    setState((s) => (s ? { ...s, draf: { ...s.draf, [String(blok)]: data } } : s));
    clearTimeout(drafT.current[blok]);
    const kirim = () => {
      delete drafT.current[blok];
      fetch("/api/draf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kode: kodeRef.current, blok, data }), keepalive: true }).catch(() => { });
    };
    if (tundaMs > 0) drafT.current[blok] = setTimeout(kirim, tundaMs); else kirim();
  }, []);

  // page view
  useEffect(() => {
    pathRef.current = pathname;
    if (!tracked) return;
    const now = Date.now(), last = pvTerakhir.current;
    if (last && last.path === pathname && now - last.t < 1000) return; // efek ganda (StrictMode/dev) bukan kunjungan baru
    pvTerakhir.current = { path: pathname, t: now };
    ev("pv", { path: pathname, w: window.innerWidth, h: window.innerHeight });
    const tm = setTimeout(() => layRef.current?.(true), 700);
    return () => clearTimeout(tm);
  }, [pathname, tracked, ev, kode]);

  // listener interaksi (dipasang sekali)
  useEffect(() => {
    const opt = { capture: true } as const;
    const onClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      const t = (el?.closest?.("a,button,input,select,textarea,label,[data-act]") as HTMLElement) || el;
      if (!t) return;
      const d: Record<string, unknown> = { x: Math.round(e.clientX), y: Math.round(e.clientY), py: Math.round(e.pageY), tg: t.tagName.toLowerCase() };
      if (t.id) d.id = t.id;
      const act = t.getAttribute("data-act"); if (act) d.act = act;
      if (t.tagName === "A") d.href = (t.getAttribute("href") || "").split("?")[0];
      if (t.tagName === "BUTTON" || t.tagName === "A") d.tx = (t.textContent || "").trim().slice(0, 40);
      // posisi relatif terhadap zona (data-zona) supaya heatmap tetap tepat walau resolusi layar PC berbeda
      const zEl = el?.closest?.("[data-zona]") as HTMLElement | null;
      const ref = zEl || (el?.closest?.("#region-main") as HTMLElement | null);
      if (ref) {
        const r = ref.getBoundingClientRect();
        d.z = zEl ? zEl.dataset.zona : "main";
        d.rx = Math.round((1000 * (e.clientX - r.left)) / Math.max(1, r.width)) / 1000;
        d.ry = Math.round((1000 * (e.clientY - r.top)) / Math.max(1, r.height)) / 1000;
      }
      ev("click", d);
    };
    const onKey = (e: KeyboardEvent) => {
      const key = e.key || "";
      let c = "o";
      if (key.length === 1) c = key === " " ? "s" : "c";
      else if (key === "Backspace") c = "b"; else if (key === "Delete") c = "d"; else if (key === "Enter") c = "e";
      else if (/^(Arrow|Home|End|Page|Tab)/.test(key)) c = "n";
      const t = e.target as HTMLInputElement;
      const f = t && (t.tagName === "TEXTAREA" || t.tagName === "INPUT") ? t.id || t.name || "" : "";
      ev("key", { c, f, m: e.ctrlKey || e.metaKey ? 1 : 0 });
    };
    const onClip = (e: Event) => ev(e.type, { f: (e.target as HTMLElement)?.id || "" });
    const onChange = (e: Event) => {
      const t = e.target as HTMLInputElement;
      if (!t) return;
      if (t.tagName === "TEXTAREA" || (t.tagName === "INPUT" && t.type === "text")) ev("field", { f: t.id, len: t.value.length, w: t.value.trim() ? t.value.trim().split(/\s+/).length : 0 });
      else ev("choice", { f: t.name || t.id, v: t.value });
    };
    const onFocus = (e: FocusEvent) => {
      const t = e.target as HTMLElement;
      if (t && /^(TEXTAREA|INPUT|SELECT)$/.test(t.tagName)) ev("focus", { f: t.id || (t as HTMLInputElement).name || "" });
    };
    let lastS = 0, maxY = 0, scrollPath = "", trail: ReturnType<typeof setTimeout> | undefined;
    const catatScroll = () => ev("scroll", { y: Math.round(window.scrollY), max: Math.round(maxY), dh: document.documentElement.scrollHeight, vh: window.innerHeight });
    const onScroll = () => {
      if (scrollPath !== pathRef.current) { scrollPath = pathRef.current; maxY = 0; }
      const t = Date.now(); maxY = Math.max(maxY, window.scrollY);
      if (t - lastS > 400) { lastS = t; catatScroll(); }
      clearTimeout(trail);
      trail = setTimeout(() => { lastS = Date.now(); catatScroll(); }, 250); // posisi akhir setelah scroll berhenti
    };
    // tata letak zona (posisi atas & tinggi tiap data-zona, koordinat halaman): untuk heatmap scroll & waktu terlihat
    let laySig = "";
    const snapshot = (paksa = false) => {
      if (!kodeRef.current || pathRef.current.startsWith("/fasilitator")) return;
      const dh = document.documentElement.scrollHeight, w = window.innerWidth, vh = window.innerHeight;
      const sig = pathRef.current + "|" + Math.round(dh / 20) + "|" + w + "|" + vh;
      if (!paksa && sig === laySig) return;
      laySig = sig;
      const zs = Array.from(document.querySelectorAll<HTMLElement>("[data-zona]")).map((z) => {
        const r = z.getBoundingClientRect();
        return [z.dataset.zona, Math.round(r.top + window.scrollY), Math.round(r.height)];
      });
      ev("lay", { dh, vh, w, y: Math.round(window.scrollY), zs });
    };
    layRef.current = snapshot;
    const ivLay = setInterval(() => snapshot(), 2000);
    let lx: number | null = null, ly = 0, dist = 0;
    const onMove = (e: MouseEvent) => { if (lx !== null) dist += Math.hypot(e.clientX - lx, e.clientY - ly); lx = e.clientX; ly = e.clientY; };
    const iv = setInterval(() => { if (dist > 0) { ev("mm", { d: Math.round(dist) }); dist = 0; } }, 1000);
    const onVis = () => { ev("vis", { st: document.visibilityState }); if (document.visibilityState === "hidden") flush(true); };
    const onBlur = () => ev("wblur");
    const onWFocus = () => ev("wfocus");
    const onPop = () => ev("back", { path: location.pathname });
    const onHide = () => { ev("leave"); flush(true); };
    document.addEventListener("click", onClick, opt);
    document.addEventListener("keydown", onKey, opt);
    ["paste", "cut", "copy"].forEach((tp) => document.addEventListener(tp, onClip, opt));
    document.addEventListener("change", onChange, opt);
    document.addEventListener("focusin", onFocus, opt);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onWFocus);
    window.addEventListener("popstate", onPop);
    window.addEventListener("pagehide", onHide);
    const fl = setInterval(() => flush(), CONFIG.FLUSH_MS);
    return () => {
      clearInterval(iv); clearInterval(fl); clearInterval(ivLay); clearTimeout(trail); layRef.current = null;
      document.removeEventListener("click", onClick, opt);
      document.removeEventListener("keydown", onKey, opt);
      ["paste", "cut", "copy"].forEach((tp) => document.removeEventListener(tp, onClip, opt));
      document.removeEventListener("change", onChange, opt);
      document.removeEventListener("focusin", onFocus, opt);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onWFocus);
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("pagehide", onHide);
    };
  }, [ev, flush]);

  const value = useMemo(() => ({ kode, state, loading, skew, masuk, keluar, post, simpanDraf, refresh, ev }), [kode, state, loading, skew, masuk, keluar, post, simpanDraf, refresh, ev]);
  return <SesiCtx.Provider value={value}>{children}</SesiCtx.Provider>;
}

/** Waktu server (ms) — dipakai untuk timer supaya jam PC yang salah tidak memengaruhi batas waktu. */
export function useNow(intervalMs = 500) {
  const { skew } = useSesi();
  const [t, setT] = useState(() => Date.now() + skew);
  useEffect(() => {
    setT(Date.now() + skew);
    const iv = setInterval(() => setT(Date.now() + skew), intervalMs);
    return () => clearInterval(iv);
  }, [skew, intervalMs]);
  return t;
}

export function mmss(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const p = (n: number) => (n < 10 ? "0" : "") + n;
  return p(Math.floor(s / 60)) + ":" + p(s % 60);
}
