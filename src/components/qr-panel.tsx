"use client";

import { Copy, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

type QrPayload = {
  ok: boolean;
  dataUrl: string;
  payload: string;
  validUntil: string;
  branchName: string;
};

export function QrPanel({ branchId }: { branchId: string }) {
  const [qr, setQr] = useState<QrPayload | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  async function loadQr() {
    const response = await fetch(`/api/qr/current?branchId=${branchId}`, {
      cache: "no-store"
    });
    const payload = (await response.json()) as QrPayload;
    setQr(payload);
  }

  useEffect(() => {
    loadQr().catch(() => undefined);
    const interval = window.setInterval(() => {
      loadQr().catch(() => undefined);
    }, 30_000);

    return () => window.clearInterval(interval);
  }, [branchId]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!qr?.validUntil) {
        setSecondsLeft(0);
        return;
      }

      const nextSeconds = Math.max(0, Math.ceil((new Date(qr.validUntil).getTime() - Date.now()) / 1000));
      setSecondsLeft(nextSeconds);
    }, 500);

    return () => window.clearInterval(interval);
  }, [qr?.validUntil]);

  return (
    <section className="grid two">
      <div className="card pad stack">
        <div className="split-actions">
          <div>
            <h2 style={{ margin: 0 }}>{qr?.branchName ?? "QR Cabang"}</h2>
            <p style={{ color: "var(--muted)", margin: "6px 0 0" }}>Refresh otomatis setiap 30 detik.</p>
          </div>
          <button className="button secondary" type="button" onClick={loadQr}>
            <RefreshCw />
            Refresh
          </button>
        </div>
        <div className="qr-box">
          {qr?.dataUrl ? <img src={qr.dataUrl} alt="QR absensi cabang" /> : <span>Memuat QR...</span>}
        </div>
        <div className="metric">
          <span>Berlaku</span>
          <strong>{secondsLeft}s</strong>
        </div>
      </div>

      <div className="card pad stack">
        <div>
          <h2 style={{ margin: 0 }}>Token Aktif</h2>
          <p style={{ color: "var(--muted)", margin: "6px 0 0" }}>Fallback saat kamera perangkat belum bisa membaca QR.</p>
        </div>
        <label className="field">
          <span>Payload</span>
          <textarea value={qr?.payload ?? ""} readOnly />
        </label>
        <button
          className="button secondary"
          type="button"
          onClick={() => navigator.clipboard.writeText(qr?.payload ?? "")}
          disabled={!qr?.payload}
        >
          <Copy />
          Salin
        </button>
      </div>
    </section>
  );
}
