import { AppShell } from "@/components/app-shell";
import { requireRole, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { titleCaseEnum } from "@/lib/format";

type EmployeesPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function EmployeesPage({ searchParams }: EmployeesPageProps) {
  const user = await requireUser();
  requireRole(user, ["ADMIN", "OWNER"]);
  const params = await searchParams;

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
      <section className="grid">
        {params.error ? <div className="notice error">{params.error}</div> : null}
        {params.success ? <div className="notice">{params.success}</div> : null}

        <section className="grid two">
        <form className="card pad stack" action="/api/employees" method="post">
          <h2 style={{ margin: 0 }}>Tambah Karyawan</h2>
          <input type="hidden" name="action" value="create" />
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
                    <td data-label="Nama">{employee.fullName}</td>
                    <td data-label="Email">{employee.user.email}</td>
                    <td data-label="Tipe">{titleCaseEnum(employee.employmentType)}</td>
                    <td data-label="Cabang">{employee.defaultBranch?.name ?? "-"}</td>
                    <td data-label="Status">
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

        <section>
          <div className="section-title">
            <h2>Edit, Reset Password, dan Hapus</h2>
          </div>
          <div className="grid">
            {employees.map((employee) => (
              <details className="card pad stack" key={employee.id}>
                <summary className="details-summary">
                  <strong>{employee.fullName}</strong>
                  <span>{employee.user.email}</span>
                </summary>

                <form className="form-grid" action="/api/employees" method="post">
                  <input type="hidden" name="action" value="update" />
                  <input type="hidden" name="employeeId" value={employee.id} />
                  <section className="grid three">
                    <label className="field">
                      <span>Nama</span>
                      <input name="fullName" defaultValue={employee.fullName} required />
                    </label>
                    <label className="field">
                      <span>Email</span>
                      <input name="email" type="email" defaultValue={employee.user.email} required />
                    </label>
                    <label className="field">
                      <span>Kode</span>
                      <input name="employeeCode" defaultValue={employee.employeeCode} required />
                    </label>
                    <label className="field">
                      <span>Role akses</span>
                      <select name="role" defaultValue={employee.user.role}>
                        <option value="EMPLOYEE">Employee</option>
                        <option value="ADMIN">Admin</option>
                        <option value="OWNER">Owner</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Tipe karyawan</span>
                      <select name="employmentType" defaultValue={employee.employmentType}>
                        <option value="FULL_TIME">Full time</option>
                        <option value="PART_TIME">Part time</option>
                        <option value="SUPPORT">Support</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Cabang</span>
                      <select name="branchId" defaultValue={employee.defaultBranchId ?? ""}>
                        <option value="">Tanpa cabang</option>
                        {branches.map((branch) => (
                          <option key={branch.id} value={branch.id}>
                            {branch.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>No. HP</span>
                      <input name="phone" defaultValue={employee.phone ?? ""} />
                    </label>
                    <label className="field">
                      <span>Status</span>
                      <select name="isActive" defaultValue={String(employee.isActive)}>
                        <option value="true">Aktif</option>
                        <option value="false">Nonaktif</option>
                      </select>
                    </label>
                  </section>
                  <button className="button secondary" type="submit">
                    Simpan Perubahan
                  </button>
                </form>

                <section className="grid two">
                  <form className="card pad stack" action="/api/employees" method="post">
                    <h3 style={{ margin: 0 }}>Reset Password</h3>
                    <input type="hidden" name="action" value="reset-password" />
                    <input type="hidden" name="employeeId" value={employee.id} />
                    <label className="field">
                      <span>Password baru</span>
                      <input name="password" type="text" defaultValue="bimba123" required />
                    </label>
                    <button className="button secondary" type="submit">
                      Reset Password
                    </button>
                  </form>

                  <form className="card pad stack" action="/api/employees" method="post">
                    <h3 style={{ margin: 0 }}>Hapus Karyawan</h3>
                    <input type="hidden" name="action" value="delete" />
                    <input type="hidden" name="employeeId" value={employee.id} />
                    <p style={{ color: "var(--muted)", margin: 0 }}>
                      Karyawan akan dinonaktifkan agar riwayat absensi dan payroll lama tetap aman.
                    </p>
                    <button className="button danger" type="submit">
                      Hapus / Nonaktifkan
                    </button>
                  </form>
                </section>
              </details>
            ))}
          </div>
        </section>
      </section>
    </AppShell>
  );
}
