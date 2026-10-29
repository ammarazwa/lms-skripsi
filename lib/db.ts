/* Penyimpanan data penelitian — PostgreSQL (Supabase) lewat paket `postgres`. Alamat di env DATABASE_URL; untuk Supabase
 * pakai "Transaction pooler" (port 6543), karena fungsi Vercel tidak bisa memakai koneksi langsung IPv6.
 * Skema dibuat sekali dengan `npm run db:init` (scripts/schema.sql), bukan saat aplikasi berjalan.
 *
 * Kueri ditulis dengan placeholder `?` seperti sebelumnya (dulu node:sqlite); helper mengubahnya menjadi $1, $2, ….
 * Kolom NASA-TLX huruf besar ("MD", "PD", …) wajib dikutip di SQL. BIGINT dan NUMERIC dikembalikan sebagai number JS
 * (stempel waktu dalam milidetik masih jauh di bawah 2^53). */
import postgres from "postgres";

export type Row = Record<string, unknown>;
type Sql = postgres.Sql | postgres.TransactionSql;

const g = globalThis as unknown as { __lmssql?: postgres.Sql };

const keNumber = (to: number) => ({ to, from: [to], serialize: (x: unknown) => String(x), parse: (x: string) => Number(x) });

export function sql(): postgres.Sql {
  if (g.__lmssql) return g.__lmssql;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL belum diisi (lihat README: .env.local atau Environment Variables Vercel).");
  g.__lmssql = postgres(url, {
    prepare: false, // wajib untuk pooler mode transaksi (Supavisor port 6543)
    max: Number(process.env.DB_POOL_MAX) || 5,
    idle_timeout: 20,
    connect_timeout: 15,
    ssl: /localhost|127\.0\.0\.1/.test(url) ? false : "require",
    types: { int8: keNumber(20), numeric: keNumber(1700) },
  });
  return g.__lmssql;
}

/** Ubah placeholder `?` (di luar string bertanda kutip tunggal) menjadi $1, $2, …. */
function pg(q: string) {
  let n = 0, kutip = false, out = "";
  for (const c of q) {
    if (c === "'") kutip = !kutip;
    out += c === "?" && !kutip ? "$" + ++n : c;
  }
  return out;
}

function buatDb(s: Sql) {
  const jalan = (q: string, p: unknown[]) => s.unsafe(pg(q), p as postgres.ParameterOrJSON<never>[]);
  return {
    all: async <T = Row>(q: string, ...p: unknown[]) => (await jalan(q, p)) as unknown as T[],
    get: async <T = Row>(q: string, ...p: unknown[]) => ((await jalan(q, p)) as unknown as T[])[0] as T | undefined,
    run: async (q: string, ...p: unknown[]) => ({ changes: (await jalan(q, p)).count }),
  };
}

export type Db = ReturnType<typeof buatDb>;

/** Helper kueri pada pool bersama. */
export const db: Db = {
  all: (q, ...p) => buatDb(sql()).all(q, ...p),
  get: (q, ...p) => buatDb(sql()).get(q, ...p),
  run: (q, ...p) => buatDb(sql()).run(q, ...p),
};

/** Jalankan beberapa kueri dalam satu transaksi (gagal satu, batal semua). */
export async function transaksi<T>(fn: (d: Db) => Promise<T>): Promise<T> {
  return (await sql().begin((t) => fn(buatDb(t)))) as T;
}

export function now() {
  return Date.now();
}

/** Catat waktu sebuah langkah (mis. "b1_start"). Tidak menimpa kalau sudah ada. */
export async function stamp(kode: string, kunci: string, ts = now(), d: Db = db) {
  await d.run("INSERT INTO langkah (kode, kunci, ts) VALUES (?, ?, ?) ON CONFLICT (kode, kunci) DO NOTHING", kode, kunci, ts);
}

export async function getPeserta(kode: string) {
  return db.get<Peserta>("SELECT * FROM peserta WHERE kode = ?", kode);
}

export type Peserta = {
  kode: string; gender: string | null; bidang: string | null; fakultas: string | null; usia: number | null; prodi: string | null; angkatan: string | null;
  frekuensi_lms: string | null; perangkat: string | null; consent_at: number | null; created_at: number;
  status: string; pc: string | null; catatan: string | null;
};

export async function langkahMap(kode: string): Promise<Record<string, number>> {
  const rows = await db.all("SELECT kunci, ts FROM langkah WHERE kode = ?", kode);
  const out: Record<string, number> = {};
  rows.forEach((r) => (out[String(r.kunci)] = Number(r.ts)));
  return out;
}

/** Status lengkap satu peserta untuk klien. */
export async function stateOf(kode: string) {
  const [p, t, drafRows, pairs] = await Promise.all([
    getPeserta(kode),
    langkahMap(kode),
    db.all("SELECT blok, data FROM draf WHERE kode = ?", kode),
    db.get("SELECT urutan, pilihan FROM tlx_bobot WHERE kode = ?", kode),
  ]);
  if (!p) return null;
  const draf: Record<string, unknown> = {};
  let draftPairs: unknown = null;
  drafRows.forEach((r) => {
    try {
      const v = JSON.parse(String(r.data));
      if (Number(r.blok) === -1) draftPairs = v;
      draf[String(r.blok)] = v;
    } catch { /* abaikan */ }
  });
  return {
    peserta: p,
    times: t,
    draf,
    pairs: pairs ? { urutan: JSON.parse(String(pairs.urutan)), pilihan: JSON.parse(String(pairs.pilihan)) } : draftPairs,
    serverNow: now(),
  };
}

export type State = NonNullable<Awaited<ReturnType<typeof stateOf>>>;
