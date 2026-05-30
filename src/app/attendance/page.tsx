import { AttendanceConsole } from "@/components/attendance-console";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { endOfDay, startOfDay } from "@/lib/dates";
import { formatDateTime, formatTime, titleCaseEnum } from "@/lib/format";

export default async function AttendancePage() {
  const user = await requireUser();
  const employee = user.employee;

  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  const [schedules, events, historyEvents] = employee
    ? await Promise.all([
        prisma.schedule.findMany({
          where: {
            employeeId: employee.id,
            scheduleDate: { gte: todayStart, lte: todayEnd }
          },
          include: { branch: true },
          orderBy: { startTime: "asc" }
        }),
        prisma.attendanceEvent.findMany({
          where: {
            employeeId: employee.id,
            eventTime: { gte: todayStart, lte: todayEnd }
          },
          include: { branch: true },
          orderBy: { eventTime: "desc" }
        }),
        prisma.attendanceEvent.findMany({
          where: {
            employeeId: employee.id
          },
          include: { branch: true },
          orderBy: { eventTime: "desc" },
          take: 40
        })
      ])
    : [[], [], []];

  return (
    <AppShell user={user} title="Absensi" subtitle="Check-in dan check-out menggunakan QR cabang.">
      {!employee ? (
        <div className="empty-state">Akun ini belum terhubung ke data karyawan.</div>
      ) : (
        <div className="grid">
          <AttendanceConsole employeeName={employee.fullName} />

          <section className="grid two">
            <div>
              <div className="section-title">
                <h2>Jadwal Hari Ini</h2>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Jam</th>
                      <th>Tipe</th>
                      <th>Cabang</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedules.map((schedule) => (
                      <tr key={schedule.id}>
                        <td>
                          {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                        </td>
                        <td>{titleCaseEnum(schedule.scheduleType)}</td>
                        <td>{schedule.branch.name}</td>
                        <td>
                          <span className="status info">{titleCaseEnum(schedule.status)}</span>
                        </td>
                      </tr>
                    ))}
                    {schedules.length === 0 ? (
                      <tr>
                        <td colSpan={4}>Belum ada jadwal hari ini.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <div className="section-title">
                <h2>Absensi Hari Ini</h2>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Waktu</th>
                      <th>Tipe</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event) => (
                      <tr key={event.id}>
                        <td>{formatDateTime(event.eventTime)}</td>
                        <td>{titleCaseEnum(event.eventType)}</td>
                        <td>
                          <span className={`status ${event.status === "VALID" ? "good" : "warn"}`}>
                            {titleCaseEnum(event.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {events.length === 0 ? (
                      <tr>
                        <td colSpan={3}>Belum ada absensi hari ini.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section>
            <div className="section-title">
              <h2>Riwayat Absensi Saya</h2>
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
                  </tr>
                </thead>
                <tbody>
                  {historyEvents.map((event) => (
                    <tr key={event.id}>
                      <td>{formatDateTime(event.eventTime)}</td>
                      <td>{titleCaseEnum(event.eventType)}</td>
                      <td>{event.branch.name}</td>
                      <td>{titleCaseEnum(event.source)}</td>
                      <td>
                        <span className={`status ${event.status === "VALID" ? "good" : event.status === "REJECTED" ? "bad" : "warn"}`}>
                          {titleCaseEnum(event.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {historyEvents.length === 0 ? (
                    <tr>
                      <td colSpan={5}>Belum ada riwayat absensi.</td>
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
