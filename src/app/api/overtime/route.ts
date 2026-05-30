import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { combineDateAndTime, startOfDateInput } from "@/lib/dates";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user?.employee) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }

  const formData = await request.formData();
  const overtimeDateInput = String(formData.get("overtimeDate") ?? "");
  const startTime = combineDateAndTime(overtimeDateInput, String(formData.get("startTime") ?? ""));
  const endTime = combineDateAndTime(overtimeDateInput, String(formData.get("endTime") ?? ""));
  const reason = String(formData.get("reason") ?? "").trim();
  const totalMinutes = Math.max(0, Math.round((endTime.getTime() - startTime.getTime()) / 60_000));

  await prisma.overtimeRequest.create({
    data: {
      employeeId: user.employee.id,
      overtimeDate: startOfDateInput(overtimeDateInput),
      startTime,
      endTime,
      totalMinutes,
      reason
    }
  });

  return NextResponse.redirect(new URL("/requests", request.url), 303);
}
