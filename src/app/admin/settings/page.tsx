import { AppShell } from "@/components/app-shell";
import { requireRole, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSettingsMap } from "@/lib/settings";
import { formatRupiah } from "@/lib/format";

export default async function SettingsPage() {
  const user = await requireUser();
  requireRole(user, ["ADMIN", "OWNER"]);

  const [branches, settings] = await Promise.all([
    prisma.branch.findMany({ orderBy: { name: "asc" } }),
    getSettingsMap()
  ]);

  const leaveFreeDays = Number(settings.leaveFreeDays);
  const leaveDeductionStart = Number.isFinite(leaveFreeDays) ? leaveFreeDays + 1 : 3;

  return (
    <AppShell
      user={user}
      title="Settings"
      subtitle="Konfigurasi cabang, aturan payroll, dan SMTP email payroll."
    >
      <section className="grid">
        <div>
          <div className="section-title">
            <h2>Cabang dan GPS</h2>
          </div>
          <div className="grid two">
            {branches.map((branch) => (
              <form className="card pad stack" action="/api/settings/branch" method="post" key={branch.id}>
                <input type="hidden" name="branchId" value={branch.id} />
                <h2 style={{ margin: 0 }}>{branch.name}</h2>
                <div className="form-grid">
                  <label className="field">
                    <span>Nama cabang</span>
                    <input name="name" defaultValue={branch.name} required />
                  </label>
                  <label className="field">
                    <span>Alamat</span>
                    <textarea name="address" defaultValue={branch.address ?? ""} />
                  </label>
                  <label className="field">
                    <span>Latitude</span>
                    <input name="latitude" type="number" step="any" defaultValue={branch.latitude} required />
                  </label>
                  <label className="field">
                    <span>Longitude</span>
                    <input name="longitude" type="number" step="any" defaultValue={branch.longitude} required />
                  </label>
                  <label className="field">
                    <span>Radius GPS meter</span>
                    <input name="gpsRadiusMeters" type="number" min="1" defaultValue={branch.gpsRadiusMeters} required />
                  </label>
                </div>
                <button className="button" type="submit">
                  Simpan Cabang
                </button>
              </form>
            ))}
          </div>
        </div>

        <section className="grid two">
          <form className="card pad stack" action="/api/settings/payroll" method="post">
            <h2 style={{ margin: 0 }}>Aturan Payroll</h2>
            <div className="notice">
              Dengan setting saat ini, izin/sakit mulai dipotong pada hari ke-{leaveDeductionStart}.
            </div>
            <div className="form-grid">
              <label className="field">
                <span>Potongan terlambat per hari</span>
                <input name="lateDeductionAmount" type="number" min="0" defaultValue={settings.lateDeductionAmount} required />
              </label>
              <label className="field">
                <span>Jumlah hari izin/sakit bebas potongan</span>
                <input name="leaveFreeDays" type="number" min="0" defaultValue={settings.leaveFreeDays} required />
              </label>
              <label className="field">
                <span>Potongan izin/sakit per hari</span>
                <input name="leaveDeductionAmount" type="number" min="0" defaultValue={settings.leaveDeductionAmount} required />
              </label>
            </div>
            <p style={{ color: "var(--muted)", margin: 0 }}>
              Default: telat {formatRupiah(Number(settings.lateDeductionAmount))}, izin/sakit{" "}
              {formatRupiah(Number(settings.leaveDeductionAmount))} per hari setelah kuota bebas.
            </p>
            <button className="button" type="submit">
              Simpan Payroll
            </button>
          </form>

          <form className="card pad stack" action="/api/settings/smtp" method="post">
            <h2 style={{ margin: 0 }}>SMTP Email</h2>
            <div className="notice">
              Isi ini nanti saat Anda sudah punya email provider. Tanpa SMTP, slip tetap bisa dilihat di aplikasi.
            </div>
            <div className="form-grid">
              <label className="field">
                <span>SMTP host</span>
                <input name="smtpHost" defaultValue={settings.smtpHost} placeholder="smtp.example.com" />
              </label>
              <label className="field">
                <span>SMTP port</span>
                <input name="smtpPort" type="number" defaultValue={settings.smtpPort} />
              </label>
              <label className="field">
                <span>SMTP user</span>
                <input name="smtpUser" defaultValue={settings.smtpUser} />
              </label>
              <label className="field">
                <span>SMTP password</span>
                <input name="smtpPass" type="password" placeholder={settings.smtpPass ? "Password tersimpan" : ""} />
              </label>
              <label className="field">
                <span>From email</span>
                <input name="smtpFrom" defaultValue={settings.smtpFrom} />
              </label>
            </div>
            <button className="button" type="submit">
              Simpan SMTP
            </button>
          </form>
        </section>
      </section>
    </AppShell>
  );
}
