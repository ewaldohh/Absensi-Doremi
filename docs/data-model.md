# Model Data Awal

Dokumen ini adalah rancangan awal tabel inti. Nama tabel dan kolom bisa disesuaikan saat implementasi.

## users

Menyimpan akun login.

- id
- name
- email
- password_hash
- role: employee, admin, owner
- is_active
- created_at
- updated_at

## employees

Menyimpan profil guru/karyawan.

- id
- user_id
- employee_code
- full_name
- phone
- employment_type: full_time, part_time, support, other
- default_branch_id
- start_date
- end_date
- is_active
- created_at
- updated_at

## branches

Menyimpan data cabang.

- id
- name
- address
- latitude
- longitude
- gps_radius_meters
- is_active
- created_at
- updated_at

## schedules

Menyimpan jadwal fleksibel.

- id
- employee_id
- branch_id
- schedule_date
- start_time
- end_time
- schedule_type: teaching, operational, admin, substitute, other
- status: scheduled, changed, cancelled
- notes
- created_by
- updated_by
- created_at
- updated_at

## qr_tokens

Menyimpan token QR dinamis cabang.

- id
- branch_id
- token_hash
- valid_from
- valid_until
- status: active, expired, revoked
- created_at

Catatan: token asli tidak perlu disimpan sebagai plain text. Server cukup menyimpan hash token.

## attendance_events

Menyimpan aktivitas absensi.

- id
- employee_id
- branch_id
- schedule_id
- event_type: check_in, check_out
- event_time
- source: qr_gps, manual_correction, admin_adjustment
- qr_token_id
- latitude
- longitude
- distance_meters
- status: valid, pending_review, rejected, corrected
- notes
- created_at
- updated_at

## attendance_corrections

Menyimpan pengajuan koreksi lupa absen.

- id
- employee_id
- schedule_id
- correction_date
- correction_type: check_in, check_out
- requested_time
- reason
- evidence_file_url
- status: pending, approved, rejected
- reviewed_by
- reviewed_at
- review_notes
- created_at
- updated_at

## leave_requests

Menyimpan izin dan sakit.

- id
- employee_id
- leave_type: permission, sick
- start_date
- end_date
- total_days
- reason
- evidence_file_url
- status: pending, approved, rejected
- reviewed_by
- reviewed_at
- review_notes
- created_at
- updated_at

## overtime_requests

Menyimpan pengajuan lembur.

- id
- employee_id
- schedule_id
- overtime_date
- start_time
- end_time
- total_minutes
- reason
- status: pending, approved, rejected
- reviewed_by
- reviewed_at
- review_notes
- created_at
- updated_at

## payroll_components

Master komponen payroll dinamis.

- id
- name
- component_type: earning, deduction
- calculation_type: fixed, per_day, per_hour, per_session, formula
- default_amount
- is_taxable
- is_active
- created_at
- updated_at

Contoh:

- Gaji pokok.
- Honor mengajar.
- Lembur.
- Potongan terlambat.
- Potongan izin/sakit.

## employee_payroll_components

Menghubungkan komponen payroll ke karyawan tertentu.

- id
- employee_id
- payroll_component_id
- amount
- effective_from
- effective_until
- is_active
- created_at
- updated_at

## payroll_runs

Batch payroll untuk satu periode.

- id
- period_start
- period_end
- status: draft, reviewed, published
- generated_by
- generated_at
- published_by
- published_at
- created_at
- updated_at

## payroll_items

Payroll per karyawan dalam satu payroll run.

- id
- payroll_run_id
- employee_id
- gross_earnings
- total_deductions
- net_pay
- status: draft, published
- email_status: not_sent, pending, sent, failed
- email_sent_at
- created_at
- updated_at

## payroll_item_lines

Detail komponen payroll per karyawan.

- id
- payroll_item_id
- payroll_component_id
- component_name
- component_type: earning, deduction
- quantity
- rate
- amount
- source_type: manual, attendance, overtime, leave, system
- source_id
- notes
- created_at

## audit_logs

Mencatat aktivitas penting.

- id
- actor_user_id
- action
- entity_type
- entity_id
- before_json
- after_json
- created_at

## app_settings

Menyimpan konfigurasi aplikasi yang dapat diubah dari halaman Settings.

- key
- value
- updated_by
- created_at
- updated_at

Contoh key:

- lateDeductionAmount
- leaveFreeDays
- leaveDeductionAmount
- smtpHost
- smtpPort
- smtpUser
- smtpPass
- smtpFrom

## Aturan payroll yang perlu diterjemahkan ke kode

### Telat

- Jika check_in lebih dari 15 menit setelah schedule.start_time, buat deduction Rp15.000.
- Deduction dihitung per hari keterlambatan.

### Izin/sakit

- Hitung total izin/sakit approved dalam periode payroll.
- Default kuota bebas deduction adalah 2 hari.
- Deduction Rp100.000/hari dimulai hari ke-3.
- Nilai kuota dan deduction dapat diubah dari AppSetting.

### Lembur

- Hanya overtime_requests dengan status approved yang masuk payroll.
- Nilai lembur diambil dari komponen payroll karyawan atau aturan formula.
