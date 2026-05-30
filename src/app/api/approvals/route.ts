import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user || (user.role !== "ADMIN" && user.role !== "OWNER")) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }

  const formData = await request.formData();
  const type = String(formData.get("type") ?? "");
  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "REJECTED") as "APPROVED" | "REJECTED";

  if (type === "correction") {
    if (user.role !== "OWNER") {
      return NextResponse.redirect(new URL("/approvals", request.url), 303);
    }

    const correction = await prisma.attendanceCorrection.update({
      where: { id },
      data: {
        status: decision,
        reviewedBy: user.id,
        reviewedAt: new Date()
      },
      include: {
        employee: true,
        schedule: true
      }
    });

    if (decision === "APPROVED") {
      const branchId = correction.schedule?.branchId ?? correction.employee.defaultBranchId;

      if (branchId) {
        const correctedEvents: Array<{
          employeeId: string;
          branchId: string;
          scheduleId: string | null;
          eventType: "CHECK_IN" | "CHECK_OUT";
          eventTime: Date;
          source: "MANUAL_CORRECTION";
          status: "VALID";
          notes: string;
        }> = [];

        if (correction.requestedCheckIn) {
          correctedEvents.push({
            employeeId: correction.employeeId,
            branchId,
            scheduleId: correction.scheduleId,
            eventType: "CHECK_IN" as const,
            eventTime: correction.requestedCheckIn,
            source: "MANUAL_CORRECTION" as const,
            status: "VALID" as const,
            notes: `Approved correction: ${correction.reason}`
          });
        }

        if (correction.requestedCheckOut) {
          correctedEvents.push({
            employeeId: correction.employeeId,
            branchId,
            scheduleId: correction.scheduleId,
            eventType: "CHECK_OUT" as const,
            eventTime: correction.requestedCheckOut,
            source: "MANUAL_CORRECTION" as const,
            status: "VALID" as const,
            notes: `Approved correction: ${correction.reason}`
          });
        }

        if (correctedEvents.length === 0) {
          correctedEvents.push({
            employeeId: correction.employeeId,
            branchId,
            scheduleId: correction.scheduleId,
            eventType: correction.correctionType,
            eventTime: correction.requestedTime,
            source: "MANUAL_CORRECTION" as const,
            status: "VALID" as const,
            notes: `Approved correction: ${correction.reason}`
          });
        }

        await prisma.attendanceEvent.createMany({
          data: correctedEvents
        });
      }
    }
  }

  if (type === "leave") {
    await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: decision,
        reviewedBy: user.id,
        reviewedAt: new Date()
      }
    });
  }

  if (type === "overtime") {
    await prisma.overtimeRequest.update({
      where: { id },
      data: {
        status: decision,
        reviewedBy: user.id,
        reviewedAt: new Date()
      }
    });
  }

  return NextResponse.redirect(new URL("/approvals", request.url), 303);
}
