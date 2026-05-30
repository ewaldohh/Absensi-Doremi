import * as XLSX from "xlsx";
import { combineDateAndTime, endOfDateInput, startOfDateInput, toDateInputValue } from "@/lib/dates";
import { prisma } from "@/lib/db";

const sheetName = "Absensi";
const employeeSheetName = "Referensi Karyawan";
const branchSheetName = "Referensi Cabang";
const headers = [
  "email_karyawan",
  "kode_karyawan",
  "nama_karyawan",
  "nama_cabang",
  "tanggal",
  "jadwal_masuk",
  "jadwal_pulang",
  "jam_masuk",
  "jam_pulang",
  "status",
  "catatan"
];
const attendanceStatuses = ["VALID", "PENDING_REVIEW", "REJECTED", "CORRECTED"] as const;

type AttendanceStatusValue = (typeof attendanceStatuses)[number];
type WorkbookEmployee = {
  employeeCode: string;
  fullName: string;
  user: {
    email: string;
  };
  defaultBranch: {
    name: string;
  } | null;
};
type WorkbookBranch = {
  name: string;
  address: string | null;
};
type PreparedAttendanceRow = {
  rowNumber: number;
  employeeId: string;
  branchId: string;
  dateInput: string;
  scheduleStartTime: string | null;
  scheduleEndTime: string | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: AttendanceStatusValue;
  notes: string | null;
};
type ImportSummary = {
  rows: number;
  eventsCreated: number;
  schedulesCreated: number;
  schedulesMatched: number;
  errors: string[];
};

export function createAttendanceTemplateWorkbook(employees: WorkbookEmployee[], branches: WorkbookBranch[]) {
  const workbook = XLSX.utils.book_new();
  const sampleEmployee = employees[0];
  const sampleBranch = sampleEmployee?.defaultBranch?.name || branches[0]?.name || "Doremi Playroom";
  const sampleRows = [
    {
      email_karyawan: sampleEmployee?.user.email || "guru@bimba.local",
      kode_karyawan: sampleEmployee?.employeeCode || "EMP001",
      nama_karyawan: sampleEmployee?.fullName || "Nama Karyawan",
      nama_cabang: sampleBranch,
      tanggal: "2026-04-29",
      jadwal_masuk: "08:00",
      jadwal_pulang: "12:00",
      jam_masuk: "08:10",
      jam_pulang: "12:05",
      status: "VALID",
      catatan: "contoh baris, silakan hapus"
    }
  ];

  const attendanceSheet = XLSX.utils.json_to_sheet(sampleRows, { header: headers });
  attendanceSheet["!cols"] = headers.map(() => ({ wch: 18 }));
  XLSX.utils.book_append_sheet(workbook, attendanceSheet, sheetName);

  const employeeSheet = XLSX.utils.json_to_sheet(
    employees.map((employee) => ({
      email_karyawan: employee.user.email,
      kode_karyawan: employee.employeeCode,
      nama_karyawan: employee.fullName,
      cabang_default: employee.defaultBranch?.name ?? ""
    }))
  );
  employeeSheet["!cols"] = [{ wch: 28 }, { wch: 18 }, { wch: 28 }, { wch: 24 }];
  XLSX.utils.book_append_sheet(workbook, employeeSheet, employeeSheetName);

  const branchSheet = XLSX.utils.json_to_sheet(
    branches.map((branch) => ({
      nama_cabang: branch.name,
      alamat: branch.address ?? ""
    }))
  );
  branchSheet["!cols"] = [{ wch: 28 }, { wch: 48 }];
  XLSX.utils.book_append_sheet(workbook, branchSheet, branchSheetName);

  return workbook;
}

export async function importAttendanceWorkbook(buffer: Buffer, importedBy: string): Promise<ImportSummary> {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: true
  });
  const worksheet = workbook.Sheets[sheetName] ?? workbook.Sheets[workbook.SheetNames[0]];

  if (!worksheet) {
    return {
      rows: 0,
      eventsCreated: 0,
      schedulesCreated: 0,
      schedulesMatched: 0,
      errors: ["Sheet Absensi tidak ditemukan."]
    };
  }

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: "",
    raw: true
  });

  const [employees, branches] = await Promise.all([
    prisma.employee.findMany({
      include: {
        user: true,
        defaultBranch: true
      }
    }),
    prisma.branch.findMany({
      where: {
        isActive: true
      }
    })
  ]);
  const employeeByEmail = new Map(employees.map((employee) => [normalizeKey(employee.user.email), employee]));
  const employeeByCode = new Map(employees.map((employee) => [normalizeKey(employee.employeeCode), employee]));
  const branchByName = new Map(branches.map((branch) => [normalizeKey(branch.name), branch]));
  const errors: string[] = [];
  const preparedRows: PreparedAttendanceRow[] = [];

  rawRows.forEach((rawRow, index) => {
    const rowNumber = index + 2;
    const row = normalizeRow(rawRow);

    if (isEmptyRow(row)) {
      return;
    }

    const email = readText(row, "email_karyawan", "email");
    const employeeCode = readText(row, "kode_karyawan", "kode");
    const employee = email ? employeeByEmail.get(normalizeKey(email)) : employeeByCode.get(normalizeKey(employeeCode));

    if (!employee) {
      errors.push(`Baris ${rowNumber}: karyawan tidak ditemukan. Isi email_karyawan atau kode_karyawan sesuai data aplikasi.`);
      return;
    }

    const branchName = readText(row, "nama_cabang", "cabang");
    const branch = branchName ? branchByName.get(normalizeKey(branchName)) : employee.defaultBranch;

    if (!branch) {
      errors.push(`Baris ${rowNumber}: cabang tidak ditemukan dan karyawan tidak punya cabang default.`);
      return;
    }

    const dateInput = parseDateCell(readValue(row, "tanggal", "date"));
    const scheduleStartTime = parseTimeCell(readValue(row, "jadwal_masuk", "schedule_start"));
    const scheduleEndTime = parseTimeCell(readValue(row, "jadwal_pulang", "schedule_end"));
    const checkInTime = parseTimeCell(readValue(row, "jam_masuk", "check_in"));
    const checkOutTime = parseTimeCell(readValue(row, "jam_pulang", "check_out"));
    const status = parseStatus(readText(row, "status"));

    if (!dateInput) {
      errors.push(`Baris ${rowNumber}: tanggal wajib diisi dengan format YYYY-MM-DD atau DD/MM/YYYY.`);
      return;
    }

    if (!checkInTime && !checkOutTime) {
      errors.push(`Baris ${rowNumber}: minimal jam_masuk atau jam_pulang wajib diisi.`);
      return;
    }

    if ((scheduleStartTime && !scheduleEndTime) || (!scheduleStartTime && scheduleEndTime)) {
      errors.push(`Baris ${rowNumber}: jadwal_masuk dan jadwal_pulang harus diisi berpasangan.`);
      return;
    }

    if (!status) {
      errors.push(`Baris ${rowNumber}: status harus VALID, PENDING_REVIEW, REJECTED, atau CORRECTED.`);
      return;
    }

    preparedRows.push({
      rowNumber,
      employeeId: employee.id,
      branchId: branch.id,
      dateInput,
      scheduleStartTime,
      scheduleEndTime,
      checkInTime,
      checkOutTime,
      status,
      notes: readText(row, "catatan", "notes") || null
    });
  });

  if (errors.length > 0) {
    return {
      rows: preparedRows.length,
      eventsCreated: 0,
      schedulesCreated: 0,
      schedulesMatched: 0,
      errors
    };
  }

  let eventsCreated = 0;
  let schedulesCreated = 0;
  let schedulesMatched = 0;
  const resetKeys = Array.from(new Set(preparedRows.map((row) => `${row.employeeId}|${row.branchId}|${row.dateInput}`))).map((key) => {
    const [employeeId, branchId, dateInput] = key.split("|");
    return { employeeId, branchId, dateInput };
  });

  await prisma.$transaction(async (tx) => {
    for (const key of resetKeys) {
      await tx.attendanceEvent.deleteMany({
        where: {
          employeeId: key.employeeId,
          branchId: key.branchId,
          source: "ADMIN_ADJUSTMENT",
          eventTime: {
            gte: startOfDateInput(key.dateInput),
            lte: endOfDateInput(key.dateInput)
          }
        }
      });
    }

    for (const row of preparedRows) {
      let schedule = await tx.schedule.findFirst({
        where: {
          employeeId: row.employeeId,
          branchId: row.branchId,
          scheduleDate: startOfDateInput(row.dateInput),
          status: {
            not: "CANCELLED"
          }
        },
        orderBy: {
          startTime: "asc"
        }
      });

      if (schedule) {
        schedulesMatched += 1;
      }

      if (schedule && row.scheduleStartTime && row.scheduleEndTime && schedule.notes?.startsWith("Import absensi Excel")) {
        schedule = await tx.schedule.update({
          where: { id: schedule.id },
          data: {
            startTime: combineDateAndTime(row.dateInput, row.scheduleStartTime),
            endTime: combineDateAndTime(row.dateInput, row.scheduleEndTime),
            updatedBy: importedBy
          }
        });
      }

      if (!schedule && row.scheduleStartTime && row.scheduleEndTime) {
        schedule = await tx.schedule.create({
          data: {
            employeeId: row.employeeId,
            branchId: row.branchId,
            scheduleDate: startOfDateInput(row.dateInput),
            startTime: combineDateAndTime(row.dateInput, row.scheduleStartTime),
            endTime: combineDateAndTime(row.dateInput, row.scheduleEndTime),
            scheduleType: "OTHER",
            status: "SCHEDULED",
            notes: `Import absensi Excel baris ${row.rowNumber}`,
            createdBy: importedBy
          }
        });
        schedulesCreated += 1;
      }

      const notes = ["Import absensi Excel", row.notes].filter(Boolean).join(" - ");

      if (row.checkInTime) {
        await tx.attendanceEvent.create({
          data: {
            employeeId: row.employeeId,
            branchId: row.branchId,
            scheduleId: schedule?.id,
            eventType: "CHECK_IN",
            eventTime: combineDateAndTime(row.dateInput, row.checkInTime),
            source: "ADMIN_ADJUSTMENT",
            status: row.status,
            notes
          }
        });
        eventsCreated += 1;
      }

      if (row.checkOutTime) {
        await tx.attendanceEvent.create({
          data: {
            employeeId: row.employeeId,
            branchId: row.branchId,
            scheduleId: schedule?.id,
            eventType: "CHECK_OUT",
            eventTime: combineDateAndTime(row.dateInput, row.checkOutTime),
            source: "ADMIN_ADJUSTMENT",
            status: row.status,
            notes
          }
        });
        eventsCreated += 1;
      }
    }
  });

  return {
    rows: preparedRows.length,
    eventsCreated,
    schedulesCreated,
    schedulesMatched,
    errors: []
  };
}

function normalizeRow(row: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [normalizeHeader(key), value]));
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

function readValue(row: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = row[normalizeHeader(key)];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }

  return "";
}

function readText(row: Record<string, unknown>, ...keys: string[]) {
  const value = readValue(row, ...keys);
  return value === null || value === undefined ? "" : String(value).trim();
}

function isEmptyRow(row: Record<string, unknown>) {
  return Object.values(row).every((value) => String(value ?? "").trim() === "");
}

function parseStatus(value: string): AttendanceStatusValue | null {
  const normalized = (value || "VALID").trim().toUpperCase().replace(/\s+/g, "_");
  return attendanceStatuses.includes(normalized as AttendanceStatusValue) ? (normalized as AttendanceStatusValue) : null;
}

function parseDateCell(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatDateParts(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
  }

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      return formatDateParts(parsed.y, parsed.m, parsed.d);
    }
  }

  const text = String(value ?? "").trim();
  if (!text) {
    return null;
  }

  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    return formatDateParts(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }

  const slash = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (slash) {
    const year = Number(slash[3].length === 2 ? `20${slash[3]}` : slash[3]);
    return formatDateParts(year, Number(slash[2]), Number(slash[1]));
  }

  return null;
}

function parseTimeCell(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatTimeParts(value.getUTCHours(), value.getUTCMinutes());
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const totalMinutes = Math.round((value % 1) * 24 * 60);
    return formatTimeParts(Math.floor(totalMinutes / 60), totalMinutes % 60);
  }

  const text = String(value ?? "").trim();
  if (!text) {
    return null;
  }

  const normalized = text.replace(".", ":");
  const hhmm = normalized.match(/^(\d{1,2}):(\d{1,2})/);
  if (hhmm) {
    return formatTimeParts(Number(hhmm[1]), Number(hhmm[2]));
  }

  const compact = normalized.match(/^(\d{1,2})(\d{2})$/);
  if (compact) {
    return formatTimeParts(Number(compact[1]), Number(compact[2]));
  }

  const hourOnly = normalized.match(/^(\d{1,2})$/);
  if (hourOnly) {
    return formatTimeParts(Number(hourOnly[1]), 0);
  }

  return null;
}

function formatDateParts(year: number, month: number, day: number) {
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatTimeParts(hour: number, minute: number) {
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
