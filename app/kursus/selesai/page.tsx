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
        <p style={{ marginBottom: 0 }}>Kamu sudah menyelesaikan seluruh rangkaian kegiatan. Semua jawaban dan kuesioner sudah tersimpan.</p>
      </div>
      {/* Debriefing: tujuan lengkap baru disampaikan di sini supaya rating NASA-TLX tidak terpengaruh dugaan tujuan penelitian. */}
      <div className="card" id="debriefing" data-zona="debriefing">
        <h3>Tentang tujuan penelitian ini</h3>
        <p>Penelitian ini meneliti apakah beban kognitif, yaitu beban mental saat mengerjakan tugas, dapat dikenali dari pola interaksimu di LMS, seperti durasi, klik, ketikan, dan perpindahan halaman. Skor NASA-TLX yang kamu isi dipakai sebagai acuan tingkat beban kognitif, dan tingkat kesulitan soal sengaja dibuat berbeda di setiap blok.</p>
        <p>Hasilnya juga dibandingkan antara kelompok peserta laki-laki dan perempuan untuk melihat apakah model bekerja sama baiknya pada kedua kelompok.</p>
        <p>Tujuan lengkap ini tidak disampaikan di awal supaya penilaianmu di NASA-TLX tidak terpengaruh oleh dugaan tentang tujuan penelitian. Datamu tetap disimpan dengan kode peserta tanpa nama.</p>
        <p>Kalau kamu tidak ingin datamu dipakai setelah mengetahui tujuan ini, hubungi peneliti di ammara23004@mail.unpad.ac.id atau 0811-8381-771 dengan menyebutkan kode pesertamu (<b>{state!.peserta.kode}</b>), dan datamu akan dihapus.</p>
        <p style={{ marginBottom: 0 }}>Mohon jangan ceritakan isi soal atau tujuan penelitian ini kepada teman yang belum ikut sampai pengambilan data selesai pada 13 November 2026.</p>
      </div>
      <div className="card">
        <p style={{ marginBottom: 0 }}>Setelah membaca penjelasan di atas, silakan angkat tangan atau beri tahu fasilitator, lalu tunggu arahan berikutnya. Jangan menutup halaman ini.</p>
      </div>
      <div className="aksi-bawah">
        <button className="btn btn-secondary" id="btn-akhiri-sesi" onClick={() => setAkhiri(true)}>Akhiri sesi (fasilitator)</button>
      </div>
      {akhiri && <ModalAkhiriSesi onBatal={() => setAkhiri(false)} />}
    </>
  );
}
