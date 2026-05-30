# Absensi Bimba

Workspace ini berisi rancangan dan nantinya implementasi aplikasi absensi dan payroll Bimba.

Dokumen awal:

- `docs/requirements.md`: requirement bisnis.
- `docs/architecture.md`: rancangan arsitektur MVP.
- `docs/data-model.md`: rancangan model data awal.
- `docs/deploy-vercel-supabase.md`: langkah deploy testing internal ke Vercel dan Supabase.

Fokus sistem:

- Absensi guru/karyawan berbasis QR dinamis dan GPS.
- Jadwal fleksibel untuk guru dan karyawan penunjang.
- Approval koreksi lupa absen.
- Pengajuan dan approval lembur.
- Payroll dinamis berbasis komponen.
- Slip payroll bisa dilihat di aplikasi dan dikirim via email.

## Aplikasi MVP

Stack saat ini:

- Next.js PWA.
- PostgreSQL untuk deployment.
- Prisma 7.
- QR dinamis 30 detik.
- Validasi GPS cabang.
- Email payroll via SMTP jika konfigurasi tersedia.
- Halaman Settings untuk GPS cabang, aturan payroll, dan SMTP.

## Cara menjalankan

Pastikan Node.js sudah terpasang. Di laptop ini Node.js sudah tersedia.

```bash
npm.cmd install
npm.cmd run dev -- --hostname 127.0.0.1 --port 3000
```

Isi `.env` dengan `DATABASE_URL` PostgreSQL/Supabase sebelum menjalankan fitur yang membutuhkan database.

Buka:

```text
http://127.0.0.1:3000
```

Catatan Windows: gunakan `npm.cmd`, bukan `npm`, karena PowerShell di laptop ini memblokir `npm.ps1`.

## Akun demo

- Owner: `owner@bimba.local` / `owner123`
- Admin: `admin@bimba.local` / `admin123`
- Guru: `guru@bimba.local` / `guru123`
- Staff: `staff@bimba.local` / `staff123`

## Konfigurasi saat ini

- Koordinat cabang: `-6.34550435398156, 107.34550203265823`
- Radius GPS: `500` meter
- Potongan telat: `Rp15.000` per hari
- Izin/sakit bebas potongan: `2` hari per periode
- Potongan izin/sakit: mulai hari ke-3, `Rp100.000` per hari

## Konfigurasi email

SMTP bisa diisi dari menu `Settings` di aplikasi. Untuk deployment, `.env` juga tetap bisa dipakai sebagai fallback:

```text
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="Bimba Payroll <payroll@bimba.local>"
```

Tanpa SMTP, fitur kirim email akan menandai status email sebagai `FAILED`, tetapi slip tetap bisa dilihat di aplikasi.

## Catatan development

- Gunakan host yang konsisten saat testing, disarankan `http://127.0.0.1:3000`.
- Git sudah terpasang di `C:\Program Files\Git\cmd\git.exe`, tetapi belum terdeteksi di PATH PowerShell yang sedang berjalan.
- Database development ada di `dev.db` dan bisa dibuat ulang dengan `npm.cmd run db:seed`.
