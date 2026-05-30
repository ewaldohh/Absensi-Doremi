import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { combineDateAndTime } from "@/lib/dates";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user || (user.role !== "ADMIN" && user.role !== "OWNER")) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }

  const formData = await request.formData();
  const scheduleDate = String(formData.get("scheduleDate") ?? "");
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");

  await prisma.schedule.create({
    data: {
      employeeId: String(formData.get("employeeId") ?? ""),
      branchId: String(formData.get("branchId") ?? ""),
      scheduleDate: new Date(`${scheduleDate}T00:00:00`),
      startTime: combineDateAndTime(scheduleDate, startTime),
      endTime: combineDateAndTime(scheduleDate, endTime),
      scheduleType: String(formData.get("scheduleType") ?? "OTHER") as
        | "TEACHING"
        | "OPERATIONAL"
        | "ADMIN"
        | "SUBSTITUTE"
        | "OTHER",
      notes: String(formData.get("notes") ?? "").trim() || null,
      createdBy: user.id,
      updatedBy: user.id
    }
  });

  return NextResponse.redirect(new URL("/admin/schedules", request.url), 303);
}
