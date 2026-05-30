# Requirement Aplikasi Absensi dan Payroll Bimba

## Tujuan utama

Sistem ini dibuat untuk menjadikan data absensi sebagai sumber utama perhitungan payroll, mengurangi rekap manual, mengurangi lupa absen, dan memudahkan distribusi slip payroll ke karyawan.

Masalah utama saat ini:

- Guru sering lupa absen.
- Ada guru/karyawan yang memakai iPhone, sehingga aplikasi tidak boleh bergantung pada Android saja.
- Data absensi dan payroll masih perlu disesuaikan secara manual.
- Slip/data payroll masih dikirim satu per satu lewat WhatsApp.

## Pengguna

### Guru / Karyawan

Pengguna yang melakukan absensi, melihat jadwal, mengajukan koreksi, mengajukan izin/sakit, mengajukan lembur, dan melihat slip payroll.

Catatan: sistem tidak boleh terlalu kaku untuk guru saja, karena karyawan penunjang juga akan menggunakan aplikasi.

### Admin

Pengguna yang mengelola data karyawan, jadwal, absensi, QR cabang, pengajuan izin/sakit, lembur, dan koreksi absensi.

### Owner

Pengguna yang melakukan approval penting, terutama koreksi absensi, lembur, dan payroll.

## Kondisi operasional

- Saat ini hanya ada 1 cabang.
- Sistem harus disiapkan agar bisa mendukung multi-cabang di masa depan.
- Ada karyawan tetap dan part-time.
- Jadwal sering berubah.
- Saat ini guru hanya mengajar di cabang yang sama.
- Sistem jadwal harus fleksibel untuk guru dan karyawan non-guru.

## Jenis absensi dan aktivitas

Sistem minimal harus mendukung:

- Masuk.
- Pulang.
- Izin.
- Sakit.
- Terlambat.
- Lembur.
- Ganti jadwal.
- Koreksi lupa absen.

## Aturan absensi

- Karyawan dianggap terlambat jika absen masuk lebih dari 15 menit setelah jadwal mulai.
- Keterlambatan dikenakan deduction payroll Rp15.000 per hari.
- Absen masuk boleh dilakukan sebelum jadwal mulai.
- Absen pulang boleh dilakukan sebelum waktu pulang.
- Jika lupa absen, karyawan boleh mengajukan koreksi mandiri.
- Koreksi lupa absen wajib melampirkan foto bukti, misalnya CCTV atau story Instagram.
- Koreksi lupa absen wajib melalui approval owner.

## Validasi absensi

Metode validasi utama:

- QR dinamis.
- GPS.

Aturan QR:

- QR ditampilkan di laptop/perangkat admin di cabang.
- QR berubah setiap 30 detik.
- QR sebaiknya hanya berisi token sementara, bukan data sensitif.
- Server harus memvalidasi token QR, lokasi, dan waktu.

Aturan GPS:

- Setiap cabang memiliki titik latitude/longitude dan radius toleransi.
- Absensi valid jika pengguna berada dalam radius cabang.
- Jika GPS gagal atau di luar radius, sistem dapat menolak absensi atau menandainya sebagai perlu review admin/owner.

## Payroll

Payroll harus menggunakan komponen yang dinamis karena:

- Ada komponen yang berlaku untuk beberapa karyawan.
- Ada komponen yang hanya berlaku untuk karyawan tertentu.
- Struktur payroll bisa berbeda antara guru tetap, part-time, dan karyawan penunjang.

Periode payroll:

- Dari tanggal 29 bulan sebelumnya sampai tanggal 29 bulan berjalan.

Aturan deduction:

- Terlambat lebih dari 15 menit: deduction Rp15.000 per hari.
- Izin/sakit bebas deduction sampai 2 hari dalam satu periode payroll.
- Deduction izin/sakit dimulai dari hari ke-3.
- Deduction izin/sakit adalah Rp100.000 per hari.

Catatan yang perlu dikonfirmasi sebelum implementasi final:

- Apakah izin dan sakit digabung dalam satu kuota, atau masing-masing punya kuota sendiri.

## Lembur

- Lembur harus diajukan oleh karyawan/admin.
- Lembur wajib di-approve sebelum masuk ke payroll.
- Nilai lembur sebaiknya dihitung oleh komponen payroll yang bisa dikonfigurasi.

## Slip payroll

- Slip payroll harus bisa dilihat di aplikasi.
- Slip payroll wajib bisa dikirim via email.
- Sistem sebaiknya menyimpan status pengiriman email, misalnya pending, sent, failed.
- SMTP dapat diatur dari halaman Settings karena saat ini belum ada provider email tetap.

## Prioritas MVP

MVP yang disarankan:

1. Login dan role pengguna.
2. Data karyawan.
3. Data cabang.
4. Jadwal fleksibel.
5. QR dinamis cabang.
6. Absensi masuk/pulang dengan QR + GPS.
7. Pengajuan koreksi lupa absen dengan upload bukti.
8. Approval owner untuk koreksi.
9. Pengajuan izin/sakit.
10. Pengajuan dan approval lembur.
11. Komponen payroll dinamis.
12. Generate payroll periode 29-29.
13. Slip payroll di aplikasi.
14. Kirim slip payroll via email.
15. Export data payroll.
