"use client";
/* Komponen tampilan konten yang dipakai halaman peserta DAN replika di heatmap fasilitator, supaya tata letak dan
 * zona (atribut data-zona) identik. Tanpa `onUbah`/`onPilih` komponen tampil read-only (mode replika). */
import { BLOK, TLX, kata, type Skala, type Soal } from "@/lib/konten";

export type NilaiSoal = number | null | (number | null)[] | string | undefined;

export function terjawab(q: Soal, v: NilaiSoal) {
  if (q.tipe === "pg") return v !== null && v !== undefined;
  if (q.tipe === "urut" || q.tipe === "jodoh") return Array.isArray(v) && v.length === q.butir!.length && v.every((x) => x !== null && x !== undefined);
  return kata(v as string) > 0;
}

/** Bahan blok b: Teks A (zona par-N) + Tabel B (zona tabel-B). */
export function TeksBahan({ b }: { b: number }) {
  const bahan = BLOK[b]?.bahan;
  if (!bahan) return null;
  const { teks, tabel } = bahan;
  // Kolom nominal (semua sel berupa angka format Indonesia, mis. 3.000 atau 2,5) rata kanan; jam dan teks tetap rata kiri.
  const angka = tabel.kolom.map((_, j) => tabel.baris.every((r) => /^-?\d{1,3}(\.\d{3})*(,\d+)?%?$/.test(r[j].trim())));
  const kelas = (j: number) => (angka[j] ? "angka" : undefined);
  return (
    <article className="bacaan bahan" id="teks-bahan">
      <h2>{teks.judul}</h2>
      {teks.paragraf.map((p, i) => <p key={i} data-par={i + 1} data-zona={"par-" + (i + 1)}>{p}</p>)}
      <h2>{tabel.judul}</h2>
      <div className="tabel-wrap" data-zona="tabel-B">
        <table className="tabel">
          <thead><tr>{tabel.kolom.map((k, j) => <th key={k} className={kelas(j)}>{k}</th>)}</tr></thead>
          <tbody>{tabel.baris.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={kelas(j)}>{c}</td>)}</tr>)}</tbody>
        </table>
      </div>
      {tabel.catatan && <p className="muted tabel-catatan">{tabel.catatan}</p>}
    </article>
  );
}

const NAMA_TIPE_SOAL = { esai: "Esai", pg: "Pilihan ganda", urut: "Mengurutkan", jodoh: "Menjodohkan" } as const;

export function KartuSoal({ q, qi, nilai, onUbah }: { q: Soal; qi: number; nilai: NilaiSoal; onUbah?: (v: NilaiSoal, tunda?: boolean) => void }) {
  const ro = !onUbah;
  const sudah = terjawab(q, nilai);
  return (
    <div className="que" id={"que-" + q.id} data-zona={"que-" + q.id}>
      <div className="que-info">
        <strong>Soal {qi + 1}</strong>
        <span className={sudah ? "ok" : "muted"}>{sudah ? "Sudah dijawab" : "Belum dijawab"}</span>
        <div className="muted" style={{ marginTop: 6 }}>{NAMA_TIPE_SOAL[q.tipe]}</div>
      </div>
      <div className="que-isi">
        <p className="que-teks">{q.teks}</p>
        {q.tipe === "pg" && q.opsi!.map((o, oi) => (
          <label className="opsi" key={oi} htmlFor={ro ? undefined : q.id + "_" + oi}>
            <input type="radio" name={q.id} id={ro ? undefined : q.id + "_" + oi} value={oi} checked={nilai === oi} readOnly={ro}
              disabled={ro} onChange={() => onUbah?.(oi)} />
            <span>{String.fromCharCode(97 + oi)}. {o}</span>
          </label>
        ))}
        {(q.tipe === "urut" || q.tipe === "jodoh") && (
          <div>
            {q.butir!.map((bt, bi) => {
              const arr = (Array.isArray(nilai) ? nilai : q.butir!.map(() => null)) as (number | null)[];
              const opsi = q.tipe === "urut" ? q.butir!.map((_, i) => ({ v: i + 1, l: String(i + 1) })) : q.opsi!.map((o, i) => ({ v: i, l: o }));
              return (
                <div className="butir" key={bi}>
                  <span>{q.tipe === "jodoh" ? String.fromCharCode(65 + bi) + ". " : ""}{bt}</span>
                  <select className="form-control" id={ro ? undefined : q.id + "_" + bi} name={q.id + "_" + bi} value={arr[bi] ?? ""} disabled={ro}
                    onChange={(e) => { const n = [...arr]; n[bi] = e.target.value === "" ? null : Number(e.target.value); onUbah?.(n); }}>
                    <option value="">Pilih…</option>
                    {opsi.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                  </select>
                </div>
              );
            })}
          </div>
        )}
        {q.tipe === "esai" && (
          <>
            <textarea className="form-control" id={ro ? undefined : q.id} name={q.id} rows={(q.min_kata || 0) >= 100 ? 12 : 6} readOnly={ro}
              value={(nilai as string) || ""} onChange={(e) => onUbah?.(e.target.value, true)} placeholder="Tulis jawabanmu di sini…" />
            {(() => {
              const n = kata(nilai as string);
              return <div className={"hitung " + (q.min_kata && n < q.min_kata ? "muted" : "cukup")}>{n} kata{q.min_kata ? ` (anjuran minimal ${q.min_kata})` : ""}</div>;
            })()}
          </>
        )}
      </div>
    </div>
  );
}

export function InstruksiTlx() {
  return (
    <div className="card" data-zona="instruksi" style={{ background: "var(--primary-100)", borderColor: "var(--primary-200)" }}>
      {TLX.instruksi_rating.map((p, i) => <p key={i} style={i === TLX.instruksi_rating.length - 1 ? { marginBottom: 0 } : undefined}>{p}</p>)}
    </div>
  );
}

export function SkalaTlx({ s, nilai, onPilih }: { s: Skala; nilai: number | undefined; onPilih?: (v: number) => void }) {
  return (
    <div className={"tlx-skala" + (nilai !== undefined ? " terisi" : "")} id={"tlx-" + s.id} data-zona={"tlx-" + s.id}>
      <div><strong>{s.nama}</strong> <span className="muted">({s.en})</span></div>
      <p className="tlx-desk">{s.deskripsi}</p>
      <div className="tlx-garis" role="radiogroup" aria-label={s.nama}>
        {Array.from({ length: 21 }, (_, i) => i * 5).map((v, i) => (
          <button key={v} type="button" className={"tik" + (i % 10 === 0 ? " besar" : "") + (nilai === v ? " pilih" : "")} disabled={!onPilih}
            data-act={"tlx-" + s.id} aria-label={`${s.nama} titik ${i + 1} dari 21`} onClick={() => onPilih?.(v)} />
        ))}
      </div>
      <div className="tlx-ujung"><span>{s.kiri}</span><span>{s.kanan}</span></div>
    </div>
  );
}
