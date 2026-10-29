"use client";
import Link from "next/link";
import { useState } from "react";
import { Ikon, NAMA_TIPE, Shell, terbuka } from "@/components/shell";
import { useSesi } from "@/components/sesi";
import { CONFIG } from "@/lib/config";
import { kursus, semuaItem } from "@/lib/konten";

export default function Kursus() {
  const { state } = useSesi();
  const t = state?.times || {};
  const [tutup, setTutup] = useState<Record<string, boolean>>({});
  const items = semuaItem().filter((i) => i.done);
  const selesai = items.filter((i) => t[i.done!]).length;
  const next = items.find((i) => !t[i.done!] && terbuka(i, t));
  return (
    <Shell crumbs={[["Dashboard", "/dasbor"], ["My courses", "/kursus"], [CONFIG.COURSE_SHORT]]}>
      <div className="course-hero">
        <div className="muted ket" style={{ fontWeight: 600 }}>{CONFIG.COURSE_CATEGORY}</div>
        <h1>{CONFIG.COURSE_NAME}</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
          <div className="progress" style={{ flex: 1, maxWidth: 360, background: "#fff" }}><span style={{ width: (100 * selesai) / items.length + "%" }} /></div>
          <span className="muted ket">{selesai} dari {items.length} aktivitas selesai</span>
        </div>
      </div>
      {kursus().map((s) => (
        <section key={s.id} className={"course-section" + (tutup[s.id] ? " tutup" : "")} id={"sec-" + s.id}>
          <div className="sec-head" onClick={() => setTutup((x) => ({ ...x, [s.id]: !x[s.id] }))} data-act={"sec-" + s.id}>
            <svg className="sec-caret" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M6 9l6 6 6-6" /></svg>
            <h2>{s.nama}</h2>
          </div>
          <div className="sec-body">
            {s.ringkas && <p className="sec-ringkas">{s.ringkas}</p>}
            {s.items.map((it) => {
              const open = terbuka(it, t);
              const done = it.done ? !!t[it.done] : false;
              const isNext = next?.id === it.id;
              return (
                <div className={"activity" + (open ? "" : " kunci")} key={it.id}>
                  <Ikon tipe={it.tipe} />
                  <div className="act-info">
                    <div className="act-tipe">{NAMA_TIPE[it.tipe]}</div>
                    {open && !done ? <Link href={it.href} className="act-nama" id={"act-" + it.id}>{it.nama}</Link>
                      : <span className={"act-nama" + (open ? "" : " kunci")}>{it.nama}</span>}
                    {it.ket && <div className="act-ket">{it.ket}</div>}
                  </div>
                  {done ? <span className="chip chip-ok">Selesai</span>
                    : isNext ? <span className="chip chip-next">Berikutnya</span>
                    : open ? <span className="chip chip-todo">Belum selesai</span>
                    : null}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </Shell>
  );
}
