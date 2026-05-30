import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { importAttendanceWorkbook } from "@/lib/attendance-import";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }

  if (user.role !== "ADMIN" && user.role !== "OWNER") {
    return NextResponse.redirect(new URL("/dashboard", request.url), 303);
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.redirect(new URL("/attendance/import?error=File Excel wajib diupload.", request.url), 303);
  }

  try {
    const summary = await importAttendanceWorkbook(Buffer.from(await file.arrayBuffer()), user.id);

    if (summary.errors.length > 0) {
      const firstErrors = summary.errors.slice(0, 5).join(" ");
      return NextResponse.redirect(new URL(`/attendance/import?error=${encodeURIComponent(firstErrors)}`, request.url), 303);
    }

    return NextResponse.redirect(
      new URL(
        `/attendance/import?success=${encodeURIComponent(
          `${summary.rows} baris diproses, ${summary.eventsCreated} event absensi dibuat, ${summary.schedulesCreated} jadwal dibuat.`
        )}`,
        request.url
      ),
      303
    );
  } catch (error) {
    console.error("Attendance import failed", error);
    return NextResponse.redirect(new URL("/attendance/import?error=Import absensi gagal. Pastikan format file sesuai template.", request.url), 303);
  }
}
