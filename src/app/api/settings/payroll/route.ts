import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { upsertSettings } from "@/lib/settings";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user || (user.role !== "ADMIN" && user.role !== "OWNER")) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }

  const formData = await request.formData();

  await upsertSettings(
    {
      lateDeductionAmount: String(formData.get("lateDeductionAmount") ?? "15000"),
      leaveFreeDays: String(formData.get("leaveFreeDays") ?? "2"),
      leaveDeductionAmount: String(formData.get("leaveDeductionAmount") ?? "100000")
    },
    user.id
  );

  return NextResponse.redirect(new URL("/admin/settings", request.url), 303);
}
