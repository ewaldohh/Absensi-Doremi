import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { daysBetweenInclusive } from "@/lib/dates";
import { saveUpload } from "@/lib/uploads";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user?.employee) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }

  const formData = await request.formData();
  const leaveType = String(formData.get("leaveType") ?? "PERMISSION") as "PERMISSION" | "SICK";
  const startDate = new Date(`${String(formData.get("startDate"))}T00:00:00`);
  const endDate = new Date(`${String(formData.get("endDate"))}T00:00:00`);
  const reason = String(formData.get("reason") ?? "").trim();
  const evidenceFileUrl = await saveUpload(formData.get("evidence"), "leave");

  await prisma.leaveRequest.create({
    data: {
      employeeId: user.employee.id,
      leaveType,
      startDate,
      endDate,
      totalDays: daysBetweenInclusive(startDate, endDate),
      reason,
      evidenceFileUrl
    }
  });

  return NextResponse.redirect(new URL("/requests", request.url), 303);
}
