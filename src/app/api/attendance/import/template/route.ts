import * as XLSX from "xlsx";
import { getCurrentUser } from "@/lib/auth";
import { createAttendanceTemplateWorkbook } from "@/lib/attendance-import";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user || (user.role !== "ADMIN" && user.role !== "OWNER")) {
    return Response.redirect(new URL("/login", request.url), 303);
  }

  const [employees, branches] = await Promise.all([
    prisma.employee.findMany({
      where: {
        isActive: true,
        user: {
          isActive: true
        }
      },
      include: {
        user: true,
        defaultBranch: true
      },
      orderBy: {
        fullName: "asc"
      }
    }),
    prisma.branch.findMany({
      where: {
        isActive: true
      },
      orderBy: {
        name: "asc"
      }
    })
  ]);
  const workbook = createAttendanceTemplateWorkbook(employees, branches);
  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx"
  }) as Buffer;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-import-absensi-doremi.xlsx"'
    }
  });
}
