/* Agregasi heatmap per halaman: titik klik (relatif zona), zoning (klik & waktu terlihat per zona), dan jangkauan scroll.
 * Sumber: event logger LMS — click {z, rx, ry}, scroll {y, vh, dh}, lay {dh, vh, y, zs: [zona, top, tinggi]}, pv, vis. */
import { db, type Peserta } from "./db";
import { eventsPeserta } from "./fitur";

export type OpsiHeatmap = { halaman: string; gender?: string; bidang?: string; uji?: boolean; kode?: string };

type Zona = [string, number, number];
type StatZona = { klik: number; pesertaKlik: Set<string>; terlihatMs: number; pesertaLihat: Set<string> };

const JEDA_MAKS_MS = 5 * 60 * 1000; // jeda antar-event lebih dari ini tidak dihitung sebagai waktu terlihat

export async function heatmap(o: OpsiHeatmap) {
  const semua = await db.all<Peserta>("SELECT * FROM peserta ORDER BY kode");
  // peserta yang pernah membuka halaman ini (untuk pilihan "Peserta" & info kode uji yang tersembunyi)
  const tersedia = (await db.all<{ kode: string }>("SELECT DISTINCT kode FROM events WHERE page = ? ORDER BY kode", o.halaman)).map((r) => r.kode);
  const ps = semua.filter((p) => o.kode ? p.kode === o.kode :
    (o.uji || /^P\d/.test(p.kode)) &&
    (!o.gender || (o.gender === "L" ? p.gender === "Laki-laki" : p.gender === "Perempuan")) &&
    (!o.bidang || p.bidang === o.bidang));

  const zona: Record<string, StatZona> = {};
  const z = (k: string) => (zona[k] ??= { klik: 0, pesertaKlik: new Set(), terlihatMs: 0, pesertaLihat: new Set() });
  const klik: { z: string; rx: number; ry: number; kode: string }[] = [];
  let klikTanpaZona = 0;
  const jangkauan: { kode: string; maks: number }[] = [];
  const pengunjung = new Set<string>();
  const denganZona = new Set<string>(); // peserta yang punya data tata letak (logger zona) di halaman ini

  for (const p of ps) {
    const ev = await eventsPeserta(p.kode);
    let halaman = "", tampil = true, lay: { dh: number; vh: number; zs: Zona[] } | null = null, y = 0, vh = 0, maks = 0;
    for (let i = 0; i < ev.length; i++) {
      const e = ev[i];
      // perbarui status sebelum menghitung interval berikutnya
      // pv = halaman baru tampil (reload/buka ulang mencatat "hidden" sebelum unload tanpa "visible" sesudahnya)
      if (e.tipe === "pv") { halaman = String(e.d.path ?? e.page); lay = null; y = 0; vh = Number(e.d.h) || vh; tampil = true; }
      else if (e.tipe === "vis") tampil = e.d.st !== "hidden";
      if (halaman !== o.halaman) continue;
      pengunjung.add(p.kode);
      if (e.tipe === "lay") {
        lay = { dh: Number(e.d.dh), vh: Number(e.d.vh), zs: (e.d.zs as Zona[]) || [] };
        denganZona.add(p.kode);
        vh = lay.vh; y = Number(e.d.y) || 0;
      } else if (e.tipe === "scroll") { y = Number(e.d.y) || 0; vh = Number(e.d.vh) || vh; }
      else if (e.tipe === "click") {
        if (typeof e.d.z === "string" && typeof e.d.rx === "number") {
          klik.push({ z: e.d.z, rx: Number(e.d.rx), ry: Number(e.d.ry), kode: p.kode });
          z(e.d.z).klik++; z(e.d.z).pesertaKlik.add(p.kode);
        } else klikTanpaZona++;
      }
      if (lay && lay.dh > 0) maks = Math.max(maks, Math.min(1, (y + vh) / lay.dh));
      // waktu terlihat: interval sampai event berikutnya (selama tab tampil & masih di halaman yang sama)
      const next = ev[i + 1];
      if (!lay || !tampil || !next) continue;
      const dt = next.ts - e.ts;
      if (dt <= 0 || dt > JEDA_MAKS_MS) continue;
      const atas = y, bawah = y + vh;
      for (const [nama, top, h] of lay.zs) {
        if (h <= 0) continue;
        const overlap = Math.min(bawah, top + h) - Math.max(atas, top);
        if (overlap >= Math.min(h, vh) * 0.5) { const s = z(nama); s.terlihatMs += dt; s.pesertaLihat.add(p.kode); }
      }
    }
    if (pengunjung.has(p.kode)) jangkauan.push({ kode: p.kode, maks: Math.round(maks * 1000) / 1000 });
  }

  // penyebut persentase = peserta yang punya data zona (data lama sebelum logger zona tidak bisa dipetakan)
  const n = denganZona.size || pengunjung.size;
  const tabel = Object.entries(zona).map(([nama, s]) => ({
    zona: nama,
    klik: s.klik,
    peserta_klik: s.pesertaKlik.size,
    persen_peserta_klik: n ? Math.round((1000 * s.pesertaKlik.size) / n) / 10 : 0,
    persen_peserta_melihat: n ? Math.round((1000 * s.pesertaLihat.size) / n) / 10 : 0,
    rata_terlihat_s: n ? Math.round(s.terlihatMs / n / 100) / 10 : 0,
  }));
  // kurva jangkauan scroll: % peserta yang layarnya pernah mencapai kedalaman d% halaman
  const kurva = Array.from({ length: 21 }, (_, i) => i * 5).map((d) => ({
    kedalaman: d,
    persen_peserta: n ? Math.round((1000 * jangkauan.filter((j) => denganZona.has(j.kode) && j.maks * 100 >= d).length) / n) / 10 : 0,
  }));
  const ujiTersembunyi = !o.kode && !o.uji ? tersedia.filter((k) => !/^P\d/.test(k)).length : 0;
  return { n_peserta: pengunjung.size, n_dengan_zona: denganZona.size, kode_tersedia: tersedia, n_uji_tersembunyi: ujiTersembunyi, peserta: [...pengunjung], klik, klik_tanpa_zona: klikTanpaZona, zona: tabel, jangkauan, kurva };
}
