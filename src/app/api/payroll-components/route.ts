import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user || (user.role !== "ADMIN" && user.role !== "OWNER")) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }

  const formData = await request.formData();
  const action = String(formData.get("action") ?? "");

  if (action === "create-component") {
    await prisma.payrollComponent.create({
      data: {
        name: String(formData.get("name") ?? "").trim(),
        componentType: String(formData.get("componentType") ?? "EARNING") as "EARNING" | "DEDUCTION",
        calculationType: String(formData.get("calculationType") ?? "FIXED") as
          | "FIXED"
          | "PER_DAY"
          | "PER_HOUR"
          | "PER_SESSION"
          | "FORMULA",
        defaultAmount: Number(formData.get("defaultAmount") ?? 0)
      }
    });
  }

  if (action === "assign-component") {
    await prisma.employeePayrollComponent.create({
      data: {
        employeeId: String(formData.get("employeeId") ?? ""),
        payrollComponentId: String(formData.get("payrollComponentId") ?? ""),
        amount: Number(formData.get("amount") ?? 0)
      }
    });
  }

  return NextResponse.redirect(new URL("/admin/payroll-components", request.url), 303);
}
