"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CRUMB_KURSUS, Ikon, Modal, Shell } from "@/components/shell";
import { useSesi } from "@/components/sesi";
import { CONFIG } from "@/lib/config";
import { kata } from "@/lib/konten";

type Post = { kode: string; isi: string; ts: number };
type Forum = { milik: Post | null; lain: Post[]; jumlah_lain: number };

const TOPIK = {
  subjek: "Diskusi: hasil kegiatan hari ini",
  isi: "Kamu sudah menyelesaikan ketiga blok soal. Bagikan pengalamanmu di sini: blok mana yang paling menantang menurutmu, dan strategi apa yang kamu pakai untuk mengerjakannya?\n\nTulis dalam satu balasan (anjuran 30–80 kata). Balasan hanya bisa dikirim sekali dan tidak dapat diubah.",
};

const waktu = (t: number) => new Date(t).toLocaleString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default function HalForum() {
  return (
    <Shell crumbs={[...CRUMB_KURSUS, ["Forum diskusi"]]}>
      <Isi />
    </Shell>
  );
}

function Isi() {
  const { state, post, ev, simpanDraf, kode, refresh } = useSesi();
  const router = useRouter();
  const t = state!.times;
  const need = CONFIG.TLX_BOBOT ? "bobot" : "tlx3";
  const [forum, setForum] = useState<Forum | null>(null);
  const [isi, setIsi] = useState<string>(() => (state!.draf["200"] as string) || "");
  const [konfirmasi, setKonfirmasi] = useState(false);
  const [proses, setProses] = useState(false);
  const mulai = useRef(false);

  const muat = useCallback(async () => {
    const r = await fetch("/api/forum?kode=" + encodeURIComponent(kode || ""), { cache: "no-store" });
    if (r.ok) setForum(await r.json());
  }, [kode]);

  useEffect(() => {
    if (!t[need]) return;
    muat();
    if (!mulai.current) {
      mulai.current = true;
      ev("forum_view");
      if (!t.forum_start && !t.forum) post("/api/langkah", { kunci: "forum_start" });
    }
  }, [t, need, muat, ev, post]);

  if (!t[need]) return <div className="alert alert-warning">Forum diskusi terbuka setelah NASA-TLX selesai.</div>;
  if (!forum) return <p className="muted">Memuat…</p>;

  async function kirim() {
    setKonfirmasi(false); setProses(true);
    ev("forum_post", { w: kata(isi), len: isi.length });
    const r = await fetch("/api/forum", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kode, isi }) });
    const j = await r.json();
    setProses(false);
    if (!r.ok) { alert(j.error); return; }
    setForum(j.forum);
    await refresh();
  }

  const n = kata(isi);
  const sudah = !!forum.milik;
  return (
    <>
      <div className="page-header" data-zona="header">
        <Ikon tipe="forum" besar />
        <div><h1>Forum diskusi</h1><p className="sub">Forum tanya jawab</p></div>
      </div>
      <div className="forum-meta">
        <span>{forum.jumlah_lain + (sudah ? 1 : 0)} balasan sejauh ini</span>
        <span>Dimulai oleh: Tim Peneliti</span>
      </div>

      <article className="forum-post topik" id="topik-forum" data-zona="topik">
        <span className="fp-avatar peneliti">TP</span>
        <div className="fp-body">
          <div className="fp-subject">{TOPIK.subjek}</div>
          <div className="fp-meta">oleh Tim Peneliti</div>
          <div className="fp-isi">{TOPIK.isi}</div>
        </div>
      </article>

      {!sudah && (
        <>
          <div className="alert alert-info">
            Ini forum tanya jawab. Untuk melihat balasan lain, kamu harus mengirim balasan terlebih dahulu.
          </div>
          <div className="card" id="form-balasan" data-zona="form-balasan">
            <h3>Balas</h3>
            <label className="form-label" htmlFor="isi-balasan">Pesan</label>
            <textarea id="isi-balasan" className="form-control" rows={7} value={isi} placeholder="Tulis balasanmu..."
              onChange={(e) => { setIsi(e.target.value); simpanDraf(200, e.target.value, 700); }} />
            <div className={"hitung " + (n >= 30 ? "cukup" : "muted")}>{n} kata (anjuran 30–80)</div>
            <div className="aksi-bawah" style={{ marginTop: 14 }}>
              <button className="btn btn-primary" id="btn-kirim-forum" disabled={n < 3 || proses} onClick={() => { ev("forum_submit_click"); setKonfirmasi(true); }}>Kirim ke forum</button>
            </div>
          </div>
        </>
      )}

      {sudah && (
        <>
          <article className="forum-post milik balasan" id="balasan-milik" data-zona="balasan-milik">
            <span className="fp-avatar">{forum.milik!.kode}</span>
            <div className="fp-body">
              <div className="fp-subject">Re: {TOPIK.subjek}</div>
              <div className="fp-meta">oleh Peserta {forum.milik!.kode} - {waktu(forum.milik!.ts)}</div>
              <div className="fp-isi">{forum.milik!.isi}</div>
            </div>
          </article>
          <div className="alert alert-success">Balasanmu sudah terkirim. Forum ini hanya menerima satu balasan per peserta.</div>
          {forum.lain.length === 0 && <p className="muted">Belum ada balasan dari peserta lain.</p>}
          {forum.lain.map((p) => (
            <article className="forum-post balasan" key={p.kode} data-zona="balasan-lain">
              <span className="fp-avatar">{p.kode}</span>
              <div className="fp-body">
                <div className="fp-subject">Re: {TOPIK.subjek}</div>
                <div className="fp-meta">oleh Peserta {p.kode} - {waktu(p.ts)}</div>
                <div className="fp-isi">{p.isi}</div>
              </div>
            </article>
          ))}
          <div className="aksi-bawah" data-zona="aksi">
            <button className="btn btn-primary btn-lg" id="btn-ke-penutup" onClick={() => router.push("/kursus/selesai")}>Lanjut ke Penutup</button>
            <Link className="btn btn-secondary" href="/kursus">Kembali ke kursus</Link>
          </div>
        </>
      )}

      {konfirmasi && (
        <Modal judul="Kirim balasan?" pesan="Balasan hanya bisa dikirim sekali dan tidak dapat diubah setelah terkirim." aksi={[
          { label: "Batal", act: "batal-forum", fn: () => setKonfirmasi(false) },
          { label: "Ya, kirim", primary: true, act: "konfirmasi-forum", fn: kirim },
        ]} />
      )}
    </>
  );
}
