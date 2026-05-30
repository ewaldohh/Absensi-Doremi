import {
  Banknote,
  CalendarDays,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  QrCode,
  SlidersHorizontal,
  Settings2,
  UserRoundCheck,
  UsersRound
} from "lucide-react";
import type { ReactNode } from "react";
import type { requireUser } from "@/lib/auth";

type CurrentUser = Awaited<ReturnType<typeof requireUser>>;

type AppShellProps = {
  user: CurrentUser;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function AppShell({ user, title, subtitle, actions, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-head">
          <img className="sidebar-logo" src="/doremi-logo.png" alt="Doremi Playroom" />
          <div className="sidebar-title">
            <strong>Doremi Playroom</strong>
            <span>{user.role}</span>
          </div>
        </div>

        <details className="mobile-menu">
          <summary>
            <Menu />
            Menu
          </summary>
          <div className="mobile-menu-panel">
            <nav className="nav-list" aria-label="Navigasi utama mobile">
              <NavLinks role={user.role} />
            </nav>
            <UserArea user={user} />
          </div>
        </details>

        <nav className="nav-list desktop-nav" aria-label="Navigasi utama">
          <NavLinks role={user.role} />
        </nav>

        <UserArea user={user} className="desktop-user" />
      </aside>

      <main className="main">
        <div className="page-head">
          <div>
            <h1>{title}</h1>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          {actions ? <div className="inline-actions">{actions}</div> : null}
        </div>
        {children}
      </main>
    </div>
  );
}

function NavLinks({ role }: { role: CurrentUser["role"] }) {
  const isAdmin = role === "ADMIN" || role === "OWNER";
  const isOwner = role === "OWNER";

  return (
    <>
      <a className="nav-link" href="/dashboard">
        <LayoutDashboard />
        Dashboard
      </a>
      <a className="nav-link" href="/attendance">
        <QrCode />
        Absensi
      </a>
      <a className="nav-link" href="/requests">
        <ClipboardCheck />
        Pengajuan
      </a>
      {role !== "ADMIN" ? (
        <a className="nav-link" href="/payroll">
          <Banknote />
          Payroll
        </a>
      ) : null}
      {isAdmin ? (
        <>
          <a className="nav-link" href="/admin/qr">
            <QrCode />
            QR Cabang
          </a>
          <a className="nav-link" href="/admin/employees">
            <UsersRound />
            Karyawan
          </a>
          <a className="nav-link" href="/admin/schedules">
            <CalendarDays />
            Jadwal
          </a>
          <a className="nav-link" href="/admin/holidays">
            <CalendarDays />
            Libur
          </a>
          {isOwner ? (
            <>
              <a className="nav-link" href="/approvals">
                <UserRoundCheck />
                Approval
              </a>
              <a className="nav-link" href="/admin/payroll-components">
                <Settings2 />
                Komponen
              </a>
            </>
          ) : null}
          <a className="nav-link" href="/admin/reports">
            <FileText />
            Rekap
          </a>
          <a className="nav-link" href="/admin/settings">
            <SlidersHorizontal />
            Settings
          </a>
        </>
      ) : null}
    </>
  );
}

function UserArea({ user, className = "" }: { user: CurrentUser; className?: string }) {
  return (
    <div className={`sidebar-foot ${className}`.trim()}>
      <div className="user-chip">
        <strong>{user.name}</strong>
        <span>{user.email}</span>
      </div>
      <form action="/api/auth/logout" method="post">
        <button className="button secondary full" type="submit">
          <LogOut />
          Keluar
        </button>
      </form>
    </div>
  );
}
