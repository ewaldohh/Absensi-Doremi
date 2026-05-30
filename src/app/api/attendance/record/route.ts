import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { endOfDay, startOfDay } from "@/lib/dates";
import { distanceInMeters } from "@/lib/geo";
import { hashToken } from "@/lib/tokens";

type QrPayload = {
  type?: string;
  branchId?: string;
  token?: string;
};

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user?.employee) {
    return NextResponse.json({ ok: false, message: "Akun belum terhubung ke karyawan." }, { status: 401 });
  }

  const body = (await request.json()) as {
    qrPayload?: string;
    eventType?: "CHECK_IN" | "CHECK_OUT";
    latitude?: number;
    longitude?: number;
  };

  if (!body.qrPayload || !body.eventType || typeof body.latitude !== "number" || typeof body.longitude !== "number") {
    return NextResponse.json({ ok: false, message: "QR dan lokasi wajib valid." }, { status: 400 });
  }

  let qr: QrPayload;

  try {
    qr = JSON.parse(body.qrPayload) as QrPayload;
  } catch {
    return NextResponse.json({ ok: false, message: "Format QR tidak valid." }, { status: 400 });
  }

  if (qr.type !== "bimba-attendance" || !qr.branchId || !qr.token) {
    return NextResponse.json({ ok: false, message: "QR bukan milik sistem absensi." }, { status: 400 });
  }

  const now = new Date();
  const qrToken = await prisma.qrToken.findUnique({
    where: {
      tokenHash: hashToken(qr.token)
    },
    include: {
      branch: true
    }
  });

  if (!qrToken || qrToken.branchId !== qr.branchId || qrToken.validUntil < now || qrToken.status !== "ACTIVE") {
    return NextResponse.json({ ok: false, message: "QR sudah kedaluwarsa." }, { status: 400 });
  }

  const distance = distanceInMeters(
    {
      latitude: body.latitude,
      longitude: body.longitude
    },
    {
      latitude: qrToken.branch.latitude,
      longitude: qrToken.branch.longitude
    }
  );
  const withinRadius = distance <= qrToken.branch.gpsRadiusMeters;

  const schedule = await prisma.schedule.findFirst({
    where: {
      employeeId: user.employee.id,
      branchId: qrToken.branchId,
      status: {
        not: "CANCELLED"
      },
      scheduleDate: {
        gte: startOfDay(now),
        lte: endOfDay(now)
      }
    },
    orderBy: {
      startTime: "asc"
    }
  });

  const event = await prisma.attendanceEvent.create({
    data: {
      employeeId: user.employee.id,
      branchId: qrToken.branchId,
      scheduleId: schedule?.id,
      eventType: body.eventType,
      source: "QR_GPS",
      qrTokenId: qrToken.id,
      latitude: body.latitude,
      longitude: body.longitude,
      distanceMeters: Math.round(distance),
      status: withinRadius ? "VALID" : "PENDING_REVIEW",
      notes: withinRadius
        ? schedule
          ? null
          : "Tidak ada jadwal hari ini."
        : `GPS di luar radius cabang: ${Math.round(distance)} meter.`
    }
  });

  return NextResponse.json({
    ok: true,
    message:
      event.status === "VALID"
        ? "Absensi berhasil disimpan."
        : "Absensi tersimpan dan menunggu review karena lokasi di luar radius."
  });
}
