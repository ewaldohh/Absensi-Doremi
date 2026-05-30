import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user || (user.role !== "ADMIN" && user.role !== "OWNER")) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }

  const formData = await request.formData();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "bimba123");
  const employeeCode = String(formData.get("employeeCode") ?? "").trim();
  const role = String(formData.get("role") ?? "EMPLOYEE") as "EMPLOYEE" | "ADMIN" | "OWNER";
  const employmentType = String(formData.get("employmentType") ?? "OTHER") as
    | "FULL_TIME"
    | "PART_TIME"
    | "SUPPORT"
    | "OTHER";
  const branchId = String(formData.get("branchId") ?? "");
  const phone = String(formData.get("phone") ?? "").trim();

  await prisma.user.create({
    data: {
      name: fullName,
      email,
      passwordHash: hashPassword(password),
      role,
      employee: {
        create: {
          employeeCode,
          fullName,
          phone: phone || null,
          employmentType,
          defaultBranchId: branchId,
          startDate: new Date()
        }
      }
    }
  });

  return NextResponse.redirect(new URL("/admin/employees", request.url), 303);
}
