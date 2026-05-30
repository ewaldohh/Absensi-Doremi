import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const componentTypes = ["EARNING", "DEDUCTION"] as const;
const calculationTypes = ["FIXED", "PER_DAY", "PER_HOUR", "PER_SESSION", "FORMULA"] as const;

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }

  if (user.role !== "OWNER") {
    return NextResponse.redirect(new URL("/dashboard", request.url), 303);
  }

  const formData = await request.formData();
  const action = String(formData.get("action") ?? "");
  const redirectTo = (message: string, type: "error" | "success" = "success") =>
    NextResponse.redirect(new URL(`/admin/payroll-components?${type}=${encodeURIComponent(message)}`, request.url), 303);

  try {
    if (action === "create-component" || action === "update-component") {
      const componentId = String(formData.get("componentId") ?? "");
      const name = String(formData.get("name") ?? "").trim();
      const componentType = readOption(formData, "componentType", componentTypes, "EARNING");
      const calculationType = readOption(formData, "calculationType", calculationTypes, "FIXED");
      const defaultAmount = Number(formData.get("defaultAmount") ?? 0);
      const isTaxable = String(formData.get("isTaxable") ?? "false") === "true";
      const isActive = String(formData.get("isActive") ?? "true") === "true";

      if (!name) {
        return redirectTo("Nama komponen wajib diisi.", "error");
      }

      if (!Number.isFinite(defaultAmount)) {
        return redirectTo("Nominal default harus berupa angka.", "error");
      }

      const nameOwner = await findComponentByNormalizedName(name);
      if (nameOwner && nameOwner.id !== componentId) {
        return redirectTo("Nama komponen sudah ada. Gunakan nama lain atau edit komponen yang sudah ada.", "error");
      }

      if (action === "update-component") {
        if (!componentId) {
          return redirectTo("Komponen tidak ditemukan.", "error");
        }

        await prisma.payrollComponent.update({
          where: { id: componentId },
          data: {
            name,
            componentType,
            calculationType,
            defaultAmount,
            isTaxable,
            isActive
          }
        });

        return redirectTo("Komponen payroll diperbarui.");
      }

      await prisma.payrollComponent.create({
        data: {
          name,
          componentType,
          calculationType,
          defaultAmount,
          isTaxable,
          isActive
        }
      });

      return redirectTo("Komponen payroll ditambahkan.");
    }

    if (action === "assign-component") {
      const employeeId = String(formData.get("employeeId") ?? "");
      const payrollComponentId = String(formData.get("payrollComponentId") ?? "");
      const amount = Number(formData.get("amount") ?? 0);

      if (!employeeId || !payrollComponentId || !Number.isFinite(amount)) {
        return redirectTo("Karyawan, komponen, dan nominal wajib diisi dengan benar.", "error");
      }

      const existingAssignment = await prisma.employeePayrollComponent.findFirst({
        where: {
          employeeId,
          payrollComponentId,
          isActive: true
        },
        orderBy: {
          createdAt: "desc"
        }
      });

      if (existingAssignment) {
        await prisma.employeePayrollComponent.update({
          where: { id: existingAssignment.id },
          data: { amount }
        });

        return redirectTo("Assignment komponen karyawan diperbarui.");
      }

      await prisma.employeePayrollComponent.create({
        data: {
          employeeId,
          payrollComponentId,
          amount
        }
      });

      return redirectTo("Komponen berhasil di-assign ke karyawan.");
    }

    return redirectTo("Aksi komponen tidak dikenal.", "error");
  } catch (error) {
    console.error("Payroll component mutation failed", error);
    return redirectTo("Gagal menyimpan komponen payroll. Periksa data dan coba lagi.", "error");
  }
}

function readOption<const T extends readonly string[]>(formData: FormData, key: string, options: T, fallback: T[number]) {
  const value = String(formData.get(key) ?? fallback);
  return (options as readonly string[]).includes(value) ? (value as T[number]) : fallback;
}

async function findComponentByNormalizedName(name: string) {
  const normalizedName = normalizeName(name);
  const components = await prisma.payrollComponent.findMany({
    select: {
      id: true,
      name: true
    }
  });

  return components.find((component) => normalizeName(component.name) === normalizedName) ?? null;
}

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}
