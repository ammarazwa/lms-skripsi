"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CRUMB_KURSUS, Ikon, Shell } from "@/components/shell";
import { useSesi } from "@/components/sesi";
import { CONFIG } from "@/lib/config";
import { BLOK, TLX } from "@/lib/konten";
import { InstruksiTlx, SkalaTlx } from "@/components/konten-view";

const LANJUT: Record<number, string> = { 0: "/kursus", 1: "/kursus/istirahat/1", 2: "/kursus/istirahat/2", 3: CONFIG.TLX_BOBOT ? "/kursus/bobot" : "/kursus/forum" };

export default function HalTlx() {
  const b = Number(useParams<{ b: string }>().b);
  return (
    <Shell drawer={false} crumbs={[...CRUMB_KURSUS, ["NASA-TLX " + (b === 0 ? "(latihan)" : BLOK[b]?.nama || "")]]}>
      <Isi b={b} />
    </Shell>
  );
}

function Isi({ b }: { b: number }) {
  const { state, post, ev, simpanDraf } = useSesi();
  const router = useRouter();
  const t = state!.times;
  const [nilai, setNilai] = useState<Record<string, number>>(() => (state!.draf[String(100 + b)] as Record<string, number>) || {});
  const [proses, setProses] = useState(false);
  const mulai = useRef(false);

  useEffect(() => {
    if (!t["b" + b]) return;
    if (t["tlx" + b]) { router.replace(LANJUT[b]); return; }
    if (!mulai.current) { mulai.current = true; ev("tlx_view", { blok: b }); if (!t["tlx" + b + "_start"]) post("/api/langkah", { kunci: "tlx" + b + "_start" }); }
  }, [b, t, router, ev, post]);

  if (!BLOK[b]) return <div className="alert alert-danger">Formulir tidak ditemukan.</div>;
  if (!t["b" + b]) return <div className="alert alert-warning">Formulir ini terbuka setelah {b === 0 ? "latihan" : BLOK[b].nama} selesai.</div>;

  const kurang = TLX.skala.filter((s) => nilai[s.id] === undefined).length;

  function pilih(id: string, v: number) {
    const n = { ...nilai, [id]: v };
    setNilai(n);
    ev("tlx_rate", { s: id, v });
    simpanDraf(100 + b, n);
  }

  async function kirim() {
    setProses(true);
    ev("tlx_submit", nilai);
    const s = await post("/api/tlx", { blok: b, nilai });
    setProses(false);
    if (s) router.push(LANJUT[b]);
  }

  return (
    <>
      <div className="page-header" data-zona="header">
        <Ikon tipe="feedback" besar />
        <div>
          <h1>NASA Task Load Index — {b === 0 ? "latihan" : BLOK[b].nama}</h1>
          <p className="sub">{b === 0 ? "Isian latihan: untuk membiasakan diri dengan formulir. Tidak dianalisis." : `Nilai tugas yang baru saja kamu kerjakan: ${BLOK[b].nama}.`}</p>
        </div>
      </div>
      <InstruksiTlx />
      <div id="tlx-form">
        {TLX.skala.map((sk) => <SkalaTlx key={sk.id} s={sk} nilai={nilai[sk.id]} onPilih={(v) => pilih(sk.id, v)} />)}
      </div>
      <p className="muted ket">Sumber instrumen: {TLX.sumber}</p>
      <div className="aksi-bawah" data-zona="aksi">
        <button className="btn btn-primary btn-lg" id="btn-kirim-tlx" disabled={kurang > 0 || proses} onClick={kirim}>Kirim penilaian</button>
        <span className="muted">{kurang ? `Masih ${kurang} skala belum diberi tanda.` : "Semua skala sudah diberi tanda."}</span>
      </div>
    </>
  );
}
