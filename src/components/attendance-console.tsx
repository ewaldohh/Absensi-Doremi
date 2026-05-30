"use client";

import { Camera, CheckCircle2, Clock3, Loader2, MapPin, QrCode } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type AttendanceConsoleProps = {
  employeeName: string;
};

type SubmitState = {
  type: "idle" | "loading" | "success" | "error";
  message?: string;
};

export function AttendanceConsole({ employeeName }: AttendanceConsoleProps) {
  const scannerRef = useRef<{ clear: () => Promise<void> } | null>(null);
  const [qrPayload, setQrPayload] = useState("");
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>({ type: "idle" });

  useEffect(() => {
    return () => {
      scannerRef.current?.clear().catch(() => undefined);
    };
  }, []);

  async function startScanner() {
    setSubmitState({ type: "idle" });
    setIsScannerActive(true);

    const { Html5QrcodeScanner } = await import("html5-qrcode");
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      {
        fps: 10,
        qrbox: { width: 240, height: 240 },
        rememberLastUsedCamera: true
      },
      false
    );

    scanner.render(
      (decodedText) => {
        setQrPayload(decodedText);
        scanner.clear().catch(() => undefined);
        scannerRef.current = null;
        setIsScannerActive(false);
      },
      () => undefined
    );

    scannerRef.current = scanner;
  }

  async function submitAttendance(eventType: "CHECK_IN" | "CHECK_OUT") {
    setSubmitState({ type: "loading", message: "Mengambil lokasi..." });

    try {
      const location = await getCurrentPosition();
      setSubmitState({ type: "loading", message: "Menyimpan absensi..." });

      const response = await fetch("/api/attendance/record", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          qrPayload,
          eventType,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        })
      });

      const payload = (await response.json()) as { ok: boolean; message: string };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || "Absensi gagal disimpan.");
      }

      setSubmitState({ type: "success", message: payload.message });
      setQrPayload("");
    } catch (error) {
      setSubmitState({
        type: "error",
        message: error instanceof Error ? error.message : "Absensi gagal disimpan."
      });
    }
  }

  return (
    <div className="grid two">
      <section className="card pad stack">
        <div className="split-actions">
          <div>
            <h2 style={{ margin: 0 }}>{employeeName}</h2>
            <p style={{ color: "var(--muted)", margin: "6px 0 0" }}>Absensi QR dan GPS</p>
          </div>
          <button className="button secondary" type="button" onClick={startScanner} disabled={isScannerActive}>
            <Camera />
            Scan QR
          </button>
        </div>

        <div className="scanner-frame">
          <div id="qr-reader" />
        </div>

        <label className="field">
          <span>Token QR</span>
          <textarea
            value={qrPayload}
            onChange={(event) => setQrPayload(event.target.value)}
            placeholder="Token hasil scan QR"
          />
        </label>

        <div className="inline-actions">
          <button className="button" type="button" disabled={!qrPayload || submitState.type === "loading"} onClick={() => submitAttendance("CHECK_IN")}>
            <Clock3 />
            Masuk
          </button>
          <button className="button secondary" type="button" disabled={!qrPayload || submitState.type === "loading"} onClick={() => submitAttendance("CHECK_OUT")}>
            <CheckCircle2 />
            Pulang
          </button>
        </div>

        {submitState.message ? (
          <div className={`notice ${submitState.type === "error" ? "error" : ""}`}>
            {submitState.type === "loading" ? <Loader2 style={{ width: 16, verticalAlign: "middle" }} /> : null}{" "}
            {submitState.message}
          </div>
        ) : null}
      </section>

      <section className="card pad stack">
        <div className="metric">
          <span>Validasi</span>
          <strong style={{ fontSize: "1.4rem" }}>QR + GPS</strong>
        </div>
        <div className="grid">
          <div className="notice">
            <QrCode style={{ width: 18, verticalAlign: "middle" }} /> QR cabang berubah setiap 30 detik.
          </div>
          <div className="notice" style={{ borderLeftColor: "var(--success)", color: "#14532d", background: "rgba(21, 128, 61, 0.08)" }}>
            <MapPin style={{ width: 18, verticalAlign: "middle" }} /> Lokasi HP dicocokkan dengan radius cabang.
          </div>
        </div>
      </section>
    </div>
  );
}

function getCurrentPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Browser tidak mendukung GPS."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, () => reject(new Error("Izin lokasi ditolak atau GPS gagal.")), {
      enableHighAccuracy: true,
      timeout: 12_000,
      maximumAge: 0
    });
  });
}
