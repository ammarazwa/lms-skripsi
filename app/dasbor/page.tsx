"use client";
import Link from "next/link";
import { Ikon, Shell, terbuka } from "@/components/shell";
import { useSesi } from "@/components/sesi";
import { CONFIG } from "@/lib/config";
import { semuaItem } from "@/lib/konten";

export default function Dasbor() {
  const { state } = useSesi();
  const t = state?.times || {};
  const items = semuaItem().filter((i) => i.done);
  const selesai = items.filter((i) => t[i.done!]).length;
  const pct = Math.round((100 * selesai) / items.length);
  const next = items.find((i) => !t[i.done!] && terbuka(i, t));
  return (
    <Shell drawer={false} crumbs={[["Dashboard"]]}>
      <div className="dash-head">
        <div>
          <h1 style={{ fontSize: 26 }}>Hai, Peserta {state?.peserta.kode}</h1>
          <p className="muted" style={{ margin: 0 }}>Selamat datang di ruang eksperimen. Mulai dari kursus di bawah.</p>
        </div>
      </div>
      <div className="grid-2" style={{ gridTemplateColumns: "2fr 1fr", alignItems: "start" }}>
        <div>
          <div className="card">
            <h3>Course overview</h3>
            <div className="course-grid" style={{ marginTop: 12 }}>
              <Link href="/kursus" className="course-card" id="kartu-kursus">
                <div className="course-img" />
                <div className="course-body">
                  <div className="course-cat">{CONFIG.COURSE_CATEGORY}</div>
                  <div className="course-name">{CONFIG.COURSE_NAME}</div>
                  <div className="progress"><span style={{ width: pct + "%" }} /></div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>{pct}% complete</div>
                </div>
              </Link>
            </div>
          </div>
        </div>
        <div>
          <div className="card">
            <h3>Timeline</h3>
            {next ? (
              <div className="timeline-item">
                <Ikon tipe={next.tipe} />
                <div style={{ flex: 1 }}>
                  <Link href={next.href} className="act-nama" id="timeline-next">{next.nama}</Link>
                  <div className="act-ket">{CONFIG.COURSE_NAME}</div>
                </div>
              </div>
            ) : <p className="muted">Tidak ada aktivitas tersisa.</p>}
          </div>
          <div className="card">
            <h3>Pengumuman</h3>
            <p className="muted" style={{ marginBottom: 0 }}>Baca pengumuman di dalam kursus sebelum memulai latihan.</p>
          </div>
        </div>
      </div>
    </Shell>
  );
}
