# Arsitektur MVP

## Rekomendasi platform

Karena sebagian pengguna memakai iPhone, aplikasi sebaiknya dibuat sebagai web app/PWA yang responsif, bukan Android-only.

Keuntungan PWA:

- Bisa dipakai di Android, iPhone, laptop, dan tablet.
- Guru/karyawan tidak perlu install dari Play Store.
- Kamera browser bisa dipakai untuk scan QR.
- Admin bisa membuka dashboard dari laptop.
- Owner bisa approval dari HP atau laptop.

## Modul utama

### 1. Authentication dan Role

Menangani login, session, dan otorisasi.

Role awal:

- employee: guru/karyawan.
- admin.
- owner.

### 2. Employee Management

Mengelola data guru dan karyawan penunjang.

Data penting:

- Nama.
- Email.
- Nomor HP.
- Role pekerjaan.
- Tipe karyawan: tetap, part-time, atau lainnya.
- Cabang default.
- Status aktif/nonaktif.

### 3. Branch Management

Mengelola cabang.

Data penting:

- Nama cabang.
- Alamat.
- Latitude.
- Longitude.
- Radius GPS.
- Status aktif/nonaktif.

Walaupun saat ini hanya 1 cabang, database tetap dibuat multi-cabang.

### 4. Flexible Scheduling

Jadwal dibuat fleksibel agar bisa dipakai oleh guru dan karyawan penunjang.

Jadwal tidak boleh diasumsikan selalu "mengajar kelas". Lebih aman memakai istilah shift/schedule.

Data jadwal:

- Karyawan.
- Cabang.
- Tanggal.
- Jam mulai.
- Jam selesai.
- Jenis jadwal: mengajar, operasional, admin, pengganti, lainnya.
- Status: scheduled, changed, cancelled.

### 5. Dynamic QR Attendance

Admin membuka halaman QR cabang di laptop.

Sistem membuat token QR yang:

- Berlaku 30 detik.
- Terikat ke cabang.
- Divalidasi oleh server.
- Tidak menyimpan data sensitif di QR.

Alur:

1. Admin membuka layar QR cabang.
2. Server menghasilkan token QR aktif.
3. QR berubah setiap 30 detik.
4. Karyawan scan QR dari PWA.
5. Aplikasi mengambil GPS.
6. Server validasi token QR, lokasi, user, waktu, dan jadwal.
7. Server menyimpan attendance event.

### 6. Attendance

Menyimpan aktivitas absensi.

Jenis event:

- check_in.
- check_out.
- leave.
- sick.
- correction.

Status event:

- valid.
- pending_review.
- rejected.
- corrected.

### 7. Correction Workflow

Untuk kasus lupa absen.

Alur:

1. Karyawan mengajukan koreksi.
2. Karyawan memilih tanggal dan jenis koreksi.
3. Karyawan upload foto bukti.
4. Owner menerima notifikasi/daftar approval.
5. Owner approve/reject.
6. Jika approved, data masuk ke attendance dan payroll.

### 8. Overtime Workflow

Lembur harus diajukan dan di-approve.

Alur:

1. Karyawan/admin membuat pengajuan lembur.
2. Isi tanggal, jam mulai, jam selesai, alasan.
3. Owner/admin approve sesuai aturan.
4. Lembur approved masuk ke payroll.

### 9. Payroll Component Engine

Payroll dibuat dari komponen dinamis.

Jenis komponen:

- earning: penambah gaji.
- deduction: potongan.
- reimbursement/allowance jika dibutuhkan nanti.

Scope komponen:

- Global.
- Per role/tipe karyawan.
- Per karyawan tertentu.

Contoh komponen:

- Gaji pokok.
- Honor per sesi.
- Tunjangan.
- Lembur.
- Potongan terlambat.
- Potongan izin/sakit.

### 10. Payroll Run

Payroll run adalah proses generate payroll untuk periode tertentu.

Periode default:

- Start: tanggal 29 bulan sebelumnya.
- End: tanggal 29 bulan berjalan.

Output:

- Ringkasan per karyawan.
- Detail komponen earning/deduction.
- Total take-home pay.
- Slip payroll.
- Status: draft, reviewed, published.

### 11. Payroll Slip dan Email

Slip payroll harus:

- Bisa dilihat di aplikasi.
- Bisa dikirim via email.
- Bisa diregenerasi jika payroll belum published.

Email:

- Sistem menyimpan status pengiriman.
- Jika gagal, admin bisa resend.

## Stack teknis yang disarankan

Pilihan praktis untuk MVP:

- Frontend dan backend: Next.js.
- Database: PostgreSQL.
- ORM: Prisma.
- Auth: Auth.js atau custom session.
- File upload: local storage untuk development, object storage untuk production.
- Email: SMTP provider, Resend, Mailgun, atau layanan email sejenis.
- PWA: service worker dan responsive UI.

Alternatif:

- Laravel + Inertia/React jika tim lebih familiar dengan PHP.
- Supabase + Next.js jika ingin auth, database, dan storage lebih cepat tersedia.

## Prinsip penting

- Server time menjadi sumber waktu utama, bukan jam HP.
- QR hanya token sementara.
- GPS digunakan sebagai validasi lokasi, bukan satu-satunya bukti.
- Semua approval harus punya audit log.
- Payroll yang sudah published tidak boleh berubah diam-diam; perubahan harus lewat adjustment atau regenerate dengan audit.

