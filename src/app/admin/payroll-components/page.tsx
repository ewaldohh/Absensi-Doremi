import { AppShell } from "@/components/app-shell";
import { requireRole, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatRupiah, titleCaseEnum } from "@/lib/format";

export default async function PayrollComponentsPage() {
  const user = await requireUser();
  requireRole(user, ["ADMIN", "OWNER"]);

  const [components, employees, assignments] = await Promise.all([
    prisma.payrollComponent.findMany({ orderBy: { name: "asc" } }),
    prisma.employee.findMany({ where: { isActive: true }, orderBy: { fullName: "asc" } }),
    prisma.employeePayrollComponent.findMany({
      include: { employee: true, payrollComponent: true },
      orderBy: { createdAt: "desc" },
      take: 30
    })
  ]);

  return (
    <AppShell user={user} title="Komponen Payroll" subtitle="Komponen gaji dan potongan yang bisa berbeda per karyawan.">
      <section className="grid two">
        <form className="card pad stack" action="/api/payroll-components" method="post">
          <h2 style={{ margin: 0 }}>Tambah Komponen</h2>
          <input type="hidden" name="action" value="create-component" />
          <label className="field">
            <span>Nama</span>
            <input name="name" required />
          </label>
          <label className="field">
            <span>Tipe</span>
            <select name="componentType">
              <option value="EARNING">Earning</option>
              <option value="DEDUCTION">Deduction</option>
            </select>
          </label>
          <label className="field">
            <span>Kalkulasi</span>
            <select name="calculationType">
              <option value="FIXED">Fixed</option>
              <option value="PER_DAY">Per day</option>
              <option value="PER_HOUR">Per hour</option>
              <option value="PER_SESSION">Per session</option>
              <option value="FORMULA">Formula</option>
            </select>
          </label>
          <label className="field">
            <span>Nominal default</span>
            <input name="defaultAmount" type="number" defaultValue="0" required />
          </label>
          <button className="button" type="submit">
            Simpan
          </button>
        </form>

        <form className="card pad stack" action="/api/payroll-components" method="post">
          <h2 style={{ margin: 0 }}>Assign ke Karyawan</h2>
          <input type="hidden" name="action" value="assign-component" />
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
            <span>Komponen</span>
            <select name="payrollComponentId" required>
              {components.map((component) => (
                <option key={component.id} value={component.id}>
                  {component.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Nominal khusus</span>
            <input name="amount" type="number" required />
          </label>
          <button className="button" type="submit">
            Assign
          </button>
        </form>
      </section>

      <section className="grid two" style={{ marginTop: 20 }}>
        <div>
          <div className="section-title">
            <h2>Master Komponen</h2>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Tipe</th>
                  <th>Kalkulasi</th>
                  <th>Default</th>
                </tr>
              </thead>
              <tbody>
                {components.map((component) => (
                  <tr key={component.id}>
                    <td>{component.name}</td>
                    <td>{titleCaseEnum(component.componentType)}</td>
                    <td>{titleCaseEnum(component.calculationType)}</td>
                    <td>{formatRupiah(component.defaultAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="section-title">
            <h2>Assignment Terbaru</h2>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Karyawan</th>
                  <th>Komponen</th>
                  <th>Nominal</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((assignment) => (
                  <tr key={assignment.id}>
                    <td>{assignment.employee.fullName}</td>
                    <td>{assignment.payrollComponent.name}</td>
                    <td>{formatRupiah(assignment.amount ?? assignment.payrollComponent.defaultAmount)}</td>
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
