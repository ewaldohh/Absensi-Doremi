import { AppShell } from "@/components/app-shell";
import { requireRole, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatTime, titleCaseEnum } from "@/lib/format";
import { toDateInputValue } from "@/lib/dates";

export default async function SchedulesPage() {
  const user = await requireUser();
  requireRole(user, ["ADMIN", "OWNER"]);

  const [employees, branches, schedules] = await Promise.all([
    prisma.employee.findMany({ where: { isActive: true }, orderBy: { fullName: "asc" } }),
    prisma.branch.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.schedule.findMany({
      include: { employee: true, branch: true },
      orderBy: [{ scheduleDate: "desc" }, { startTime: "asc" }],
      take: 30
    })
  ]);

  return (
    <AppShell user={user} title="Jadwal" subtitle="Shift fleksibel untuk guru dan karyawan penunjang.">
      <section className="grid two">
        <form className="card pad stack" action="/api/schedules" method="post">
          <h2 style={{ margin: 0 }}>Tambah Jadwal</h2>
          <div className="form-grid">
            <label className="field">
              <span>Karyawan</span>
              <select name="employeeId" required>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Cabang</span>
              <select name="branchId" required>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Tanggal</span>
              <input name="scheduleDate" type="date" defaultValue={toDateInputValue(new Date())} required />
            </label>
            <label className="field">
              <span>Jam mulai</span>
              <input name="startTime" type="time" defaultValue="08:00" required />
            </label>
            <label className="field">
              <span>Jam selesai</span>
              <input name="endTime" type="time" defaultValue="16:00" required />
            </label>
            <label className="field">
              <span>Tipe</span>
              <select name="scheduleType" defaultValue="OTHER">
                <option value="TEACHING">Teaching</option>
                <option value="OPERATIONAL">Operational</option>
                <option value="ADMIN">Admin</option>
                <option value="SUBSTITUTE">Substitute</option>
                <option value="OTHER">Other</option>
              </select>
            </label>
            <label className="field">
              <span>Catatan</span>
              <textarea name="notes" />
            </label>
          </div>
          <button className="button" type="submit">
            Simpan
          </button>
        </form>

        <div>
          <div className="section-title">
            <h2>Jadwal Terbaru</h2>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Karyawan</th>
                  <th>Jam</th>
                  <th>Tipe</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((schedule) => (
                  <tr key={schedule.id}>
                    <td data-label="Tanggal">{formatDate(schedule.scheduleDate)}</td>
                    <td data-label="Karyawan">{schedule.employee.fullName}</td>
                    <td data-label="Jam">
                      {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                    </td>
                    <td data-label="Tipe">{titleCaseEnum(schedule.scheduleType)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
