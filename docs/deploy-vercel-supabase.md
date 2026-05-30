# Deploy Testing Internal ke Vercel + Supabase

Dokumen ini untuk deploy testing internal aplikasi Absensi Doremi.

## 1. Buat Supabase Project

Di Supabase:

1. Buat project baru.
2. Simpan database password.
3. Buka Project Settings > Database.
4. Salin connection string PostgreSQL.

Untuk Vercel/serverless, pakai connection string pooled jika tersedia dari Supabase.

Format env:

```text
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:6543/postgres?pgbouncer=true&connection_limit=1"
```

Jika memakai direct connection, port biasanya `5432`.

## 2. Buat Storage Bucket

Di Supabase Storage:

1. Buat bucket bernama `attendance-evidence`.
2. Untuk testing internal, set bucket sebagai public.
3. Buka Project Settings > API.
4. Salin `Project URL`.
5. Salin `service_role` key.

Env yang dibutuhkan:

```text
SUPABASE_URL="https://xxxx.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="service_role_key"
SUPABASE_STORAGE_BUCKET="attendance-evidence"
```

Jangan expose `SUPABASE_SERVICE_ROLE_KEY` ke client/browser. Di aplikasi ini key tersebut hanya dipakai di server route.

## 3. Push Schema dan Seed Data Awal

Sebelum deploy pertama, isi `.env` lokal dengan `DATABASE_URL` Supabase, lalu jalankan:

```bash
npm.cmd run db:push
npm.cmd run db:seed
```

Peringatan: `db:seed` menghapus dan mengisi ulang data demo. Jalankan hanya untuk setup awal testing, bukan setelah data real masuk.

Akun demo setelah seed:

- Owner: `owner@bimba.local` / `owner123`
- Admin: `admin@bimba.local` / `admin123`
- Guru: `guru@bimba.local` / `guru123`
- Staff: `staff@bimba.local` / `staff123`

## 4. Set Environment Variables di Vercel

Di Vercel project `absensi-doremi`, buka Settings > Environment Variables.

Tambahkan:

```text
DATABASE_URL
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_STORAGE_BUCKET
```

Optional SMTP dapat diisi dari halaman Settings aplikasi setelah login.

## 5. Deploy

Pastikan kode terbaru sudah di-push ke GitHub:

```bash
& "C:\Program Files\Git\cmd\git.exe" add .
& "C:\Program Files\Git\cmd\git.exe" commit -m "Prepare Vercel Supabase deployment"
& "C:\Program Files\Git\cmd\git.exe" push origin main
```

Setelah push, Vercel akan redeploy otomatis.

## Catatan Teknis

- Aplikasi production memakai PostgreSQL, bukan SQLite.
- `postinstall` menjalankan `prisma generate` otomatis di Vercel.
- Upload bukti koreksi/izin memakai Supabase Storage saat env Supabase tersedia.
- File `.env` lokal tidak boleh di-commit.
