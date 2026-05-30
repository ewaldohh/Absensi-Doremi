import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { endOfDateInput, getPayrollPeriod, startOfDateInput, toDateInputValue } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { formatDate, formatDateTime, formatTime, titleCaseEnum } from "@/lib/format";

type RequestsHistoryPageProps = {
  searchParams: Promise<{
    start?: string;
    end?: string;
  }>;
};

export default async function RequestsHistoryPage({ searchParams }: RequestsHistoryPageProps) {
  const user = await requireUser();
  const employee = user.employee;
  const params = await searchParams;
  const payrollPeriod = getPayrollPeriod();
  const startInput = params.start || toDateInputValue(payrollPeriod.periodStart);
  const endInput = params.end || toDateInputValue(payrollPeriod.periodEnd);
  const startDate = startOfDateInput(startInput);
  const endDate = endOfDateInput(endInput);

  const [corrections, leaves, overtimes] = employee
    ? await Promise.all([
        prisma.attendanceCorrection.findMany({
          where: {
            employeeId: employee.id,
            correctionDate: {
              gte: startDate,
              lte: endDate
            }
          },
          orderBy: { createdAt: "desc" },
          take: 100
        }),
        prisma.leaveRequest.findMany({
          where: {
            employeeId: employee.id,
            startDate: {
              lte: endDate
            },
            endDate: {
              gte: startDate
            }
          },
          orderBy: { createdAt: "desc" },
          take: 100
        }),
        prisma.overtimeRequest.findMany({
          where: {
            employeeId: employee.id,
            overtimeDate: {
              gte: startDate,
              lte: endDate
            }
          },
          orderBy: { createdAt: "desc" },
          take: 100
        })
      ])
    : [[], [], []];

  const requestRows = [
    ...corrections.map((item) => ({
      id: item.id,
      date: item.createdAt,
      type: "Koreksi Absensi",
      period: formatDate(item.correctionDate),
      detail:
        item.requestedCheckIn || item.requestedCheckOut
          ? `Masuk ${formatOptionalTime(item.requestedCheckIn)} / Pulang ${formatOptionalTime(item.requestedCheckOut)}`
          : `${titleCaseEnum(item.correctionType)} ${formatDateTime(item.requestedTime)}`,
      reason: item.reason,
      status: item.status,
      reviewedAt: item.reviewedAt,
      reviewNotes: item.reviewNotes
    })),
    ...leaves.map((item) => ({
      id: item.id,
      date: item.createdAt,
      type: titleCaseEnum(item.leaveType),
      period: `${formatDate(item.startDate)} - ${formatDate(item.endDate)}`,
      detail: `${item.totalDays} hari`,
      reason: item.reason,
      status: item.status,
      reviewedAt: item.reviewedAt,
      reviewNotes: item.reviewNotes
    })),
    ...overtimes.map((item) => ({
      id: item.id,
      date: item.createdAt,
      type: "Lembur",
      period: formatDate(item.overtimeDate),
      detail: `${formatTime(item.startTime)} - ${formatTime(item.endTime)} (${item.totalMinutes} menit)`,
      reason: item.reason,
      status: item.status,
      reviewedAt: item.reviewedAt,
      reviewNotes: item.reviewNotes
    }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <AppShell user={user} title="Riwayat Pengajuan" subtitle="Cari status koreksi absen, izin/sakit, dan lembur.">
      {!employee ? (
        <div className="empty-state">Akun ini belum terhubung ke data karyawan.</div>
      ) : (
        <div className="grid">
          <nav className="subnav" aria-label="Sub menu pengajuan">
            <a className="subnav-link" href="/requests">
              Buat Pengajuan
            </a>
            <a className="subnav-link active" href="/requests/history">
              Riwayat Pengajuan
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
                    <th>Diajukan</th>
                    <th>Jenis</th>
                    <th>Periode</th>
                    <th>Detail</th>
                    <th>Alasan</th>
                    <th>Status</th>
                    <th>Review</th>
                  </tr>
                </thead>
                <tbody>
                  {requestRows.map((item) => (
                    <tr key={`${item.type}-${item.id}`}>
                      <td data-label="Diajukan">{formatDateTime(item.date)}</td>
                      <td data-label="Jenis">{item.type}</td>
                      <td data-label="Periode">{item.period}</td>
                      <td data-label="Detail">{item.detail}</td>
                      <td data-label="Alasan">{item.reason}</td>
                      <td data-label="Status">
                        <span className={`status ${item.status === "APPROVED" ? "good" : item.status === "REJECTED" ? "bad" : "warn"}`}>
                          {titleCaseEnum(item.status)}
                        </span>
                      </td>
                      <td data-label="Review">
                        {item.reviewedAt ? (
                          <>
                            {formatDateTime(item.reviewedAt)}
                            {item.reviewNotes ? ` - ${item.reviewNotes}` : ""}
                          </>
                        ) : (
                          "Menunggu review"
                        )}
                      </td>
                    </tr>
                  ))}
                  {requestRows.length === 0 ? (
                    <tr>
                      <td colSpan={7}>Tidak ada riwayat pengajuan pada rentang tanggal ini.</td>
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

function formatOptionalTime(value: Date | null) {
  return value ? formatTime(value) : "-";
}
