import { AppShell } from "@/components/app-shell";
import { requireRole, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { toDateInputValue } from "@/lib/dates";

type HolidaysPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function HolidaysPage({ searchParams }: HolidaysPageProps) {
  const user = await requireUser();
  requireRole(user, ["ADMIN", "OWNER"]);
  const params = await searchParams;

  const holidays = await prisma.holiday.findMany({
    orderBy: { holidayDate: "desc" },
    take: 100
  });

  return (
    <AppShell user={user} title="Hari Libur" subtitle="Hari Minggu otomatis libur. Tambahkan libur lain secara manual di sini.">
      <section className="grid">
        {params.error ? <div className="notice error">{params.error}</div> : null}
        {params.success ? <div className="notice">{params.success}</div> : null}

        <section className="grid two">
          <form className="card pad stack" action="/api/holidays" method="post">
            <h2 style={{ margin: 0 }}>Tambah Libur Manual</h2>
            <input type="hidden" name="action" value="create" />
            <div className="notice">Setiap hari Minggu otomatis dianggap libur, jadi tidak perlu dimasukkan manual.</div>
            <label className="field">
              <span>Tanggal</span>
              <input name="holidayDate" type="date" defaultValue={toDateInputValue(new Date())} required />
            </label>
            <label className="field">
              <span>Nama libur</span>
              <input name="name" placeholder="Contoh: Libur semester" required />
            </label>
            <label className="field">
              <span>Catatan</span>
              <textarea name="notes" />
            </label>
            <button className="button" type="submit">
              Simpan Libur
            </button>
          </form>

          <div className="card pad stack">
            <h2 style={{ margin: 0 }}>Aturan Sistem</h2>
            <div className="notice">
              Payroll tidak menghitung keterlambatan dan potongan izin/sakit pada hari Minggu atau libur manual.
            </div>
            <p style={{ color: "var(--muted)", margin: 0 }}>
              Jika suatu tanggal libur tetap punya jadwal, data jadwalnya tidak dihapus, tetapi perhitungan payroll akan
              mengabaikan hari tersebut sebagai hari kerja.
            </p>
          </div>
        </section>

        <section>
          <div className="section-title">
            <h2>Daftar Libur Manual</h2>
          </div>
          <div className="grid">
            {holidays.map((holiday) => (
              <details className="card pad stack" key={holiday.id}>
                <summary className="details-summary">
                  <strong>{holiday.name}</strong>
                  <span>{formatDate(holiday.holidayDate)}</span>
                </summary>
                <form className="form-grid" action="/api/holidays" method="post">
                  <input type="hidden" name="action" value="update" />
                  <input type="hidden" name="id" value={holiday.id} />
                  <section className="grid three">
                    <label className="field">
                      <span>Tanggal</span>
                      <input name="holidayDate" type="date" defaultValue={toDateInputValue(holiday.holidayDate)} required />
                    </label>
                    <label className="field">
                      <span>Nama libur</span>
                      <input name="name" defaultValue={holiday.name} required />
                    </label>
                    <label className="field">
                      <span>Catatan</span>
                      <input name="notes" defaultValue={holiday.notes ?? ""} />
                    </label>
                  </section>
                  <div className="inline-actions">
                    <button className="button secondary" type="submit">
                      Simpan Perubahan
                    </button>
                  </div>
                </form>
                <form action="/api/holidays" method="post">
                  <input type="hidden" name="action" value="delete" />
                  <input type="hidden" name="id" value={holiday.id} />
                  <button className="button danger" type="submit">
                    Hapus Libur
                  </button>
                </form>
              </details>
            ))}
            {holidays.length === 0 ? <div className="empty-state">Belum ada libur manual.</div> : null}
          </div>
        </section>
      </section>
    </AppShell>
  );
}
