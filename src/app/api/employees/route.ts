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
  const action = String(formData.get("action") ?? "create");
  const employeeId = String(formData.get("employeeId") ?? "");

  try {
    if (action === "reset-password") {
      const password = String(formData.get("password") ?? "").trim();

      if (!employeeId || !password) {
        return NextResponse.redirect(new URL("/admin/employees?error=Password baru wajib diisi.", request.url), 303);
      }

      const employee = await prisma.employee.findUnique({
        where: { id: employeeId }
      });

      if (!employee) {
        return NextResponse.redirect(new URL("/admin/employees?error=Karyawan tidak ditemukan.", request.url), 303);
      }

      await prisma.$transaction([
        prisma.user.update({
          where: { id: employee.userId },
          data: { passwordHash: hashPassword(password) }
        }),
        prisma.session.deleteMany({
          where: { userId: employee.userId }
        })
      ]);

      return NextResponse.redirect(new URL("/admin/employees?success=Password karyawan berhasil direset.", request.url), 303);
    }

    if (action === "delete") {
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId }
      });

      if (!employee) {
        return NextResponse.redirect(new URL("/admin/employees?error=Karyawan tidak ditemukan.", request.url), 303);
      }

      if (employee.userId === user.id) {
        return NextResponse.redirect(new URL("/admin/employees?error=Akun sendiri tidak bisa dihapus dari halaman ini.", request.url), 303);
      }

      await prisma.$transaction([
        prisma.employee.update({
          where: { id: employeeId },
          data: {
            isActive: false,
            endDate: new Date()
          }
        }),
        prisma.user.update({
          where: { id: employee.userId },
          data: { isActive: false }
        }),
        prisma.session.deleteMany({
          where: { userId: employee.userId }
        })
      ]);

      return NextResponse.redirect(new URL("/admin/employees?success=Karyawan dinonaktifkan.", request.url), 303);
    }

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

    if (action === "update") {
      const isActive = String(formData.get("isActive") ?? "false") === "true";

      const employee = await prisma.employee.findUnique({
        where: { id: employeeId }
      });

      if (!employee) {
        return NextResponse.redirect(new URL("/admin/employees?error=Karyawan tidak ditemukan.", request.url), 303);
      }

      await prisma.$transaction([
        prisma.user.update({
          where: { id: employee.userId },
          data: {
            name: fullName,
            email,
            role,
            isActive
          }
        }),
        prisma.employee.update({
          where: { id: employeeId },
          data: {
            employeeCode,
            fullName,
            phone: phone || null,
            employmentType,
            defaultBranchId: branchId || null,
            isActive,
            endDate: isActive ? null : new Date()
          }
        })
      ]);

      return NextResponse.redirect(new URL("/admin/employees?success=Data karyawan diperbarui.", request.url), 303);
    }

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

    return NextResponse.redirect(new URL("/admin/employees?success=Karyawan ditambahkan.", request.url), 303);
  } catch (error) {
    console.error("Employee mutation failed", error);
    return NextResponse.redirect(new URL("/admin/employees?error=Gagal menyimpan data karyawan. Periksa email/kode agar tidak duplikat.", request.url), 303);
  }
}
