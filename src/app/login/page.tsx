import { redirect } from "next/navigation";
import { LockKeyhole, LogIn, Mail, UsersRound } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-brand">
          <div className="login-brand-top">
            <span className="brand-mark">D</span>
            <span className="brand-mini">Doremi Playroom</span>
          </div>

          <div className="login-hero-copy">
            <img className="login-logo" src="/doremi-logo.png" alt="Doremi Playroom" />
            <h1>Selamat Datang Kembali!</h1>
            <p>Masuk untuk mengelola absensi, approval, dan payroll dengan mudah dan aman.</p>
          </div>

          <div className="music-note note-one">{"\u266a"}</div>
          <div className="music-note note-two">{"\u266b"}</div>
          <div className="star-doodle" aria-hidden="true" />
        </div>

        <div className="login-form-wrap">
          <form className="stack" action="/api/auth/login" method="post">
            <div className="login-title">
              <h2>Masuk</h2>
              <p>Gunakan akun demo atau akun yang sudah dibuat admin.</p>
            </div>

            {params.error ? <div className="notice">{params.error}</div> : null}

            <div className="form-grid">
              <label className="field">
                <span>Email</span>
                <div className="input-shell">
                  <Mail />
                  <input name="email" type="email" placeholder="nama@bimba.local" required />
                </div>
              </label>

              <label className="field">
                <span>Password</span>
                <div className="input-shell">
                  <LockKeyhole />
                  <input name="password" type="password" placeholder="Masukkan password" required />
                </div>
              </label>
            </div>

            <button className="button full" type="submit">
              Masuk
              <LogIn />
            </button>

            <div className="demo-accounts">
              <div className="demo-icon">
                <UsersRound />
              </div>
              <div>
                Owner: owner@bimba.local / owner123
                <br />
                Admin: admin@bimba.local / admin123
                <br />
                Guru: guru@bimba.local / guru123
              </div>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
