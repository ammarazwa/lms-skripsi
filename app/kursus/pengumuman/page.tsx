"use client";
import Link from "next/link";
import { useEffect } from "react";
import { CRUMB_KURSUS, Ikon, Shell } from "@/components/shell";
import { useSesi } from "@/components/sesi";
import { lamaIstirahat, menit } from "@/lib/config";
import { BLOK } from "@/lib/konten";

export default function Pengumuman() {
  const { state, post } = useSesi();
  useEffect(() => { if (state && !state.times.pengumuman) post("/api/langkah", { kunci: "pengumuman" }); }, [state, post]);
  const rehat = lamaIstirahat();
  return (
    <Shell crumbs={[...CRUMB_KURSUS, ["Pengumuman"]]}>
      <div className="page-header"><Ikon tipe="forum" besar /><div><h1>Pengumuman</h1><p className="sub">Forum berita kursus</p></div></div>
      <article className="card">
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
          <span className="avatar" style={{ background: "var(--primary)", color: "#fff" }}>TP</span>
          <div><b>Tim Peneliti</b><div className="muted ket">Selamat datang di sesi hari ini</div></div>
        </div>
        <p>Terima kasih sudah bersedia ikut. Total sesi hari ini sekitar 90 menit, termasuk penjelasan awal.</p>
        <p>Urutannya: latihan singkat memakai LMS, lalu tiga blok soal bergaya Tes Potensi Skolastik (TPS) UTBK. Setiap blok berisi {BLOK[1].soal.length} soal pilihan ganda dan isian. Setelah setiap blok, kamu mengisi formulir NASA-TLX tentang beban kerja yang kamu rasakan.</p>
        <p>Setelah NASA-TLX Blok 1 dan Blok 2 ada <b>istirahat {rehat}</b>. Selama istirahat, lepaskan tangan dari mouse dan keyboard dan jangan menyentuh komputer. Kamu boleh mengobrol, minum, atau meregangkan badan. Akan ada bunyi singkat saat istirahat selesai.</p>
        <p>Di akhir sesi ada forum diskusi. Kirim satu balasan berisi hasil kegiatanmu; balasan peserta lain terlihat setelah kamu mengirim.</p>
        <p>Setiap blok punya batas waktu {menit(1)} menit. Setiap blok dimulai dengan bahan bacaan (teks dan tabel); soal bisa dibuka setelah waktu baca minimal, dan waktu baca termasuk dalam batas waktu blok. Soal tampil satu per halaman, dan kamu bisa pindah soal atau membuka bahan lagi kapan saja lewat nomor soal dan tombol Bacaan. Tidak ada nilai yang memengaruhi kuliahmu.</p>
        <p style={{ marginBottom: 0 }}>Kalau ada kendala teknis, angkat tangan dan fasilitator akan membantu.</p>
      </article>
      <Link href="/kursus" className="btn btn-secondary">Kembali ke kursus</Link>
    </Shell>
  );
}
