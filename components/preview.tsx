"use client";
/* Replika read-only halaman peserta untuk heatmap fasilitator. Memakai komponen konten yang sama dengan halaman peserta
 * (konten-view.tsx) sehingga zona (data-zona) dan tata letaknya identik; tanpa timer, redirect, maupun pencatatan. */
import { Ikon } from "./shell";
import { InstruksiTlx, KartuSoal, SkalaTlx, TeksBahan } from "./konten-view";
import { BLOK, TLX } from "@/lib/konten";

/** Halaman Bacaan + soal per blok × nomor; nama memuat level Bloom (khusus fasilitator, tidak tampil ke peserta). */
const halamanSoal = (b: number) => [
  ...(BLOK[b].bahan ? [{ path: `/kursus/blok/${b}/bacaan`, nama: `${BLOK[b].nama} · Bacaan`, lebar: 1290 }] : []),
  ...BLOK[b].soal.map((q, i) => ({
    path: `/kursus/blok/${b}/${i + 1}`,
    nama: `${BLOK[b].nama} · soal ${i + 1}` + (b > 0 ? ` (${q.level}${q.mandiri ? ", mandiri" : ""})` : ""),
    lebar: 1290,
  })),
];

function BarReplika({ b, aktif }: { b: number; aktif: number | "bacaan" }) {
  const data = BLOK[b];
  return (
    <div className="sticky-bar" data-zona="bar" style={{ position: "static" }}>
      <nav className="nav-soal" data-zona="nav-soal">
        {data.bahan && <a className={"nav-bacaan" + (aktif === "bacaan" ? " aktif" : "")}>Bacaan</a>}
        {data.soal.map((s, i) => <a key={s.id} className={i + 1 === aktif ? "aktif" : undefined}>{i + 1}</a>)}
      </nav>
      <span className="spacer" />
      <span className="muted">0/{data.soal.length} terjawab</span>
      <span>Sisa waktu</span><span className="sisa">00:00</span><span className="btn btn-primary btn-sm">Kirim jawaban</span>
    </div>
  );
}

export const HALAMAN_HEATMAP = [
  ...[0, 1, 2, 3].flatMap(halamanSoal),
  { path: "/kursus/tlx/0", nama: "NASA-TLX latihan", lebar: 1290 },
  { path: "/kursus/tlx/1", nama: "NASA-TLX Blok 1", lebar: 1290 },
  { path: "/kursus/tlx/2", nama: "NASA-TLX Blok 2", lebar: 1290 },
  { path: "/kursus/tlx/3", nama: "NASA-TLX Blok 3", lebar: 1290 },
  { path: "/kursus/forum", nama: "Forum diskusi", lebar: 985 },
];

export function PreviewHalaman({ path }: { path: string }) {
  const bacaan = path.match(/^\/kursus\/blok\/(\d)\/bacaan$/);
  const soal = path.match(/^\/kursus\/blok\/(\d)\/(\d+)$/);
  const tlx = path.match(/^\/kursus\/tlx\/(\d)$/);
  const kepala = (b: number) => (
    <div className="page-header" data-zona="header">
      <Ikon tipe="quiz" besar />
      <div><h1>{b === 0 ? BLOK[b].judul : BLOK[b].nama}</h1><p className="sub">{BLOK[b].pengantar}</p></div>
    </div>
  );
  if (bacaan) {
    const b = Number(bacaan[1]);
    return (
      <>
        {kepala(b)}
        <BarReplika b={b} aktif="bacaan" />
        <div className="soal-split tunggal"><div className="panel-bacaan"><TeksBahan b={b} /></div></div>
        <div className="nav-bawah bacaan-bawah" data-zona="aksi"><span /><span className="btn btn-primary">Lanjut ke soal</span></div>
      </>
    );
  }
  if (soal) {
    const b = Number(soal[1]), no = Number(soal[2]), data = BLOK[b], q = data.soal[no - 1];
    return (
      <>
        {kepala(b)}
        <BarReplika b={b} aktif={no} />
        <div className="soal-split tunggal">
          <div className="panel-soal" style={{ position: "static" }}>
            <KartuSoal q={q} qi={no - 1} nilai={undefined} />
            <div className="nav-bawah" data-zona="aksi">
              {no > 1 || data.bahan ? <span className="btn btn-secondary">Sebelumnya</span> : <span />}
              <span className="btn btn-primary">{no < data.soal.length ? "Berikutnya" : "Kirim jawaban dan selesai"}</span>
            </div>
          </div>
        </div>
      </>
    );
  }
  if (tlx) {
    const b = Number(tlx[1]);
    return (
      <>
        <div className="page-header" data-zona="header">
          <Ikon tipe="feedback" besar />
          <div><h1>NASA Task Load Index — {b === 0 ? "latihan" : BLOK[b].nama}</h1><p className="sub">Nilai tugas yang baru saja kamu kerjakan.</p></div>
        </div>
        <InstruksiTlx />
        <div>{TLX.skala.map((s) => <SkalaTlx key={s.id} s={s} nilai={undefined} />)}</div>
        <p className="muted ket">Sumber instrumen: {TLX.sumber}</p>
        <div className="aksi-bawah" data-zona="aksi"><span className="btn btn-primary btn-lg">Kirim penilaian</span></div>
      </>
    );
  }
  if (path === "/kursus/forum") {
    return (
      <>
        <div className="page-header" data-zona="header"><Ikon tipe="forum" besar /><div><h1>Forum diskusi</h1><p className="sub">Forum tanya jawab</p></div></div>
        <article className="forum-post topik" data-zona="topik">
          <span className="fp-avatar peneliti">TP</span>
          <div className="fp-body"><div className="fp-subject">Diskusi: hasil kegiatan hari ini</div><div className="fp-meta">oleh Tim Peneliti</div>
            <div className="fp-isi">Bagikan pengalamanmu di sini: blok mana yang paling menantang menurutmu, dan strategi apa yang kamu pakai untuk mengerjakannya?</div></div>
        </article>
        <div className="card" data-zona="form-balasan">
          <h3>Balas</h3><label className="form-label">Pesan</label>
          <textarea className="form-control" rows={7} readOnly placeholder="Tulis balasanmu..." />
          <div className="aksi-bawah" style={{ marginTop: 14 }}><span className="btn btn-primary">Kirim ke forum</span></div>
        </div>
        <article className="forum-post milik balasan" data-zona="balasan-milik">
          <span className="fp-avatar">P</span><div className="fp-body"><div className="fp-subject">Re: Diskusi: hasil kegiatan hari ini</div><div className="fp-isi">(balasan peserta)</div></div>
        </article>
        <div className="aksi-bawah" data-zona="aksi"><span className="btn btn-primary btn-lg">Lanjut ke Penutup</span></div>
      </>
    );
  }
  return null;
}
