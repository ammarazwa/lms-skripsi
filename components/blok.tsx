"use client";
/* Bagian yang sama untuk halaman Bacaan (/kursus/blok/[b]/bacaan) dan halaman soal (/kursus/blok/[b]/[no]) satu blok:
 * jawaban + autosave, kirim / kirim otomatis saat waktu habis, dan bilah waktu dengan nomor soal. Nomor soal, tombol
 * kirim, dan "Lanjut ke soal" baru aktif setelah waktu baca minimal (CONFIG.MIN_BACA_DETIK) sejak Bacaan pertama dibuka. */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Modal } from "@/components/shell";
import { mmss, useNow, useSesi } from "@/components/sesi";
import { sisa, sisaBaca } from "@/components/util";
import { BLOK } from "@/lib/konten";
import { terjawab } from "@/components/konten-view";

export type Jawab = Record<string, number | null | (number | null)[] | string>;

export const hrefBacaan = (b: number) => `/kursus/blok/${b}/bacaan`;
export const hrefSoal = (b: number, no: number) => `/kursus/blok/${b}/${no}`;

/** Nomor soal terakhir yang dibuka di blok ini (per tab), untuk tombol kembali dari Bacaan. */
export const kunciSoalTerakhir = (kode: string, b: number) => `soal-terakhir:${kode}:${b}`;
export const kunciSoalDibuka = (kode: string, b: number) => `soal-dibuka:${kode}:${b}`;

export function bacaSesi(kunci: string): string | null {
  try { return sessionStorage.getItem(kunci); } catch { return null; }
}
export function tulisSesi(kunci: string, nilai: string) {
  try { sessionStorage.setItem(kunci, nilai); } catch { /* storage tidak tersedia */ }
}

export function useBlok(b: number) {
  const { state, post, ev, simpanDraf } = useSesi();
  const router = useRouter();
  const now = useNow();
  const t = state!.times;
  const data = BLOK[b];
  const n = data?.soal.length ?? 0;
  const [jawab, setJawab] = useState<Jawab>(() => (state!.draf[String(b)] as Jawab) || {});
  const [modal, setModal] = useState<null | "kirim" | "habis">(null);
  const sudah = useRef(false);
  const jRef = useRef(jawab);
  jRef.current = jawab;

  function ubah(id: string, v: Jawab[string], tunda = false) {
    const j = { ...jRef.current, [id]: v };
    setJawab(j);
    if (!sudah.current) simpanDraf(b, j, tunda ? 700 : 0);
  }

  const final = useCallback(async (alasan: string) => {
    if (sudah.current) return;
    sudah.current = true;
    ev("block_end", { alasan });
    const s = await post("/api/blok", { blok: b, jawaban: jRef.current, alasan });
    if (s) setTimeout(() => router.push("/kursus/tlx/" + b), alasan === "timeout" ? 1800 : 100);
    else sudah.current = false;
  }, [b, ev, post, router]);

  const mulaiAda = !!t["b" + b + "_start"];
  const sisaMs = sisa(t, "b" + b + "_start", b, now);
  const sisaBacaMs = sisaBaca(t, b, now);
  const bacaSelesai = !!t["b" + b + "_baca"] && sisaBacaMs <= 0;

  // kirim otomatis saat waktu habis, di halaman Bacaan maupun halaman soal
  useEffect(() => {
    if (!mulaiAda || t["b" + b] || sudah.current) return;
    if (sisaMs <= 0) { setModal("habis"); final("timeout"); }
  }, [sisaMs, mulaiAda, t, b, final]);

  const nTerjawab = data ? data.soal.filter((s) => terjawab(s, jawab[s.id])).length : 0;
  const kirim = () => { ev("submit_click"); setModal("kirim"); };
  return { b, data, n, t, jawab, ubah, final, kirim, modal, setModal, mulaiAda, sisaMs, sisaBacaMs, bacaSelesai, nTerjawab };
}

export type Blk = ReturnType<typeof useBlok>;

/** Bilah waktu: [Bacaan] 1 2 … n, jumlah terjawab, sisa waktu, tombol kirim. Sebelum waktu baca minimal selesai, nomor soal
 * dan tombol kirim tampil nonaktif (abu-abu, tidak bisa diklik). */
export function BarBlok({ blk, aktif }: { blk: Blk; aktif: number | "bacaan" }) {
  const { b, data, n, jawab, bacaSelesai, nTerjawab, mulaiAda, sisaMs, kirim } = blk;
  return (
    <div className="sticky-bar" id="bar-waktu" data-zona="bar">
      <nav className="nav-soal" aria-label="Nomor soal" data-zona="nav-soal">
        {data.bahan && (
          <Link href={hrefBacaan(b)} id="nav-bacaan" aria-current={aktif === "bacaan" ? "page" : undefined}
            className={"nav-bacaan" + (aktif === "bacaan" ? " aktif" : "")}>Bacaan</Link>
        )}
        {data.soal.map((s, i) => {
          const cls = (terjawab(s, jawab[s.id]) ? "terjawab" : "") + (i + 1 === aktif ? " aktif" : "");
          return bacaSelesai
            ? <Link key={s.id} href={hrefSoal(b, i + 1)} id={"nav-soal-" + (i + 1)} aria-current={i + 1 === aktif ? "page" : undefined} className={cls}>{i + 1}</Link>
            : <span key={s.id} id={"nav-soal-" + (i + 1)} className="nonaktif" aria-disabled="true">{i + 1}</span>;
        })}
      </nav>
      <span className="spacer" />
      <span className="muted">{nTerjawab}/{n} terjawab</span>
      <span>Sisa waktu</span>
      <span className={"sisa" + (sisaMs < 60000 ? " kritis" : "")} id="sisa">{mulaiAda ? mmss(sisaMs) : "--:--"}</span>
      <button className="btn btn-primary btn-sm" id="btn-kirim-bar" type="button" onClick={kirim} disabled={!bacaSelesai}>Kirim jawaban</button>
    </div>
  );
}

export function ModalBlok({ blk }: { blk: Blk }) {
  const { data, n, nTerjawab, modal, setModal, final } = blk;
  if (modal === "kirim") {
    return (
      <Modal judul="Kirim jawaban?" pesan={`Kamu sudah menjawab ${nTerjawab} dari ${n} soal. Setelah dikirim, jawaban ${data.nama} tidak bisa diubah lagi.`} aksi={[
        { label: "Batal", act: "batal-kirim", fn: () => setModal(null) },
        { label: "Ya, kirim", primary: true, act: "konfirmasi-kirim", fn: () => { setModal(null); final("kirim"); } },
      ]} />
    );
  }
  if (modal === "habis") {
    return (
      <Modal judul="Waktu habis" pesan={`Waktu ${data.nama} sudah habis. Jawabanmu dikirim otomatis.`} aksi={[
        { label: "OK", primary: true, act: "ok-waktu-habis", fn: () => setModal(null) },
      ]} />
    );
  }
  return null;
}

export function SudahDikirim({ blk }: { blk: Blk }) {
  return (
    <div className="alert alert-info">
      <p>Jawaban {blk.data.nama} sudah dikirim.</p>
      <Link className="btn btn-primary btn-sm" href={"/kursus/tlx/" + blk.b}>Lanjut ke NASA-TLX</Link>
    </div>
  );
}
