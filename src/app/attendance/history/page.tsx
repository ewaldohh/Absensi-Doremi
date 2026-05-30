import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { endOfDateInput, getPayrollPeriod, startOfDateInput, toDateInputValue } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { formatDateTime, titleCaseEnum } from "@/lib/format";

type AttendanceHistoryPageProps = {
  searchParams: Promise<{
    start?: string;
    end?: string;
  }>;
};

export default async function AttendanceHistoryPage({ searchParams }: AttendanceHistoryPageProps) {
  const user = await requireUser();
  const employee = user.employee;
  const params = await searchParams;
  const payrollPeriod = getPayrollPeriod();
  const startInput = params.start || toDateInputValue(payrollPeriod.periodStart);
  const endInput = params.end || toDateInputValue(payrollPeriod.periodEnd);
  const startDate = startOfDateInput(startInput);
  const endDate = endOfDateInput(endInput);

  const events = employee
    ? await prisma.attendanceEvent.findMany({
        where: {
          employeeId: employee.id,
          eventTime: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          branch: true,
          schedule: true
        },
        orderBy: { eventTime: "desc" },
        take: 200
      })
    : [];

  return (
    <AppShell user={user} title="Riwayat Absensi" subtitle="Cari riwayat absen berdasarkan rentang tanggal.">
      {!employee ? (
        <div className="empty-state">Akun ini belum terhubung ke data karyawan.</div>
      ) : (
        <div className="grid">
          <nav className="subnav" aria-label="Sub menu absensi">
            <a className="subnav-link" href="/attendance">
              Absen Hari Ini
            </a>
            <a className="subnav-link active" href="/attendance/history">
              Riwayat Absensi
            </a>
          </nav>

          <section className="card pad stack">
            <form className="form-grid" method="get">
              <section className="grid two">
                <label className="field">
                  <span>Mulai</span>
                  <input name="start" type="date" defaultValue={startInput} required />
                </label>
                <label className="field">
                  <span>Selesai</span>
                  <input name="end" type="date" defaultValue={endInput} required />
                </label>
              </section>
              <button className="button secondary" type="submit">
                Cari Riwayat
              </button>
            </form>
          </section>

          <section>
            <div className="section-title">
              <h2>Riwayat Saya</h2>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Waktu</th>
                    <th>Tipe</th>
                    <th>Cabang</th>
                    <th>Sumber</th>
                    <th>Status</th>
                    <th>Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.id}>
                      <td data-label="Waktu">{formatDateTime(event.eventTime)}</td>
                      <td data-label="Tipe">{titleCaseEnum(event.eventType)}</td>
                      <td data-label="Cabang">{event.branch.name}</td>
                      <td data-label="Sumber">{titleCaseEnum(event.source)}</td>
                      <td data-label="Status">
                        <span className={`status ${event.status === "VALID" ? "good" : event.status === "REJECTED" ? "bad" : "warn"}`}>
                          {titleCaseEnum(event.status)}
                        </span>
                      </td>
                      <td data-label="Catatan">{event.notes ?? "-"}</td>
                    </tr>
                  ))}
                  {events.length === 0 ? (
                    <tr>
                      <td colSpan={6}>Tidak ada riwayat absensi pada rentang tanggal ini.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}
