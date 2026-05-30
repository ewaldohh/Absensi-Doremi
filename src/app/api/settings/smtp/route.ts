import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSettingsMap, upsertSettings } from "@/lib/settings";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user || (user.role !== "ADMIN" && user.role !== "OWNER")) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }

  const formData = await request.formData();
  const current = await getSettingsMap();
  const nextPassword = String(formData.get("smtpPass") ?? "");

  await upsertSettings(
    {
      smtpHost: String(formData.get("smtpHost") ?? "").trim(),
      smtpPort: String(formData.get("smtpPort") ?? "587").trim() || "587",
      smtpUser: String(formData.get("smtpUser") ?? "").trim(),
      smtpPass: nextPassword || current.smtpPass,
      smtpFrom: String(formData.get("smtpFrom") ?? "").trim() || "Bimba Payroll <payroll@bimba.local>"
    },
    user.id
  );

  return NextResponse.redirect(new URL("/admin/settings", request.url), 303);
}
