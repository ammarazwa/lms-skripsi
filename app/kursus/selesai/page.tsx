"use client";
import { useEffect, useRef, useState } from "react";
import { CRUMB_KURSUS, ModalAkhiriSesi, Shell } from "@/components/shell";
import { useSesi } from "@/components/sesi";

export default function HalSelesai() {
  return (
    <Shell drawer={false} crumbs={[...CRUMB_KURSUS, ["Penutup"]]}>
      <Isi />
    </Shell>
  );
}

function Isi() {
  const { state, post, ev } = useSesi();
  const t = state!.times;
  const need = "forum";
  const done = useRef(false);
  const [akhiri, setAkhiri] = useState(false);
  useEffect(() => {
    if (t[need] && !t.selesai && !done.current) { done.current = true; ev("run_end"); post("/api/langkah", { kunci: "selesai" }); }
  }, [t, need, ev, post]);
  if (!t[need]) return <div className="alert alert-warning">Halaman ini terbuka setelah semua aktivitas selesai.</div>;
  return (
    <>
      <div className="penanda" id="penanda-selesai">
        <div className="penanda-atas">PENANDA SESI</div>
        <div className="penanda-blok">SELESAI</div>
        <div className="penanda-id">PESERTA {state!.peserta.kode}</div>
      </div>
      <div className="card">
        <h2>Terima kasih!</h2>
        <p>Kamu sudah menyelesaikan seluruh rangkaian kegiatan. Semua jawaban dan kuesioner sudah tersimpan.</p>
        <p style={{ marginBottom: 0 }}>Silakan angkat tangan atau beri tahu fasilitator, lalu tunggu arahan berikutnya. Jangan menutup halaman ini.</p>
      </div>
      <div className="aksi-bawah">
        <button className="btn btn-secondary" id="btn-akhiri-sesi" onClick={() => setAkhiri(true)}>Akhiri sesi (fasilitator)</button>
      </div>
      {akhiri && <ModalAkhiriSesi onBatal={() => setAkhiri(false)} />}
    </>
  );
}
