import { AttendanceSubnav } from "@/components/attendance-subnav";
import { AppShell } from "@/components/app-shell";
import { requireRole, requireUser } from "@/lib/auth";
import { getPayrollPeriod } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { formatDate, formatDateTime, titleCaseEnum } from "@/lib/format";

type AttendanceImportPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function AttendanceImportPage({ searchParams }: AttendanceImportPageProps) {
  const user = await requireUser();
  requireRole(user, ["ADMIN", "OWNER"]);
  const params = await searchParams;
  const payrollPeriod = getPayrollPeriod();
  const importedEvents = await prisma.attendanceEvent.findMany({
    where: {
      source: "ADMIN_ADJUSTMENT"
    },
    include: {
      employee: true,
      branch: true
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 20
  });

  return (
    <AppShell user={user} title="Import Absensi" subtitle="Migrasi data absensi lama dari template Excel.">
      <div className="grid">
        <AttendanceSubnav active="import" role={user.role} />

        {params.error ? <div className="notice error">{params.error}</div> : null}
        {params.success ? <div className="notice">{params.success}</div> : null}

        <section className="grid two">
          <div className="card pad stack">
            <h2 style={{ margin: 0 }}>Download Template</h2>
            <p style={{ color: "var(--muted)", margin: 0 }}>
              Isi satu baris per karyawan per tanggal. Kolom jadwal masuk/pulang dipakai untuk menghitung terlambat saat generate payroll.
            </p>
            <a className="button" href="/api/attendance/import/template">
              Download Excel Template
            </a>
          </div>

          <form className="card pad stack" action="/api/attendance/import" method="post" encType="multipart/form-data">
            <h2 style={{ margin: 0 }}>Upload Template</h2>
            <label className="field">
              <span>File Excel</span>
              <input name="file" type="file" accept=".xlsx,.xls" required />
            </label>
            <button className="button" type="submit">
              Upload dan Migrasi
            </button>
          </form>
        </section>

        <section className="card pad stack">
          <h2 style={{ margin: 0 }}>Test Payroll Bulan Lalu</h2>
          <p style={{ color: "var(--muted)", margin: 0 }}>
            Setelah import berhasil, owner bisa generate payroll untuk periode {formatDate(payrollPeriod.periodStart)} sampai{" "}
            {formatDate(payrollPeriod.periodEnd)} dari halaman Payroll.
          </p>
          <a className="button secondary" href="/payroll">
            Buka Payroll
          </a>
        </section>

        <section>
          <div className="section-title">
            <h2>Import Terbaru</h2>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Karyawan</th>
                  <th>Waktu</th>
                  <th>Tipe</th>
                  <th>Cabang</th>
                  <th>Status</th>
                  <th>Catatan</th>
                </tr>
              </thead>
              <tbody>
                {importedEvents.map((event) => (
                  <tr key={event.id}>
                    <td data-label="Karyawan">{event.employee.fullName}</td>
                    <td data-label="Waktu">{formatDateTime(event.eventTime)}</td>
                    <td data-label="Tipe">{titleCaseEnum(event.eventType)}</td>
                    <td data-label="Cabang">{event.branch.name}</td>
                    <td data-label="Status">
                      <span className={`status ${event.status === "VALID" ? "good" : event.status === "REJECTED" ? "bad" : "warn"}`}>
                        {titleCaseEnum(event.status)}
                      </span>
                    </td>
                    <td data-label="Catatan">{event.notes ?? "-"}</td>
                  </tr>
                ))}
                {importedEvents.length === 0 ? (
                  <tr>
                    <td colSpan={6}>Belum ada data absensi hasil import.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
