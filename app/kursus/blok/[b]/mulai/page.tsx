"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { CRUMB_KURSUS, Shell } from "@/components/shell";
import { useSesi } from "@/components/sesi";
import { NEED_BLOK } from "@/components/util";
import { menit } from "@/lib/config";
import { BLOK } from "@/lib/konten";

const NAMA = ["LATIHAN", "BLOK SATU", "BLOK DUA", "BLOK TIGA"];

/* Penanda sesi sebelum blok dimulai — memudahkan memotong rekaman/log per blok. */
export default function MulaiBlok() {
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
  const t = state!.times;
  const data = BLOK[b];
  const need = NEED_BLOK[b];
  const tercatat = useRef(false);
  const boleh = data && b > 0 && (!need || t[need]);

  useEffect(() => {
    if (!data || b === 0) { router.replace("/kursus/blok/0/bacaan"); return; }
    if (t["b" + b] || t["b" + b + "_start"]) { router.replace("/kursus/blok/" + b + "/bacaan"); return; }
    if (boleh && !tercatat.current) { tercatat.current = true; ev("marker", { label: NAMA[b] }); post("/api/langkah", { kunci: "m" + b }); }
  }, [b, data, t, boleh, router, ev, post]);

  if (!data || b === 0) return null;
  if (!boleh) return <div className="alert alert-warning">Blok ini belum terbuka. Selesaikan aktivitas sebelumnya terlebih dahulu.</div>;

  async function mulai() {
    ev("block_go");
    const s = await post("/api/langkah", { kunci: "b" + b + "_start" });
    if (s) router.push("/kursus/blok/" + b + "/bacaan");
  }

  return (
    <>
      <div className="penanda" id="penanda-blok">
        <div className="penanda-atas">PENANDA SESI</div>
        <div className="penanda-blok">{NAMA[b]}</div>
        <div className="penanda-sub">{data.soal.length} SOAL · {menit(b)} MENIT</div>
        <div className="penanda-id">PESERTA {state!.peserta.kode}</div>
      </div>
      <div className="card">
        <p>{data.pengantar}</p>
        <p>Batas waktu: <b>{menit(b)} menit</b>, termasuk waktu membaca bahan. Waktu mulai dihitung saat kamu menekan tombol di bawah. Jawaban terkirim otomatis kalau waktu habis.</p>
        <button className="btn btn-primary btn-lg" id="btn-mulai-blok" onClick={mulai}>Mulai {data.nama}</button>
      </div>
    </>
  );
}
