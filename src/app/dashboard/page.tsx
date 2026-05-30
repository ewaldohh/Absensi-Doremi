import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/db";
import { formatDate, formatTime, titleCaseEnum } from "@/lib/format";
import { requireUser } from "@/lib/auth";
import { startOfDay, endOfDay } from "@/lib/dates";

export default async function DashboardPage() {
  const user = await requireUser();
  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);
  const isAdmin = user.role === "ADMIN" || user.role === "OWNER";

  const [employeeCount, todayAttendance, pendingCorrections, pendingOvertime, schedules, recentAttendance] =
    await Promise.all([
      prisma.employee.count({ where: { isActive: true } }),
      prisma.attendanceEvent.count({
        where: {
          eventTime: { gte: todayStart, lte: todayEnd }
        }
      }),
      prisma.attendanceCorrection.count({ where: { status: "PENDING" } }),
      prisma.overtimeRequest.count({ where: { status: "PENDING" } }),
      prisma.schedule.findMany({
        where: {
          scheduleDate: { gte: todayStart, lte: todayEnd },
          ...(isAdmin ? {} : { employeeId: user.employee?.id ?? "__none" })
        },
        include: {
          employee: true,
          branch: true
        },
        orderBy: {
          startTime: "asc"
        },
        take: 8
      }),
      prisma.attendanceEvent.findMany({
        where: isAdmin ? {} : { employeeId: user.employee?.id ?? "__none" },
        include: {
          employee: true,
          branch: true
        },
        orderBy: {
          eventTime: "desc"
        },
        take: 8
      })
    ]);

  return (
    <AppShell
      user={user}
      title="Dashboard"
      subtitle={`${formatDate(today)} - ringkasan operasional absensi dan payroll.`}
    >
      <section className="grid three">
        <div className="card pad metric">
          <span>Karyawan aktif</span>
          <strong>{employeeCount}</strong>
        </div>
        <div className="card pad metric">
          <span>Absensi hari ini</span>
          <strong>{todayAttendance}</strong>
        </div>
        <div className="card pad metric">
          <span>Menunggu approval</span>
          <strong>{pendingCorrections + pendingOvertime}</strong>
        </div>
      </section>

      <section className="grid two" style={{ marginTop: 20 }}>
        <div>
          <div className="section-title">
            <h2>Jadwal Hari Ini</h2>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Karyawan</th>
                  <th>Jam</th>
                  <th>Tipe</th>
                  <th>Cabang</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((schedule) => (
                  <tr key={schedule.id}>
                    <td data-label="Karyawan">{schedule.employee.fullName}</td>
                    <td data-label="Jam">
                      {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                    </td>
                    <td data-label="Tipe">{titleCaseEnum(schedule.scheduleType)}</td>
                    <td data-label="Cabang">{schedule.branch.name}</td>
                  </tr>
                ))}
                {schedules.length === 0 ? (
                  <tr>
                    <td colSpan={4}>Belum ada jadwal.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="section-title">
            <h2>Absensi Terbaru</h2>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Karyawan</th>
                  <th>Waktu</th>
                  <th>Tipe</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentAttendance.map((event) => (
                  <tr key={event.id}>
                    <td data-label="Karyawan">{event.employee.fullName}</td>
                    <td data-label="Waktu">{formatTime(event.eventTime)}</td>
                    <td data-label="Tipe">{titleCaseEnum(event.eventType)}</td>
                    <td data-label="Status">
                      <span className={`status ${event.status === "VALID" ? "good" : "warn"}`}>
                        {titleCaseEnum(event.status)}
                      </span>
                    </td>
                  </tr>
                ))}
                {recentAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={4}>Belum ada absensi.</td>
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
