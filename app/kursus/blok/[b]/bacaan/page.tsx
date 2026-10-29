"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { CRUMB_KURSUS, Ikon, Shell } from "@/components/shell";
import { useSesi } from "@/components/sesi";
import { TeksBahan } from "@/components/konten-view";
import { BarBlok, ModalBlok, SudahDikirim, bacaSesi, hrefSoal, kunciSoalDibuka, kunciSoalTerakhir, useBlok } from "@/components/blok";
import { BLOK } from "@/lib/konten";

/* Halaman Bacaan: bahan blok (Teks A + Tabel B) dibaca dulu sebelum soal. Waktu baca minimal dihitung dari pembukaan
 * pertama (langkah b{b}_baca, waktu server); setelah itu peserta bisa kembali ke sini kapan saja lewat "Bacaan" di nomor
 * soal atau "Sebelumnya" di soal 1. Membuka Bacaan setelah ada soal yang dibuka dicatat sebagai event `baca_kembali`. */
export default function HalBacaan() {
  const b = Number(useParams<{ b: string }>().b);
  return (
    <Shell drawer={false} crumbs={[...CRUMB_KURSUS, [BLOK[b]?.nama || "Blok"]]}>
      <Isi b={b} />
    </Shell>
  );
}

function Isi({ b }: { b: number }) {
  const { state, post, ev } = useSesi();
  const router = useRouter();
  const blk = useBlok(b);
  const { data, t, bacaSelesai, sisaBacaMs } = blk;
  const kode = state!.peserta.kode;
  const dilihat = useRef(false);
  const kembaliKe = Number(bacaSesi(kunciSoalTerakhir(kode, b))) || 0;

  useEffect(() => {
    if (!data || t["b" + b]) return;
    if (!data.bahan) { router.replace(hrefSoal(b, 1)); return; }
    if (b > 0 && !t["b" + b + "_start"]) { router.replace(`/kursus/blok/${b}/mulai`); return; }
    if (b === 0 && !t.b0_start) post("/api/langkah", { kunci: "b0_start" });
    if (!t["b" + b + "_baca"]) post("/api/langkah", { kunci: "b" + b + "_baca" });
    if (dilihat.current) return;
    dilihat.current = true;
    ev("baca_view", { blok: b });
    if (bacaSesi(kunciSoalDibuka(kode, b))) ev("baca_kembali", { blok: b, dari: kembaliKe || null });
  }, [b, data, t, router, post, ev, kode, kembaliKe]);

  if (!data) return <div className="alert alert-danger">Blok tidak ditemukan.</div>;
  if (t["b" + b]) return <SudahDikirim blk={blk} />;
  if (!data.bahan) return null;

  const tujuan = kembaliKe || 1;
  const detik = Math.max(0, Math.ceil(sisaBacaMs / 1000));
  return (
    <>
      <div className="page-header" data-zona="header">
        <Ikon tipe="quiz" besar />
        <div><h1>{b === 0 ? data.judul : data.nama}</h1><p className="sub">{data.pengantar}</p></div>
      </div>
      <BarBlok blk={blk} aktif="bacaan" />
      <div className="soal-split tunggal">
        <div className="panel-bacaan"><TeksBahan b={b} /></div>
      </div>
      <div className="nav-bawah bacaan-bawah" data-zona="aksi">
        <span className="muted" id="info-baca">{bacaSelesai ? "" : `Soal dapat dibuka dalam ${detik} detik.`}</span>
        {bacaSelesai
          ? <Link className="btn btn-primary" id="btn-lanjut-soal" href={hrefSoal(b, tujuan)}
              onClick={() => ev("baca_lanjut", { blok: b, ke: tujuan })}>{kembaliKe ? `Kembali ke soal ${kembaliKe}` : "Lanjut ke soal"}</Link>
          : <button className="btn btn-primary" id="btn-lanjut-soal" type="button" disabled>Lanjut ke soal</button>}
      </div>
      <ModalBlok blk={blk} />
    </>
  );
}
