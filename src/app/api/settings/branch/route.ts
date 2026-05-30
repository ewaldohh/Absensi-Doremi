import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user || (user.role !== "ADMIN" && user.role !== "OWNER")) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }

  const formData = await request.formData();
  const branchId = String(formData.get("branchId") ?? "");

  await prisma.branch.update({
    where: { id: branchId },
    data: {
      name: String(formData.get("name") ?? "").trim(),
      address: String(formData.get("address") ?? "").trim() || null,
      latitude: Number(formData.get("latitude") ?? 0),
      longitude: Number(formData.get("longitude") ?? 0),
      gpsRadiusMeters: Number(formData.get("gpsRadiusMeters") ?? 100)
    }
  });

  return NextResponse.redirect(new URL("/admin/settings", request.url), 303);
}
