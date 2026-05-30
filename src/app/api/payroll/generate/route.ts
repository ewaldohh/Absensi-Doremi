import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { generatePayrollRun } from "@/lib/payroll";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user || (user.role !== "ADMIN" && user.role !== "OWNER")) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }

  const formData = await request.formData();
  try {
    await generatePayrollRun(String(formData.get("periodEnd") ?? ""), user.id);
  } catch (error) {
    console.error("Payroll generation failed", error);
    return NextResponse.redirect(
      new URL("/payroll?error=Generate payroll gagal. Pastikan database sudah di-update dan coba lagi.", request.url),
      303
    );
  }

  return NextResponse.redirect(new URL("/payroll?success=Payroll berhasil digenerate.", request.url), 303);
}
