import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatRupiah, titleCaseEnum } from "@/lib/format";
import { toDateInputValue } from "@/lib/dates";

type PayrollPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function PayrollPage({ searchParams }: PayrollPageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const isAdmin = user.role === "ADMIN" || user.role === "OWNER";

  const [runs, myItems] = await Promise.all([
    isAdmin
      ? prisma.payrollRun.findMany({
          include: {
            items: {
              include: {
                employee: true
              }
            }
          },
          orderBy: { generatedAt: "desc" },
          take: 8
        })
      : Promise.resolve([]),
    user.employee
      ? prisma.payrollItem.findMany({
          where: { employeeId: user.employee.id },
          include: {
            payrollRun: true,
            lines: true
          },
          orderBy: { createdAt: "desc" },
          take: 12
        })
      : Promise.resolve([])
  ]);

  return (
    <AppShell user={user} title="Payroll" subtitle="Payroll periode 29 sampai 29 dan slip per karyawan.">
      {params.error ? <div className="notice error" style={{ marginBottom: 16 }}>{params.error}</div> : null}
      {params.success ? <div className="notice" style={{ marginBottom: 16 }}>{params.success}</div> : null}

      {isAdmin ? (
        <section className="card pad stack">
          <form className="split-actions" action="/api/payroll/generate" method="post">
            <label className="field" style={{ minWidth: 260 }}>
              <span>Tanggal akhir periode</span>
              <input name="periodEnd" type="date" defaultValue={toDateInputValue(new Date())} required />
            </label>
            <button className="button" type="submit">
              Generate Payroll
            </button>
          </form>
        </section>
      ) : null}

      {isAdmin ? (
        <section style={{ marginTop: 20 }}>
          <div className="section-title">
            <h2>Payroll Run</h2>
          </div>
          <div className="grid">
            {runs.map((run) => (
              <div className="card pad stack" key={run.id}>
                <div className="split-actions">
                  <div>
                    <h2 style={{ margin: 0 }}>
                      {formatDate(run.periodStart)} - {formatDate(run.periodEnd)}
                    </h2>
                    <p style={{ color: "var(--muted)", margin: "6px 0 0" }}>
                      {run.items.length} karyawan - {titleCaseEnum(run.status)}
                    </p>
                  </div>
                  <div className="inline-actions">
                    <form action="/api/payroll/publish" method="post">
                      <input type="hidden" name="payrollRunId" value={run.id} />
                      <button className="button secondary" type="submit">
                        Publish
                      </button>
                    </form>
                    <form action="/api/payroll/email" method="post">
                      <input type="hidden" name="payrollRunId" value={run.id} />
                      <button className="button" type="submit">
                        Kirim Email
                      </button>
                    </form>
                  </div>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Karyawan</th>
                        <th>Earning</th>
                        <th>Deduction</th>
                        <th>Net</th>
                        <th>Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {run.items.map((item) => (
                        <tr key={item.id}>
                          <td data-label="Karyawan">{item.employee.fullName}</td>
                          <td data-label="Earning">{formatRupiah(item.grossEarnings)}</td>
                          <td data-label="Deduction">{formatRupiah(item.totalDeductions)}</td>
                          <td data-label="Net">
                            <strong>{formatRupiah(item.netPay)}</strong>
                          </td>
                          <td data-label="Email">{titleCaseEnum(item.emailStatus)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            {runs.length === 0 ? <div className="empty-state">Belum ada payroll run.</div> : null}
          </div>
        </section>
      ) : (
        <section>
          <div className="section-title">
            <h2>Slip Saya</h2>
          </div>
          <div className="grid">
            {myItems.map((item) => (
              <div className="card pad stack" key={item.id}>
                <div className="split-actions">
                  <div>
                    <h2 style={{ margin: 0 }}>
                      {formatDate(item.payrollRun.periodStart)} - {formatDate(item.payrollRun.periodEnd)}
                    </h2>
                    <p style={{ color: "var(--muted)", margin: "6px 0 0" }}>{titleCaseEnum(item.status)}</p>
                  </div>
                  <strong style={{ fontSize: "1.4rem" }}>{formatRupiah(item.netPay)}</strong>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Komponen</th>
                        <th>Tipe</th>
                        <th>Qty</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.lines.map((line) => (
                        <tr key={line.id}>
                          <td data-label="Komponen">{line.componentName}</td>
                          <td data-label="Tipe">{titleCaseEnum(line.componentType)}</td>
                          <td data-label="Qty">{line.quantity}</td>
                          <td data-label="Amount">{formatRupiah(line.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            {myItems.length === 0 ? <div className="empty-state">Belum ada slip payroll.</div> : null}
          </div>
        </section>
      )}
    </AppShell>
  );
}
