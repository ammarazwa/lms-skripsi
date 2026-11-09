# LMS Eksperimen (Next.js) — tampilan LiVE Unpad

Lingkungan pembelajaran eksperimental untuk skripsi *Analisis Generalisasi Lintas Gender pada Klasifikasi Beban Kognitif
Berbasis Data Interaksi Pengguna*. Materi berupa soal bergaya Tes Potensi Skolastik (TPS) UTBK-SNBT yang ditulis orisinal
(`lib/konten-data.json`). Prototype lama di `../LMS` masih memakai cerita "Lampu Teras Nomor Sembilan".

## Basis data (Supabase / PostgreSQL)

Sejak 29-10-2026 data disimpan di PostgreSQL (Supabase), bukan lagi SQLite lokal. `data/lms.db` hanya arsip sesi uji
lama (T01, T30, T33, T96, T98, P01) dan tidak dibaca aplikasi.

1. Di Supabase, buka project (region **Southeast Asia (Singapore)**) → **Connect** → salin **Transaction pooler**
   (port `6543`, user `postgres.<ref>`). Koneksi langsung `db.<ref>.supabase.co` hanya IPv6, tidak bisa dipakai Vercel.
2. Buat `.env.local` (tidak ikut git; jangan dibagikan):
   ```
   DATABASE_URL=postgresql://postgres.<ref>:<password-url-encoded>@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
   FASILITATOR_PIN=<pin baru>
   NEXT_PUBLIC_DEMO=0
   ```
   Karakter khusus di password ditulis URL-encoded (mis. `*` → `%2A`).
3. Buat tabel sekali: `npm run db:init` (menjalankan `scripts/schema.sql`; aman diulang). RLS diaktifkan tanpa policy
   supaya tabel tidak terbuka lewat REST API Supabase; aplikasi tetap bisa akses karena memakai koneksi Postgres langsung.

## Menjalankan lokal

```bash
npm install
npm run build
npm start            # http://localhost:3000  (mode production)
```

`npm run dev` hanya untuk mengubah kode. Di mode dev, halaman bisa reload sendiri (hot reload), dan efek React
dijalankan dua kali, sehingga log interaksi bisa tercatat ganda. Jangan dipakai untuk pengambilan data.

Butuh Node.js >= 20.6 (untuk `--env-file`).

## Deploy ke Vercel

1. Import folder ini sebagai project Vercel (framework Next.js terdeteksi otomatis).
2. **Settings → Environment Variables** (Production): `DATABASE_URL` (Transaction pooler seperti di atas),
   `FASILITATOR_PIN` (**wajib diganti**, bawaan `2468` hanya untuk lokal), `NEXT_PUBLIC_DEMO=0`.
3. `vercel.json` menaruh fungsi di region `sin1` (Singapura), sama dengan region database. Kalau database ada di region
   lain, sesuaikan (mis. `dub1` untuk Irlandia), karena setiap kueri bolak-balik ke database.
4. Deploy, lalu coba satu kode uji (T..) dari awal sampai Penutup dan cek `/fasilitator` sebelum sesi pertama.

Ekspor `events` dan `dataset` membaca seluruh log. Untuk 60 peserta, ekspor ini bisa melebihi batas ukuran respons fungsi
Vercel (±4,5 MB). Ekspor besar sebaiknya dijalankan dari laptop: `npm start` dengan `DATABASE_URL` yang sama, lalu buka
`http://localhost:3000/fasilitator`.

Peserta di lab cukup membuka URL Vercel. Event dikirim tiap 4 detik dan diantrekan ulang bila koneksi putus.

## Alur peserta

Masuk (kode P01–P60) → persetujuan + demografi → Pengumuman → Latihan → NASA-TLX latihan →
Blok 1 (LOTS) → TLX 1 → **Istirahat** → Blok 2 (MOTS) → TLX 2 → **Istirahat** → Blok 3 (HOTS) → TLX 3 →
perbandingan berpasangan (15 pasang) → **Forum diskusi** (1 balasan) → Penutup.

Istirahat ditempatkan **setelah** NASA-TLX supaya rating beban kerja tetap diberikan segera setelah tugas.
Durasinya sama untuk semua peserta (`ISTIRAHAT_DETIK` di `lib/config.ts`). Istirahat bersifat *hands-off*:
- Peserta melepas tangan dari mouse dan keyboard. Boleh mengobrol, minum, atau meregangkan badan.
- Bila mouse/keyboard tersentuh, layar menampilkan teguran.
- Tombol "Lanjut" baru muncul saat waktu habis, disertai bunyi singkat (`ISTIRAHAT_BUNYI`).
- Interaksi selama istirahat dicatat sebagai **kepatuhan**: export `istirahat` berisi `klik_saat_istirahat`,
  `ketik_saat_istirahat`, `scroll_saat_istirahat`, `detik_mouse_bergerak`, dan `hands_off` (1 = tanpa interaksi).
  3 detik pertama tidak dihitung (`ISTIRAHAT_TOLERANSI_DETIK`).

Forum diskusi meniru tipe *Q and A forum* Moodle: setiap peserta mengirim **satu** balasan dan baru bisa membaca
balasan peserta lain setelah mengirim. Peserta hanya melihat balasan dari kelompok kodenya (P, T, atau PL).
Forum berada di luar jendela fitur blok sehingga tidak memengaruhi fitur interaksi maupun rating NASA-TLX.

## Materi blok

Soal mengikuti subtes TPS (PU, PPU, PBM, PK), yang disarankan narasumber psikologi sebagai baseline *prior knowledge*
yang sama untuk mahasiswa STEM dan non-STEM (wawancara 22-10-2026). Blok 1–3 sengaja dibuat sama strukturnya, dan yang
naik hanya level Bloom:

| | Blok 1 (LOTS) | Blok 2 (MOTS) | Blok 3 (HOTS) |
|---|---|---|---|
| Level | C1–C2 memahami | C3 menerapkan | C4–C5 menganalisis, mengevaluasi |
| Soal | 6 PG + 2 isian | 6 PG + 2 isian | 6 PG + 2 isian |
| Ranah | 4 verbal + 4 kuantitatif | sama | sama |
| Sumber | 6 berbasis bahan + 2 mandiri | sama | sama |
| Batas waktu | 15 menit | 15 menit | 15 menit |

Alasannya:
- **Ranah 50:50 di setiap blok.** Narasumber menyebut laki-laki cenderung unggul di tugas kuantitatif/spasial dan
  perempuan di tugas verbal. Komposisi yang sama di tiap blok mencegah efek gender tercampur dengan efek level.
- **Volume sama.** Jumlah soal, isian, dan waktu yang sama membuat durasi, klik, dan ketikan tidak naik hanya karena
  tugasnya lebih banyak.
- **Bacaan dulu, lalu satu soal per halaman** (sejak 29-10-2026, menggantikan bahan di samping soal). Blok dibuka di
  `/kursus/blok/[b]/bacaan` (Teks A + Tabel B). Nomor soal dan "Lanjut ke soal" baru aktif setelah waktu baca minimal
  (`MIN_BACA_DETIK`: 90 detik untuk Blok 1–3, 20 detik untuk latihan), dihitung dari pembukaan pertama Bacaan (langkah
  `b{b}_baca`, jam server). Waktu baca termasuk batas 15 menit. Setelah itu soal ada di `/kursus/blok/[b]/[no]`, dan
  peserta kembali ke bahan lewat **Bacaan** di nomor soal atau **Sebelumnya** di soal 1. Dengan begitu "kembali ke bahan"
  tercatat sebagai pindah halaman (sebelumnya hanya terlihat dari scroll/mouse). Konsekuensinya, peserta harus mengingat
  isi bahan saat menjawab; bebannya sama di ketiga blok.
  Perpindahan menghasilkan `page_visits`, `u_turn_count`, dan `text_return_count`; kembali ke soal yang sudah pernah
  dibuka dicatat sebagai `revisit` (`story_revisits`).
- **Level tidak ditampilkan ke peserta.** Judul blok (mis. "Menganalisis & Mengevaluasi") dan label LOTS/MOTS/HOTS hanya
  ada di data, ekspor, dan halaman fasilitator, supaya ekspektasi "blok terakhir paling sulit" tidak ikut menaikkan
  rating NASA-TLX.
- **Isian di setiap blok.** Isian menjaga `text_input_chars`, `deletion_ratio`, dan fitur burst tetap terisi; TPS asli
  hanya pilihan ganda.

Setiap soal di JSON punya `level`, `subtes`, `ranah`, dan `mandiri` (soal tanpa bahan). Kunci PG dinilai otomatis (`skor_benar`). Pada pilot, cek
bahwa persentase benar turun dari Blok 1 ke Blok 3.

## Fasilitator

`/fasilitator` (PIN default `2468`, ganti lewat env `FASILITATOR_PIN`): progres live semua peserta, detail per peserta,
waktu mulai (login pertama), selesai (halaman Penutup), dan total durasi, hapus data uji, dan ekspor CSV:

| Ekspor | Isi |
|---|---|
| `dataset` | 1 baris per peserta × blok (hanya P01–P60): gender, bidang, MD…FR, RTLX, WWL, 5 fitur Tabel 3.4 + 10 fitur tambahan + `initial_reading_s` (info). **Langsung terbaca pipeline skripsi (mode `dataset`)** |
| `dataset?semua=1` | sama, termasuk kode uji (T) dan pilot (PL) |
| `peserta` | demografi (gender = variabel pengelompokan) |
| `jawaban`, `tlx`, `bobot`, `istirahat`, `forum`, `langkah` | data mentah per tabel |
| `events` | log interaksi mentah (klik, ketik, scroll, navigasi, dll.) |

Fitur dihitung di `lib/fitur.ts`. Definisi lima fitur utama dan delapan fitur tambahan pertama sama dengan pipeline
(`Pipeline_Final_Skripsi_Ammara/src/p2_data.py: hitung_log`, `p3_fitur.py: fitur_log`); kesamaannya diuji 15-10-2026
dengan fungsi asli pipeline pada log LMS (0 selisih). Sejak alur Bacaan, segmen blok dimulai saat halaman blok pertama
terbuka (Bacaan) dan berakhir saat halaman NASA-TLX blok itu terbuka; `text_return_*` hanya dihitung di LMS, dan pipeline
membacanya dari CSV `dataset` (`FITUR_EXT`).

| Fitur | Definisi |
|---|---|
| `access_duration_s` | durasi segmen (detik), termasuk waktu baca |
| `click_count` | jumlah klik di segmen |
| `text_input_chars` | jumlah tombol huruf + spasi |
| `page_visits` | jumlah page view di segmen (Bacaan dan soal, termasuk kembali ke halaman sebelumnya) |
| `u_turn_count` | jumlah navigasi kembali ke halaman sebelumnya: setiap perpindahan ke halaman yang lebih awal dalam urutan halaman blok (Bacaan → soal 1…n), lewat tombol "Sebelumnya", navigasi nomor soal/Bacaan, atau tombol back browser; tanpa batas waktu; sumber: urutan `pv` |
| tambahan | `idle_ratio` (jeda ≥ 5 dtk), `click_rate_per_min`, `deletion_ratio`, `burst_len_mean` / `inter_burst_pause_s` (burst putus bila jeda > 2 dtk), `story_revisits` (kembali ke soal yang sudah pernah dibuka di blok itu), `mouse_dist_per_min`, `rage_click_count` (≥ 5 klik dalam 500 ms), `text_return_count` (membuka Bacaan lagi setelah soal pertama dibuka), `text_return_time_s` (total lama di Bacaan saat kembali) |
| info | `initial_reading_s`: lama membaca dari awal segmen sampai soal pertama dibuka (bukan fitur model) |

Waktu event dikonversi ke jam server, supaya selisih jam antar-PC lab tidak menggeser segmen.

**Ke pipeline:** unggah hanya file `lms_dataset_*.csv` ke notebook. Notebook otomatis masuk mode `dataset` dan tidak
membutuhkan registrasi, raw_batches, maupun coding Hotjar.

Ganti peserta di PC yang sama: di halaman Penutup klik **Akhiri sesi (fasilitator)** lalu masukkan PIN.
Menu "Log out" di avatar juga meminta PIN, jadi peserta tidak bisa keluar sendiri.

## Heatmap & zoning

`/fasilitator/heatmap`: replika read-only tiap halaman (Bacaan dan setiap halaman soal Latihan dan Blok 1–3, NASA-TLX, Forum). Replika memakai
komponen yang sama dengan halaman peserta (`components/konten-view.tsx`). Filter yang tersedia: gender, bidang, dan
kode uji. Ada tiga mode:

- **Heatmap klik**: posisi klik dicatat relatif terhadap zona (`data-zona`: soal, paragraf, skala TLX, tombol), jadi
  tetap tepat walau resolusi PC berbeda.
- **Heatmap scroll**: % peserta yang pernah melihat tiap bagian, dari snapshot tata letak (`lay`) + posisi scroll.
- **Zoning**: rata-rata waktu terlihat, jumlah klik, atau % peserta melihat per zona. Tabelnya bisa diekspor ke CSV.

Warna memakai satu hue biru (terang ke gelap) dengan legenda skala.

Data heatmap bersifat deskriptif dan tidak masuk fitur model. Event `lay` tidak memengaruhi fitur pipeline (kesamaan
dengan pipeline tetap 0 selisih). Peserta yang datanya terekam sebelum logger zona tidak bisa dipetakan; mereka
dihitung di "klik tanpa data zona" dan tidak masuk penyebut persentase.

## Sebelum pengambilan data

- Set `NEXT_PUBLIC_DEMO=0` (menyembunyikan tombol "Lewati" istirahat dan label MODE DEMO). Tanpa variabel ini mode
  DEMO **aktif**.
- Ganti `FASILITATOR_PIN`. Di URL publik, PIN bawaan membuka seluruh data peserta.
- Opsional: `NEXT_PUBLIC_CONTENTSQUARE_TAG=<tag>` untuk session replay Contentsquare/Hotjar.
- Hapus peserta uji (T01–T99) dari halaman fasilitator.
