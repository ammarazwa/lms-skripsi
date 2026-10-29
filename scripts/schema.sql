-- Skema basis data LMS penelitian (PostgreSQL / Supabase). Aman dijalankan berulang: `npm run db:init`.
-- Waktu disimpan sebagai milidetik epoch (BIGINT). Kolom NASA-TLX huruf besar sengaja dikutip ("MD", ...).
-- RLS diaktifkan tanpa policy supaya tabel tidak terbuka lewat REST API Supabase (anon key); aplikasi memakai
-- koneksi Postgres langsung sebagai pemilik tabel, jadi tidak terpengaruh RLS.

CREATE TABLE IF NOT EXISTS peserta (
  kode TEXT PRIMARY KEY, gender TEXT, bidang TEXT, fakultas TEXT, usia INTEGER, prodi TEXT, angkatan TEXT,
  frekuensi_lms TEXT, perangkat TEXT, consent_at BIGINT, created_at BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'aktif', pc TEXT, catatan TEXT
);
CREATE TABLE IF NOT EXISTS langkah (
  kode TEXT NOT NULL, kunci TEXT NOT NULL, ts BIGINT NOT NULL, PRIMARY KEY (kode, kunci)
);
CREATE TABLE IF NOT EXISTS draf (
  kode TEXT NOT NULL, blok INTEGER NOT NULL, data TEXT NOT NULL, updated_at BIGINT NOT NULL, PRIMARY KEY (kode, blok)
);
CREATE TABLE IF NOT EXISTS jawaban (
  kode TEXT NOT NULL, blok INTEGER NOT NULL, soal_id TEXT NOT NULL, level TEXT, tipe TEXT,
  nilai TEXT, benar DOUBLE PRECISION, jumlah_kata INTEGER, PRIMARY KEY (kode, blok, soal_id)
);
CREATE TABLE IF NOT EXISTS hasil_blok (
  kode TEXT NOT NULL, blok INTEGER NOT NULL, skor DOUBLE PRECISION, maks DOUBLE PRECISION, alasan TEXT, ts BIGINT NOT NULL,
  PRIMARY KEY (kode, blok)
);
CREATE TABLE IF NOT EXISTS tlx (
  kode TEXT NOT NULL, blok INTEGER NOT NULL, "MD" INTEGER, "PD" INTEGER, "TD" INTEGER, "OP" INTEGER, "EF" INTEGER, "FR" INTEGER,
  raw DOUBLE PRECISION, ts BIGINT NOT NULL, PRIMARY KEY (kode, blok)
);
CREATE TABLE IF NOT EXISTS tlx_bobot (
  kode TEXT PRIMARY KEY, "MD" INTEGER, "PD" INTEGER, "TD" INTEGER, "OP" INTEGER, "EF" INTEGER, "FR" INTEGER,
  urutan TEXT, pilihan TEXT, ts BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS istirahat (
  kode TEXT NOT NULL, ke INTEGER NOT NULL, mulai BIGINT, selesai BIGINT, durasi_ms BIGINT, alasan TEXT,
  PRIMARY KEY (kode, ke)
);
CREATE TABLE IF NOT EXISTS forum_post (
  kode TEXT PRIMARY KEY, isi TEXT NOT NULL, jumlah_kata INTEGER, mulai BIGINT, ts BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, kode TEXT NOT NULL, ts BIGINT NOT NULL, pl TEXT, k INTEGER,
  page TEXT, blok INTEGER, tipe TEXT NOT NULL, data TEXT
);
CREATE INDEX IF NOT EXISTS ix_events_kode_ts ON events (kode, ts);
CREATE INDEX IF NOT EXISTS ix_events_page ON events (page);
CREATE UNIQUE INDEX IF NOT EXISTS ux_events_dedup ON events (kode, pl, k);

ALTER TABLE peserta ENABLE ROW LEVEL SECURITY;
ALTER TABLE langkah ENABLE ROW LEVEL SECURITY;
ALTER TABLE draf ENABLE ROW LEVEL SECURITY;
ALTER TABLE jawaban ENABLE ROW LEVEL SECURITY;
ALTER TABLE hasil_blok ENABLE ROW LEVEL SECURITY;
ALTER TABLE tlx ENABLE ROW LEVEL SECURITY;
ALTER TABLE tlx_bobot ENABLE ROW LEVEL SECURITY;
ALTER TABLE istirahat ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_post ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
