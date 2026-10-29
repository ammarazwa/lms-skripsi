"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { CRUMB_KURSUS, Ikon, Shell } from "@/components/shell";
import { useSesi } from "@/components/sesi";
import { BLOK } from "@/lib/konten";
import { KartuSoal } from "@/components/konten-view";
import { BarBlok, ModalBlok, SudahDikirim, hrefBacaan, hrefSoal, kunciSoalDibuka, kunciSoalTerakhir, tulisSesi, useBlok, type Jawab } from "@/components/blok";

/* Halaman soal gaya UTBK: satu soal per halaman (/kursus/blok/[b]/[no]) dengan nomor soal untuk berpindah. Bahan blok
 * dibaca dulu di halaman Bacaan (/kursus/blok/[b]/bacaan); soal baru bisa dibuka setelah waktu baca minimal, dan peserta
 * kembali ke bahan lewat "Bacaan" di nomor soal atau "Sebelumnya" di soal 1. Perpindahan antarhalaman membentuk
 * page_visits, u_turn_count, dan text_return_count; membuka lagi soal yang sudah pernah dibuka di blok yang sama dicatat
 * sebagai event `revisit` (fitur story_revisits). */
export default function HalSoal() {
  const p = useParams<{ b: string; no: string }>();
  const b = Number(p.b), no = Number(p.no);
  return (
    <Shell drawer={false} crumbs={[...CRUMB_KURSUS, [BLOK[b]?.nama || "Blok"]]}>
      <Isi b={b} no={no} />
    </Shell>
  );
}

/** Tandai soal `no` sudah dibuka; true bila sebelumnya sudah pernah dibuka (disimpan per tab, tahan reload). */
function sudahDibuka(kunci: string, no: number) {
  let daftar: number[] = [];
  try { daftar = JSON.parse(sessionStorage.getItem(kunci) || "[]"); } catch { /* storage tidak tersedia */ }
  if (daftar.includes(no)) return true;
  tulisSesi(kunci, JSON.stringify([...daftar, no]));
  return false;
}

function Isi({ b, no }: { b: number; no: number }) {
  const { state, post, ev } = useSesi();
  const router = useRouter();
  const blk = useBlok(b);
  const { data, n, t, jawab, ubah, kirim, bacaSelesai } = blk;
  const q = data?.soal[no - 1];
  const kode = state!.peserta.kode;
  const dilihat = useRef(false);
  const perluBaca = !!data?.bahan && !bacaSelesai;

  useEffect(() => {
    if (!data || t["b" + b]) return;
    if (!q) { router.replace(hrefSoal(b, 1)); return; }
    if (b > 0 && !t["b" + b + "_start"]) { router.replace(`/kursus/blok/${b}/mulai`); return; }
    if (b === 0 && !t.b0_start) post("/api/langkah", { kunci: "b0_start" }); // cadangan bila latihan tanpa bahan
    // soal baru boleh dibuka setelah waktu baca minimal di halaman Bacaan
    if (perluBaca) { router.replace(hrefBacaan(b)); return; }
    tulisSesi(kunciSoalTerakhir(kode, b), String(no));
    if (dilihat.current) return;
    dilihat.current = true;
    ev("block_view", { blok: b, no });
    if (sudahDibuka(kunciSoalDibuka(kode, b), no)) ev("revisit", { blok: b, no });
  }, [b, no, q, data, t, router, post, ev, kode, perluBaca]);

  if (!data) return <div className="alert alert-danger">Blok tidak ditemukan.</div>;
  if (t["b" + b]) return <SudahDikirim blk={blk} />;
  if (!q || perluBaca) return null;

  return (
    <>
      <div className="page-header" data-zona="header">
        <Ikon tipe="quiz" besar />
        <div><h1>{b === 0 ? data.judul : data.nama}</h1><p className="sub">{data.pengantar}</p></div>
      </div>
      <BarBlok blk={blk} aktif={no} />
      <form onSubmit={(e) => e.preventDefault()} id="form-blok" className="soal-split tunggal">
        <div className="panel-soal">
          <KartuSoal q={q} qi={no - 1} nilai={jawab[q.id]} onUbah={(v, tunda) => ubah(q.id, v as Jawab[string], tunda)} />
          <div className="nav-bawah" data-zona="aksi">
            {no > 1 ? <Link className="btn btn-secondary" id="btn-sebelumnya" href={hrefSoal(b, no - 1)}>Sebelumnya</Link>
              : data.bahan ? <Link className="btn btn-secondary" id="btn-sebelumnya" href={hrefBacaan(b)}>Sebelumnya</Link> : <span />}
            {no < n ? <Link className="btn btn-primary" id="btn-berikutnya" href={hrefSoal(b, no + 1)}>Berikutnya</Link>
              : <button className="btn btn-primary" id="btn-kirim" type="button" onClick={kirim}>Kirim jawaban dan selesai</button>}
          </div>
        </div>
      </form>
      <ModalBlok blk={blk} />
    </>
  );
}
