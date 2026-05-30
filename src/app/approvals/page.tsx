import { AppShell } from "@/components/app-shell";
import { requireRole, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatDateTime, formatTime, titleCaseEnum } from "@/lib/format";

export default async function ApprovalsPage() {
  const user = await requireUser();
  requireRole(user, ["ADMIN", "OWNER"]);

  const [corrections, leaves, overtimes] = await Promise.all([
    prisma.attendanceCorrection.findMany({
      where: { status: "PENDING" },
      include: { employee: true, schedule: true },
      orderBy: { createdAt: "asc" }
    }),
    prisma.leaveRequest.findMany({
      where: { status: "PENDING" },
      include: { employee: true },
      orderBy: { createdAt: "asc" }
    }),
    prisma.overtimeRequest.findMany({
      where: { status: "PENDING" },
      include: { employee: true },
      orderBy: { createdAt: "asc" }
    })
  ]);

  return (
    <AppShell user={user} title="Approval" subtitle="Pengajuan yang menunggu keputusan admin atau owner.">
      <section className="grid">
        <ApprovalTable
          title="Koreksi Absensi"
          rows={corrections.map((item) => ({
            id: item.id,
            type: "correction",
            employeeName: item.employee.fullName,
            date: formatDate(item.correctionDate),
            detail:
              item.requestedCheckIn || item.requestedCheckOut
                ? `Masuk ${formatOptionalTime(item.requestedCheckIn)} / Pulang ${formatOptionalTime(item.requestedCheckOut)} - ${item.reason}`
                : `${titleCaseEnum(item.correctionType)} ${formatDateTime(item.requestedTime)} - ${item.reason}`,
            evidence: item.evidenceFileUrl
          }))}
        />
        <ApprovalTable
          title="Izin / Sakit"
          rows={leaves.map((item) => ({
            id: item.id,
            type: "leave",
            employeeName: item.employee.fullName,
            date: `${formatDate(item.startDate)} - ${formatDate(item.endDate)}`,
            detail: `${titleCaseEnum(item.leaveType)} ${item.totalDays} hari - ${item.reason}`,
            evidence: item.evidenceFileUrl
          }))}
        />
        <ApprovalTable
          title="Lembur"
          rows={overtimes.map((item) => ({
            id: item.id,
            type: "overtime",
            employeeName: item.employee.fullName,
            date: formatDate(item.overtimeDate),
            detail: `${item.totalMinutes} menit - ${item.reason}`,
            evidence: null
          }))}
        />
      </section>
    </AppShell>
  );
}

function formatOptionalTime(value: Date | null) {
  return value ? formatTime(value) : "-";
}

function ApprovalTable({
  title,
  rows
}: {
  title: string;
  rows: Array<{
    id: string;
    type: string;
    employeeName: string;
    date: string;
    detail: string;
    evidence: string | null;
  }>;
}) {
  return (
    <div>
      <div className="section-title">
        <h2>{title}</h2>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Karyawan</th>
              <th>Tanggal</th>
              <th>Detail</th>
              <th>Bukti</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td data-label="Karyawan">{row.employeeName}</td>
                <td data-label="Tanggal">{row.date}</td>
                <td data-label="Detail">{row.detail}</td>
                <td data-label="Bukti">{row.evidence ? <a href={row.evidence}>Lihat</a> : "-"}</td>
                <td data-label="Aksi">
                  <div className="inline-actions">
                    <form action="/api/approvals" method="post">
                      <input type="hidden" name="type" value={row.type} />
                      <input type="hidden" name="id" value={row.id} />
                      <input type="hidden" name="decision" value="APPROVED" />
                      <button className="button" type="submit">
                        Approve
                      </button>
                    </form>
                    <form action="/api/approvals" method="post">
                      <input type="hidden" name="type" value={row.type} />
                      <input type="hidden" name="id" value={row.id} />
                      <input type="hidden" name="decision" value="REJECTED" />
                      <button className="button secondary" type="submit">
                        Reject
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5}>Tidak ada pengajuan pending.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
