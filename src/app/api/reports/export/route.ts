import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { toExcelCsv } from "@/lib/csv";
import { endOfDateInput, startOfDateInput, toDateInputValue } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { formatDate, formatDateTime, formatTime, titleCaseEnum } from "@/lib/format";

type ReportType = "all" | "attendance" | "requests";

type ReportRow = {
  category: string;
  employeeName: string;
  email: string;
  period: string;
  checkIn: string;
  checkOut: string;
  type: string;
  status: string;
  branch: string;
  source: string;
  notes: string;
  submittedAt: string;
  reviewedAt: string;
};

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }

  if (user.role !== "ADMIN" && user.role !== "OWNER") {
    return NextResponse.redirect(new URL("/dashboard", request.url), 303);
  }

  const url = new URL(request.url);
  const type = normalizeReportType(url.searchParams.get("type"));
  const { startInput, endInput, startDate, endDate } = getDateRange(url);
  const employeeId = url.searchParams.get("employeeId") || undefined;
  const employeeFilter = employeeId ? { employeeId } : {};

  const [attendanceEvents, corrections, leaves, overtimes] = await Promise.all([
    type === "all" || type === "attendance"
      ? prisma.attendanceEvent.findMany({
          where: {
            ...employeeFilter,
            eventTime: { gte: startDate, lte: endDate }
          },
          include: {
            employee: { include: { user: true } },
            branch: true
          },
          orderBy: { eventTime: "asc" }
        })
      : Promise.resolve([]),
    type === "all" || type === "requests"
      ? prisma.attendanceCorrection.findMany({
          where: {
            ...employeeFilter,
            correctionDate: { gte: startDate, lte: endDate }
          },
          include: {
            employee: { include: { user: true, defaultBranch: true } },
            schedule: { include: { branch: true } }
          },
          orderBy: { correctionDate: "asc" }
        })
      : Promise.resolve([]),
    type === "all" || type === "requests"
      ? prisma.leaveRequest.findMany({
          where: {
            ...employeeFilter,
            startDate: { lte: endDate },
            endDate: { gte: startDate }
          },
          include: {
            employee: { include: { user: true } }
          },
          orderBy: { startDate: "asc" }
        })
      : Promise.resolve([]),
    type === "all" || type === "requests"
      ? prisma.overtimeRequest.findMany({
          where: {
            ...employeeFilter,
            overtimeDate: { gte: startDate, lte: endDate }
          },
          include: {
            employee: { include: { user: true, defaultBranch: true } },
            schedule: { include: { branch: true } }
          },
          orderBy: { overtimeDate: "asc" }
        })
      : Promise.resolve([])
  ]);

  const rows: ReportRow[] = [
    ...attendanceEvents.map((event) => ({
      category: "Absensi",
      employeeName: event.employee.fullName,
      email: event.employee.user.email,
      period: formatDateTime(event.eventTime),
      checkIn: event.eventType === "CHECK_IN" ? formatTime(event.eventTime) : "",
      checkOut: event.eventType === "CHECK_OUT" ? formatTime(event.eventTime) : "",
      type: titleCaseEnum(event.eventType),
      status: titleCaseEnum(event.status),
      branch: event.branch.name,
      source: titleCaseEnum(event.source),
      notes: event.notes ?? "",
      submittedAt: formatDateTime(event.createdAt),
      reviewedAt: ""
    })),
    ...corrections.map((correction) => ({
      category: "Koreksi Absensi",
      employeeName: correction.employee.fullName,
      email: correction.employee.user.email,
      period: formatDate(correction.correctionDate),
      checkIn: correction.requestedCheckIn ? formatTime(correction.requestedCheckIn) : legacyCorrectionTime(correction, "CHECK_IN"),
      checkOut: correction.requestedCheckOut ? formatTime(correction.requestedCheckOut) : legacyCorrectionTime(correction, "CHECK_OUT"),
      type: "Koreksi Masuk/Pulang",
      status: titleCaseEnum(correction.status),
      branch: correction.schedule?.branch.name ?? correction.employee.defaultBranch?.name ?? "",
      source: "Pengajuan",
      notes: correction.reason,
      submittedAt: formatDateTime(correction.createdAt),
      reviewedAt: correction.reviewedAt ? formatDateTime(correction.reviewedAt) : ""
    })),
    ...leaves.map((leave) => ({
      category: "Izin/Sakit",
      employeeName: leave.employee.fullName,
      email: leave.employee.user.email,
      period: `${formatDate(leave.startDate)} - ${formatDate(leave.endDate)}`,
      checkIn: "",
      checkOut: "",
      type: titleCaseEnum(leave.leaveType),
      status: titleCaseEnum(leave.status),
      branch: "",
      source: "Pengajuan",
      notes: `${leave.totalDays} hari - ${leave.reason}`,
      submittedAt: formatDateTime(leave.createdAt),
      reviewedAt: leave.reviewedAt ? formatDateTime(leave.reviewedAt) : ""
    })),
    ...overtimes.map((overtime) => ({
      category: "Lembur",
      employeeName: overtime.employee.fullName,
      email: overtime.employee.user.email,
      period: formatDate(overtime.overtimeDate),
      checkIn: formatTime(overtime.startTime),
      checkOut: formatTime(overtime.endTime),
      type: `${overtime.totalMinutes} menit`,
      status: titleCaseEnum(overtime.status),
      branch: overtime.schedule?.branch.name ?? overtime.employee.defaultBranch?.name ?? "",
      source: "Pengajuan",
      notes: overtime.reason,
      submittedAt: formatDateTime(overtime.createdAt),
      reviewedAt: overtime.reviewedAt ? formatDateTime(overtime.reviewedAt) : ""
    }))
  ].sort((a, b) => a.employeeName.localeCompare(b.employeeName) || a.period.localeCompare(b.period));

  const csv = toExcelCsv(
    [
      { header: "Kategori", value: (row) => row.category },
      { header: "Karyawan", value: (row) => row.employeeName },
      { header: "Email", value: (row) => row.email },
      { header: "Tanggal/Periode", value: (row) => row.period },
      { header: "Jam Masuk", value: (row) => row.checkIn },
      { header: "Jam Pulang", value: (row) => row.checkOut },
      { header: "Jenis", value: (row) => row.type },
      { header: "Status", value: (row) => row.status },
      { header: "Cabang", value: (row) => row.branch },
      { header: "Sumber", value: (row) => row.source },
      { header: "Catatan", value: (row) => row.notes },
      { header: "Diajukan/Dibuat", value: (row) => row.submittedAt },
      { header: "Direview", value: (row) => row.reviewedAt }
    ],
    rows
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rekap-${type}-${startInput}-${endInput}.csv"`
    }
  });
}

function normalizeReportType(value: string | null): ReportType {
  if (value === "attendance" || value === "requests") {
    return value;
  }

  return "all";
}

function getDateRange(url: URL) {
  const today = new Date();
  const endInput = url.searchParams.get("end") || toDateInputValue(today);
  const [year, month] = endInput.split("-");
  const startInput = url.searchParams.get("start") || `${year}-${month}-01`;

  return {
    startInput,
    endInput,
    startDate: startOfDateInput(startInput),
    endDate: endOfDateInput(endInput)
  };
}

function legacyCorrectionTime(
  correction: {
    correctionType: "CHECK_IN" | "CHECK_OUT";
    requestedTime: Date;
  },
  type: "CHECK_IN" | "CHECK_OUT"
) {
  return correction.correctionType === type ? formatTime(correction.requestedTime) : "";
}
