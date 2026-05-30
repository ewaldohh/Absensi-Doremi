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
  const requestedTimeInput = String(formData.get("requestedTime") ?? "");
  const correctionType = String(formData.get("correctionType") ?? "CHECK_IN") as "CHECK_IN" | "CHECK_OUT";
  const scheduleId = String(formData.get("scheduleId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const evidenceFileUrl = await saveUpload(formData.get("evidence"), "correction");

  await prisma.attendanceCorrection.create({
    data: {
      employeeId: user.employee.id,
      scheduleId: scheduleId || null,
      correctionDate: new Date(`${correctionDate}T00:00:00`),
      requestedTime: combineDateAndTime(correctionDate, requestedTimeInput),
      correctionType,
      reason,
      evidenceFileUrl
    }
  });

  return NextResponse.redirect(new URL("/requests", request.url), 303);
}
