import type { requireUser } from "@/lib/auth";

type CurrentUser = Awaited<ReturnType<typeof requireUser>>;
type AttendanceSubnavProps = {
  active: "today" | "history" | "import";
  role: CurrentUser["role"];
};

export function AttendanceSubnav({ active, role }: AttendanceSubnavProps) {
  const canImport = role === "ADMIN" || role === "OWNER";

  return (
    <nav className="subnav" aria-label="Sub menu absensi">
      <a className={`subnav-link ${active === "today" ? "active" : ""}`.trim()} href="/attendance">
        Absen Hari Ini
      </a>
      <a className={`subnav-link ${active === "history" ? "active" : ""}`.trim()} href="/attendance/history">
        Riwayat Absensi
      </a>
      {canImport ? (
        <>
          <a className="subnav-link" href="/api/attendance/import/template">
            Download Template
          </a>
          <a className={`subnav-link ${active === "import" ? "active" : ""}`.trim()} href="/attendance/import">
            Upload Template
          </a>
        </>
      ) : null}
    </nav>
  );
}
