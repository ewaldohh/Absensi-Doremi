import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { generatePayrollRun } from "@/lib/payroll";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user || (user.role !== "ADMIN" && user.role !== "OWNER")) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }

  const formData = await request.formData();
  await generatePayrollRun(String(formData.get("periodEnd") ?? ""), user.id);

  return NextResponse.redirect(new URL("/payroll", request.url), 303);
}
