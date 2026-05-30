import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }

  if (user.role !== "OWNER") {
    return NextResponse.redirect(new URL("/payroll?error=Hanya owner yang dapat publish payroll.", request.url), 303);
  }

  const formData = await request.formData();
  const payrollRunId = String(formData.get("payrollRunId") ?? "");

  await prisma.payrollRun.update({
    where: { id: payrollRunId },
    data: {
      status: "PUBLISHED",
      publishedBy: user.id,
      publishedAt: new Date(),
      items: {
        updateMany: {
          where: {},
          data: {
            status: "PUBLISHED"
          }
        }
      }
    }
  });

  return NextResponse.redirect(new URL("/payroll", request.url), 303);
}
