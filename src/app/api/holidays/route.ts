import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { startOfDateInput } from "@/lib/dates";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user || (user.role !== "ADMIN" && user.role !== "OWNER")) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }

  const formData = await request.formData();
  const action = String(formData.get("action") ?? "create");
  const id = String(formData.get("id") ?? "");

  try {
    if (action === "delete") {
      await prisma.holiday.delete({
        where: { id }
      });

      return NextResponse.redirect(new URL("/admin/holidays?success=Hari libur dihapus.", request.url), 303);
    }

    const holidayDateInput = String(formData.get("holidayDate") ?? "");
    const name = String(formData.get("name") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim();

    if (!holidayDateInput || !name) {
      return NextResponse.redirect(new URL("/admin/holidays?error=Tanggal dan nama libur wajib diisi.", request.url), 303);
    }

    if (action === "update") {
      await prisma.holiday.update({
        where: { id },
        data: {
          holidayDate: startOfDateInput(holidayDateInput),
          name,
          notes: notes || null
        }
      });

      return NextResponse.redirect(new URL("/admin/holidays?success=Hari libur diperbarui.", request.url), 303);
    }

    await prisma.holiday.create({
      data: {
        holidayDate: startOfDateInput(holidayDateInput),
        name,
        notes: notes || null,
        createdBy: user.id
      }
    });

    return NextResponse.redirect(new URL("/admin/holidays?success=Hari libur ditambahkan.", request.url), 303);
  } catch (error) {
    console.error("Holiday mutation failed", error);
    return NextResponse.redirect(new URL("/admin/holidays?error=Gagal menyimpan hari libur. Periksa apakah tanggal sudah pernah dibuat.", request.url), 303);
  }
}
