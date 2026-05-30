import { AppShell } from "@/components/app-shell";
import { EmployeeManagement } from "@/components/employee-management";
import { requireRole, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

        <form className="card pad stack" action="/api/employees" method="post">
          <h2 style={{ margin: 0 }}>Tambah Karyawan</h2>
          <input type="hidden" name="action" value="create" />
          <section className="grid three">
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
          </section>
          <button className="button" type="submit">
            Simpan
          </button>
        </form>

        <EmployeeManagement
          branches={branches.map((branch) => ({
            id: branch.id,
            name: branch.name
          }))}
          employees={employees.map((employee) => ({
            id: employee.id,
            fullName: employee.fullName,
            email: employee.user.email,
            employeeCode: employee.employeeCode,
            role: employee.user.role,
            employmentType: employee.employmentType,
            defaultBranchId: employee.defaultBranchId ?? "",
            defaultBranchName: employee.defaultBranch?.name ?? "",
            phone: employee.phone ?? "",
            isActive: employee.isActive,
            isCurrentUser: employee.userId === user.id
          }))}
        />
      </section>
    </AppShell>
  );
}
