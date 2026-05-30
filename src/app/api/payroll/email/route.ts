import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { formatDate, formatRupiah } from "@/lib/format";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user || (user.role !== "ADMIN" && user.role !== "OWNER")) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }

  const formData = await request.formData();
  const payrollRunId = String(formData.get("payrollRunId") ?? "");

  const run = await prisma.payrollRun.findUnique({
    where: { id: payrollRunId },
    include: {
      items: {
        include: {
          employee: {
            include: {
              user: true
            }
          },
          lines: true
        }
      }
    }
  });

  if (!run) {
    return NextResponse.redirect(new URL("/payroll", request.url), 303);
  }

  for (const item of run.items) {
    try {
      await prisma.payrollItem.update({
        where: { id: item.id },
        data: { emailStatus: "PENDING" }
      });

      await sendEmail({
        to: item.employee.user.email,
        subject: `Slip Payroll Bimba ${formatDate(run.periodStart)} - ${formatDate(run.periodEnd)}`,
        text: buildPayrollEmail(run.periodStart, run.periodEnd, item)
      });

      await prisma.payrollItem.update({
        where: { id: item.id },
        data: {
          emailStatus: "SENT",
          emailSentAt: new Date()
        }
      });
    } catch {
      await prisma.payrollItem.update({
        where: { id: item.id },
        data: {
          emailStatus: "FAILED"
        }
      });
    }
  }

  return NextResponse.redirect(new URL("/payroll", request.url), 303);
}

function buildPayrollEmail(
  periodStart: Date,
  periodEnd: Date,
  item: {
    employee: { fullName: string };
    grossEarnings: number;
    totalDeductions: number;
    netPay: number;
    lines: Array<{
      componentName: string;
      quantity: number;
      amount: number;
    }>;
  }
) {
  const lines = item.lines
    .map((line) => `- ${line.componentName} (${line.quantity}): ${formatRupiah(line.amount)}`)
    .join("\n");

  return [
    `Halo ${item.employee.fullName},`,
    "",
    `Berikut slip payroll periode ${formatDate(periodStart)} - ${formatDate(periodEnd)}.`,
    "",
    lines,
    "",
    `Total earning: ${formatRupiah(item.grossEarnings)}`,
    `Total deduction: ${formatRupiah(item.totalDeductions)}`,
    `Take-home pay: ${formatRupiah(item.netPay)}`,
    "",
    "Terima kasih."
  ].join("\n");
}
