import { AppShell } from "@/components/app-shell";
import { requireRole, requireUser } from "@/lib/auth";
import { getPayrollPeriod, toDateInputValue } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { formatDate, formatDateTime, formatTime, titleCaseEnum } from "@/lib/format";

type ReportsPageProps = {
  searchParams: Promise<{
    start?: string;
    end?: string;
    employeeId?: string;
  }>;
};

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const user = await requireUser();
  requireRole(user, ["ADMIN", "OWNER"]);

  const params = await searchParams;
  const payrollPeriod = getPayrollPeriod();
  const startInput = params.start || toDateInputValue(payrollPeriod.periodStart);
  const endInput = params.end || toDateInputValue(payrollPeriod.periodEnd);
  const employeeId = params.employeeId || "";
  const startDate = new Date(`${startInput}T00:00:00`);
  const endDate = new Date(`${endInput}T23:59:59`);
  const employeeFilter = employeeId ? { employeeId } : {};
  const exportQuery = new URLSearchParams({
    start: startInput,
    end: endInput
  });

  if (employeeId) {
    exportQuery.set("employeeId", employeeId);
  }

  const [employees, attendanceCount, correctionCount, leaveCount, overtimeCount, attendancePreview, corrections, leaves, overtimes] =
    await Promise.all([
      prisma.employee.findMany({
        where: { isActive: true },
        include: { user: true },
        orderBy: { fullName: "asc" }
      }),
      prisma.attendanceEvent.count({
        where: {
          ...employeeFilter,
          eventTime: { gte: startDate, lte: endDate }
        }
      }),
      prisma.attendanceCorrection.count({
        where: {
          ...employeeFilter,
          correctionDate: { gte: startDate, lte: endDate }
        }
      }),
      prisma.leaveRequest.count({
        where: {
          ...employeeFilter,
          startDate: { lte: endDate },
          endDate: { gte: startDate }
        }
      }),
      prisma.overtimeRequest.count({
        where: {
          ...employeeFilter,
          overtimeDate: { gte: startDate, lte: endDate }
        }
      }),
      prisma.attendanceEvent.findMany({
        where: {
          ...employeeFilter,
          eventTime: { gte: startDate, lte: endDate }
        },
        include: {
          employee: true,
          branch: true
        },
        orderBy: { eventTime: "desc" },
        take: 12
      }),
      prisma.attendanceCorrection.findMany({
        where: {
          ...employeeFilter,
          correctionDate: { gte: startDate, lte: endDate }
        },
        include: { employee: true },
        orderBy: { createdAt: "desc" },
        take: 8
      }),
      prisma.leaveRequest.findMany({
        where: {
          ...employeeFilter,
          startDate: { lte: endDate },
          endDate: { gte: startDate }
        },
        include: { employee: true },
        orderBy: { createdAt: "desc" },
        take: 8
      }),
      prisma.overtimeRequest.findMany({
        where: {
          ...employeeFilter,
          overtimeDate: { gte: startDate, lte: endDate }
        },
        include: { employee: true },
        orderBy: { createdAt: "desc" },
        take: 8
      })
    ]);

  const requestPreview = [
    ...corrections.map((item) => ({
      id: item.id,
      employeeName: item.employee.fullName,
      category: "Koreksi Absensi",
      period: formatDate(item.correctionDate),
      detail:
        item.requestedCheckIn || item.requestedCheckOut
          ? `Masuk ${formatOptionalTime(item.requestedCheckIn)} / Pulang ${formatOptionalTime(item.requestedCheckOut)}`
          : `${titleCaseEnum(item.correctionType)} ${formatTime(item.requestedTime)}`,
      status: item.status,
      createdAt: item.createdAt
    })),
    ...leaves.map((item) => ({
      id: item.id,
      employeeName: item.employee.fullName,
      category: titleCaseEnum(item.leaveType),
      period: `${formatDate(item.startDate)} - ${formatDate(item.endDate)}`,
      detail: `${item.totalDays} hari`,
      status: item.status,
      createdAt: item.createdAt
    })),
    ...overtimes.map((item) => ({
      id: item.id,
      employeeName: item.employee.fullName,
      category: "Lembur",
      period: formatDate(item.overtimeDate),
      detail: `${formatTime(item.startTime)} - ${formatTime(item.endTime)} (${item.totalMinutes} menit)`,
      status: item.status,
      createdAt: item.createdAt
    }))
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <AppShell user={user} title="Rekap Riwayat" subtitle="Export riwayat absensi dan pengajuan untuk Excel.">
      <section className="card pad stack">
        <form className="form-grid" method="get">
          <section className="grid three">
            <label className="field">
              <span>Mulai</span>
              <input name="start" type="date" defaultValue={startInput} required />
            </label>
            <label className="field">
              <span>Selesai</span>
              <input name="end" type="date" defaultValue={endInput} required />
            </label>
            <label className="field">
              <span>Karyawan</span>
              <select name="employeeId" defaultValue={employeeId}>
                <option value="">Semua karyawan</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName} - {employee.user.email}
                  </option>
                ))}
              </select>
            </label>
          </section>
          <div className="inline-actions">
            <button className="button secondary" type="submit">
              Terapkan Filter
            </button>
            <a className="button" href={`/api/reports/export?type=all&${exportQuery.toString()}`}>
              Download Semua
            </a>
            <a className="button secondary" href={`/api/reports/export?type=attendance&${exportQuery.toString()}`}>
              Download Absensi
            </a>
            <a className="button secondary" href={`/api/reports/export?type=requests&${exportQuery.toString()}`}>
              Download Pengajuan
            </a>
          </div>
        </form>
      </section>

      <section className="grid four report-metrics" style={{ marginTop: 20 }}>
        <div className="card pad metric">
          <span>Absensi</span>
          <strong>{attendanceCount}</strong>
        </div>
        <div className="card pad metric">
          <span>Koreksi</span>
          <strong>{correctionCount}</strong>
        </div>
        <div className="card pad metric">
          <span>Izin/Sakit</span>
          <strong>{leaveCount}</strong>
        </div>
        <div className="card pad metric">
          <span>Lembur</span>
          <strong>{overtimeCount}</strong>
        </div>
      </section>

      <section className="grid two" style={{ marginTop: 20 }}>
        <div>
          <div className="section-title">
            <h2>Preview Absensi</h2>
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
                </tr>
              </thead>
              <tbody>
                {attendancePreview.map((event) => (
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
                  </tr>
                ))}
                {attendancePreview.length === 0 ? (
                  <tr>
                    <td colSpan={5}>Tidak ada absensi pada filter ini.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="section-title">
            <h2>Preview Pengajuan</h2>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Karyawan</th>
                  <th>Jenis</th>
                  <th>Periode</th>
                  <th>Detail</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {requestPreview.map((item) => (
                  <tr key={`${item.category}-${item.id}`}>
                    <td data-label="Karyawan">{item.employeeName}</td>
                    <td data-label="Jenis">{item.category}</td>
                    <td data-label="Periode">{item.period}</td>
                    <td data-label="Detail">{item.detail}</td>
                    <td data-label="Status">
                      <span className={`status ${item.status === "APPROVED" ? "good" : item.status === "REJECTED" ? "bad" : "warn"}`}>
                        {titleCaseEnum(item.status)}
                      </span>
                    </td>
                  </tr>
                ))}
                {requestPreview.length === 0 ? (
                  <tr>
                    <td colSpan={5}>Tidak ada pengajuan pada filter ini.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </AppShell>
  );
}

function formatOptionalTime(value: Date | null) {
  return value ? formatTime(value) : "-";
}
