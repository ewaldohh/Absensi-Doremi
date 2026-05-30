import { AppShell } from "@/components/app-shell";
import { requireRole, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { titleCaseEnum } from "@/lib/format";

export default async function EmployeesPage() {
  const user = await requireUser();
  requireRole(user, ["ADMIN", "OWNER"]);

  const [employees, branches] = await Promise.all([
    prisma.employee.findMany({
      include: {
        user: true,
        defaultBranch: true
      },
      orderBy: {
        fullName: "asc"
      }
    }),
    prisma.branch.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" }
    })
  ]);

  return (
    <AppShell user={user} title="Karyawan" subtitle="Data guru dan karyawan penunjang.">
      <section className="grid two">
        <form className="card pad stack" action="/api/employees" method="post">
          <h2 style={{ margin: 0 }}>Tambah Karyawan</h2>
          <div className="form-grid">
            <label className="field">
              <span>Nama</span>
              <input name="fullName" required />
            </label>
            <label className="field">
              <span>Email</span>
              <input name="email" type="email" required />
            </label>
            <label className="field">
              <span>Password awal</span>
              <input name="password" type="text" defaultValue="bimba123" required />
            </label>
            <label className="field">
              <span>Kode</span>
              <input name="employeeCode" required />
            </label>
            <label className="field">
              <span>Role akses</span>
              <select name="role" defaultValue="EMPLOYEE">
                <option value="EMPLOYEE">Employee</option>
                <option value="ADMIN">Admin</option>
                <option value="OWNER">Owner</option>
              </select>
            </label>
            <label className="field">
              <span>Tipe karyawan</span>
              <select name="employmentType" defaultValue="OTHER">
                <option value="FULL_TIME">Full time</option>
                <option value="PART_TIME">Part time</option>
                <option value="SUPPORT">Support</option>
                <option value="OTHER">Other</option>
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
              <span>No. HP</span>
              <input name="phone" />
            </label>
          </div>
          <button className="button" type="submit">
            Simpan
          </button>
        </form>

        <div>
          <div className="section-title">
            <h2>Daftar Karyawan</h2>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Email</th>
                  <th>Tipe</th>
                  <th>Cabang</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id}>
                    <td>{employee.fullName}</td>
                    <td>{employee.user.email}</td>
                    <td>{titleCaseEnum(employee.employmentType)}</td>
                    <td>{employee.defaultBranch?.name ?? "-"}</td>
                    <td>
                      <span className={`status ${employee.isActive ? "good" : "bad"}`}>
                        {employee.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
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
