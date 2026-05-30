import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { combineDateAndTime } from "@/lib/dates";
import { saveUpload } from "@/lib/uploads";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user?.employee) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }

  const formData = await request.formData();
  const correctionDate = String(formData.get("correctionDate") ?? "");
  const checkInTimeInput = String(formData.get("checkInTime") ?? "");
  const checkOutTimeInput = String(formData.get("checkOutTime") ?? "");
  const scheduleId = String(formData.get("scheduleId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!correctionDate || !checkInTimeInput || !checkOutTimeInput || !reason) {
    return NextResponse.redirect(new URL("/requests", request.url), 303);
  }

  const evidenceFileUrl = await saveUpload(formData.get("evidence"), "correction");
  const requestedCheckIn = combineDateAndTime(correctionDate, checkInTimeInput);
  const requestedCheckOut = combineDateAndTime(correctionDate, checkOutTimeInput);

  await prisma.attendanceCorrection.create({
    data: {
      employeeId: user.employee.id,
      scheduleId: scheduleId || null,
      correctionDate: new Date(`${correctionDate}T00:00:00`),
      correctionType: "CHECK_IN",
      requestedTime: requestedCheckIn,
      requestedCheckIn,
      requestedCheckOut,
      reason,
      evidenceFileUrl
    }
  });

  return NextResponse.redirect(new URL("/requests", request.url), 303);
}
