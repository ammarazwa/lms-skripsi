"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/shell";
import { useSesi } from "@/components/sesi";
import { FAKULTAS } from "@/lib/konten";

/* Informed consent + demografi (Bab III 3.3.2). Gender dipakai sebagai variabel pengelompokan, bukan fitur model. */
export default function Persetujuan() {
  const { state, post } = useSesi();
  const router = useRouter();
  const p = state?.peserta;
  const [f, setF] = useState({
    setuju: false, gender: String(p?.gender || ""), bidang: String(p?.bidang || ""), fakultas: String(p?.fakultas || ""), usia: String(p?.usia || ""), prodi: String(p?.prodi || ""),
    angkatan: String(p?.angkatan || ""), frekuensi_lms: String(p?.frekuensi_lms || ""), perangkat: String(p?.perangkat || ""),
  });
  const [proses, setProses] = useState(false);
  const set = (k: string, v: string | boolean) => setF((x) => ({ ...x, [k]: v }));
  const lengkap = f.setuju && f.gender && f.fakultas && f.bidang && f.usia && f.prodi.trim() && f.angkatan && f.frekuensi_lms;

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    setProses(true);
    const s = await post("/api/demografi", { ...f, usia: Number(f.usia) });
    setProses(false);
    if (s) router.push("/dasbor");
  }

  return (
    <Shell drawer={false} butuhConsent={false} crumbs={[["Persetujuan partisipasi"]]}>
      <div className="page-header"><div><h1>Persetujuan partisipasi</h1><p className="sub">Baca dengan saksama sebelum memulai.</p></div></div>
      <div className="card">
        <h3>Tentang penelitian ini</h3>
        <p>Kamu diundang mengikuti penelitian skripsi tentang <b>beban kognitif dalam pembelajaran daring</b>. Selama sesi, kamu akan mengerjakan tiga blok soal penalaran dan pemahaman bergaya Tes Potensi Skolastik (TPS) UTBK. Setelah setiap blok kamu mengisi kuesioner NASA-TLX, dan di antara blok ada istirahat singkat.</p>
        <p>LMS ini merekam <b>pola interaksi</b> selama kamu belajar: durasi, klik, aktivitas mengetik (jumlah tombol, bukan isi ketikan di luar kolom jawaban), perpindahan halaman, dan gulir layar. Jawaban dan skor kuesioner disimpan dengan <b>kode peserta</b>, tanpa nama atau NPM.</p>
        <ul>
          <li>Partisipasi bersifat sukarela; kamu boleh berhenti kapan saja tanpa konsekuensi.</li>
          <li>Hasil tugas <b>tidak</b> memengaruhi nilai mata kuliah apa pun.</li>
          <li>Data hanya digunakan untuk keperluan penelitian dan dilaporkan secara agregat.</li>
          <li>Perkiraan durasi total sekitar 90 menit.</li>
        </ul>
      </div>
      <form onSubmit={kirim} className="card">
        <h3>Data partisipan</h3>
        <div className="form-row">
          <span className="form-label">Jenis kelamin</span>
          <div className="radio-row">
            {["Laki-laki", "Perempuan"].map((g) => (
              <label key={g} className="radio-chip"><input type="radio" name="gender" value={g} checked={f.gender === g} onChange={() => set("gender", g)} /> {g}</label>
            ))}
          </div>
        </div>
        <div className="grid-2">
          <div className="form-row">
            <label className="form-label" htmlFor="usia">Usia (tahun)</label>
            <input id="usia" className="form-control" type="number" min={15} max={60} value={f.usia} onChange={(e) => set("usia", e.target.value)} />
          </div>
          <div className="form-row">
            <label className="form-label" htmlFor="angkatan">Angkatan</label>
            <select id="angkatan" className="form-control" value={f.angkatan} onChange={(e) => set("angkatan", e.target.value)}>
              <option value="">Pilih…</option>
              {["2019", "2020", "2021", "2022", "2023", "2024", "2025", "2026"].map((a) => <option key={a}>{a}</option>)}
            </select>
          </div>
        </div>
        <div className="form-row">
          <label className="form-label" htmlFor="fakultas">Fakultas</label>
          <select id="fakultas" className="form-control" value={f.fakultas} onChange={(e) => {
            const fk = FAKULTAS.find((x) => x.nama === e.target.value);
            setF((x) => ({ ...x, fakultas: e.target.value, bidang: fk?.bidang ?? x.bidang }));
          }}>
            <option value="">Pilih…</option>
            {FAKULTAS.map((x) => <option key={x.nama} value={x.nama}>{x.nama}</option>)}
          </select>
        </div>
        <div className="form-row">
          <label className="form-label" htmlFor="prodi">Program studi</label>
          <input id="prodi" className="form-control" placeholder="Contoh: Teknik Informatika" value={f.prodi} onChange={(e) => set("prodi", e.target.value)} />
        </div>
        <div className="form-row">
          <span className="form-label">Rumpun program studi</span>
          <div className="radio-row">
            {[["STEM", "STEM (sains, teknologi, teknik, matematika, kesehatan)"], ["non-STEM", "Non-STEM (sosial, humaniora, ekonomi, hukum, seni)"]].map(([v, l]) => (
              <label key={v} className="radio-chip"><input type="radio" name="bidang" value={v} checked={f.bidang === v} onChange={() => set("bidang", v)} /> {l}</label>
            ))}
          </div>
        </div>
        <div className="grid-2">
          <div className="form-row">
            <label className="form-label" htmlFor="frek">Seberapa sering kamu memakai LMS (mis. LiVE)?</label>
            <select id="frek" className="form-control" value={f.frekuensi_lms} onChange={(e) => set("frekuensi_lms", e.target.value)}>
              <option value="">Pilih…</option>
              <option>Hampir setiap hari</option><option>Beberapa kali seminggu</option><option>Sekali seminggu</option><option>Jarang</option>
            </select>
          </div>
          <div className="form-row">
            <label className="form-label" htmlFor="perangkat">Perangkat input yang dipakai sekarang</label>
            <select id="perangkat" className="form-control" value={f.perangkat} onChange={(e) => set("perangkat", e.target.value)}>
              <option value="">Pilih…</option><option>Mouse</option><option>Touchpad</option>
            </select>
          </div>
        </div>
        <label className="radio-chip" style={{ marginTop: 6 }}>
          <input type="checkbox" checked={f.setuju} onChange={(e) => set("setuju", e.target.checked)} id="cek-setuju" />
          Saya telah membaca penjelasan di atas dan bersedia berpartisipasi secara sukarela.
        </label>
        <div className="aksi-bawah">
          <button className="btn btn-primary btn-lg" disabled={!lengkap || proses} id="btn-setuju">Setuju dan lanjutkan</button>
        </div>
      </form>
    </Shell>
  );
}
