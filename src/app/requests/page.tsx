import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatTime } from "@/lib/format";
import { toDateInputValue } from "@/lib/dates";

export default async function RequestsPage() {
  const user = await requireUser();
  const employee = user.employee;

  const schedules = employee
    ? await prisma.schedule.findMany({
        where: { employeeId: employee.id },
        include: { branch: true },
        orderBy: { scheduleDate: "desc" },
        take: 20
      })
    : [];

  return (
    <AppShell user={user} title="Pengajuan" subtitle="Koreksi absensi, izin/sakit, dan lembur.">
      {!employee ? (
        <div className="empty-state">Akun ini belum terhubung ke data karyawan.</div>
      ) : (
        <div className="grid">
          <nav className="subnav" aria-label="Sub menu pengajuan">
            <a className="subnav-link active" href="/requests">
              Buat Pengajuan
            </a>
            <a className="subnav-link" href="/requests/history">
              Riwayat Pengajuan
            </a>
          </nav>

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
        </div>
      )}
    </AppShell>
  );
}
