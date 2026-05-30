import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatDateTime, formatTime, titleCaseEnum } from "@/lib/format";
import { toDateInputValue } from "@/lib/dates";

export default async function RequestsPage() {
  const user = await requireUser();
  const employee = user.employee;

  const [schedules, corrections, leaves, overtimes] = employee
    ? await Promise.all([
        prisma.schedule.findMany({
          where: { employeeId: employee.id },
          include: { branch: true },
          orderBy: { scheduleDate: "desc" },
          take: 20
        }),
        prisma.attendanceCorrection.findMany({
          where: { employeeId: employee.id },
          orderBy: { createdAt: "desc" },
          take: 30
        }),
        prisma.leaveRequest.findMany({
          where: { employeeId: employee.id },
          orderBy: { createdAt: "desc" },
          take: 30
        }),
        prisma.overtimeRequest.findMany({
          where: { employeeId: employee.id },
          orderBy: { createdAt: "desc" },
          take: 30
        })
      ])
    : [[], [], [], []];

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
    <AppShell user={user} title="Pengajuan" subtitle="Koreksi absensi, izin/sakit, dan lembur.">
      {!employee ? (
        <div className="empty-state">Akun ini belum terhubung ke data karyawan.</div>
      ) : (
        <div className="grid">
          <section className="grid three">
            <form className="card pad stack" action="/api/attendance/correction" method="post" encType="multipart/form-data">
              <h2 style={{ margin: 0 }}>Koreksi Absen</h2>
              <input type="hidden" name="employeeId" value={employee.id} />
              <label className="field">
                <span>Jadwal</span>
                <select name="scheduleId">
                  <option value="">Tanpa jadwal</option>
                  {schedules.map((schedule) => (
                    <option key={schedule.id} value={schedule.id}>
                      {formatDate(schedule.scheduleDate)} - {formatTime(schedule.startTime)} ({schedule.branch.name})
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Tanggal</span>
                <input name="correctionDate" type="date" defaultValue={toDateInputValue(new Date())} required />
              </label>
              <label className="field">
                <span>Jam Masuk</span>
                <input name="checkInTime" type="time" required />
              </label>
              <label className="field">
                <span>Jam Pulang</span>
                <input name="checkOutTime" type="time" required />
              </label>
              <label className="field">
                <span>Bukti</span>
                <input name="evidence" type="file" accept="image/*" />
              </label>
              <label className="field">
                <span>Alasan</span>
                <textarea name="reason" required />
              </label>
              <button className="button" type="submit">
                Ajukan
              </button>
            </form>

            <form className="card pad stack" action="/api/leave" method="post" encType="multipart/form-data">
              <h2 style={{ margin: 0 }}>Izin / Sakit</h2>
              <input type="hidden" name="employeeId" value={employee.id} />
              <label className="field">
                <span>Tipe</span>
                <select name="leaveType">
                  <option value="PERMISSION">Izin</option>
                  <option value="SICK">Sakit</option>
                </select>
              </label>
              <label className="field">
                <span>Mulai</span>
                <input name="startDate" type="date" defaultValue={toDateInputValue(new Date())} required />
              </label>
              <label className="field">
                <span>Selesai</span>
                <input name="endDate" type="date" defaultValue={toDateInputValue(new Date())} required />
              </label>
              <label className="field">
                <span>Bukti</span>
                <input name="evidence" type="file" accept="image/*,.pdf" />
              </label>
              <label className="field">
                <span>Alasan</span>
                <textarea name="reason" required />
              </label>
              <button className="button" type="submit">
                Ajukan
              </button>
            </form>

            <form className="card pad stack" action="/api/overtime" method="post">
              <h2 style={{ margin: 0 }}>Lembur</h2>
              <input type="hidden" name="employeeId" value={employee.id} />
              <label className="field">
                <span>Tanggal</span>
                <input name="overtimeDate" type="date" defaultValue={toDateInputValue(new Date())} required />
              </label>
              <label className="field">
                <span>Mulai</span>
                <input name="startTime" type="time" required />
              </label>
              <label className="field">
                <span>Selesai</span>
                <input name="endTime" type="time" required />
              </label>
              <label className="field">
                <span>Alasan</span>
                <textarea name="reason" required />
              </label>
              <button className="button" type="submit">
                Ajukan
              </button>
            </form>
          </section>

          <section>
            <div className="section-title">
              <h2>Riwayat Pengajuan</h2>
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
                      <td>{formatDateTime(item.date)}</td>
                      <td>{item.type}</td>
                      <td>{item.period}</td>
                      <td>{item.detail}</td>
                      <td>{item.reason}</td>
                      <td>
                        <span className={`status ${item.status === "APPROVED" ? "good" : item.status === "REJECTED" ? "bad" : "warn"}`}>
                          {titleCaseEnum(item.status)}
                        </span>
                      </td>
                      <td>
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
                      <td colSpan={7}>Belum ada riwayat pengajuan.</td>
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
