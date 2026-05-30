import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/password";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL ?? "postgresql://user:password@localhost:5432/absensi_doremi"
});
const prisma = new PrismaClient({ adapter });

function dateAt(hour: number, minute: number) {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour, minute, 0, 0);
}

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.payrollItemLine.deleteMany();
  await prisma.payrollItem.deleteMany();
  await prisma.payrollRun.deleteMany();
  await prisma.employeePayrollComponent.deleteMany();
  await prisma.payrollComponent.deleteMany();
  await prisma.overtimeRequest.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.attendanceCorrection.deleteMany();
  await prisma.attendanceEvent.deleteMany();
  await prisma.qrToken.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.holiday.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.appSetting.deleteMany();

  const branch = await prisma.branch.create({
    data: {
      name: "Bimba Cabang Utama",
      address: "Alamat cabang utama",
      latitude: -6.34550435398156,
      longitude: 107.34550203265823,
      gpsRadiusMeters: 500
    }
  });

  await prisma.appSetting.createMany({
    data: [
      { key: "lateDeductionAmount", value: "15000" },
      { key: "leaveFreeDays", value: "2" },
      { key: "leaveDeductionAmount", value: "100000" },
      { key: "smtpHost", value: "" },
      { key: "smtpPort", value: "587" },
      { key: "smtpUser", value: "" },
      { key: "smtpPass", value: "" },
      { key: "smtpFrom", value: "Bimba Payroll <payroll@bimba.local>" }
    ]
  });

  const owner = await createUserWithEmployee({
    name: "Owner Bimba",
    email: "owner@bimba.local",
    password: "owner123",
    role: "OWNER",
    employeeCode: "OWN-001",
    fullName: "Owner Bimba",
    employmentType: "OTHER",
    branchId: branch.id
  });

  const admin = await createUserWithEmployee({
    name: "Admin Cabang",
    email: "admin@bimba.local",
    password: "admin123",
    role: "ADMIN",
    employeeCode: "ADM-001",
    fullName: "Admin Cabang",
    employmentType: "SUPPORT",
    branchId: branch.id
  });

  const teacher = await createUserWithEmployee({
    name: "Guru Demo",
    email: "guru@bimba.local",
    password: "guru123",
    role: "EMPLOYEE",
    employeeCode: "GR-001",
    fullName: "Guru Demo",
    employmentType: "PART_TIME",
    branchId: branch.id
  });

  const staff = await createUserWithEmployee({
    name: "Staff Demo",
    email: "staff@bimba.local",
    password: "staff123",
    role: "EMPLOYEE",
    employeeCode: "STF-001",
    fullName: "Staff Demo",
    employmentType: "FULL_TIME",
    branchId: branch.id
  });

  const gajiPokok = await prisma.payrollComponent.create({
    data: {
      name: "Gaji Pokok",
      componentType: "EARNING",
      calculationType: "FIXED",
      defaultAmount: 0
    }
  });

  const honorMengajar = await prisma.payrollComponent.create({
    data: {
      name: "Honor Mengajar",
      componentType: "EARNING",
      calculationType: "FIXED",
      defaultAmount: 0
    }
  });

  const lembur = await prisma.payrollComponent.create({
    data: {
      name: "Lembur",
      componentType: "EARNING",
      calculationType: "PER_HOUR",
      defaultAmount: 25000
    }
  });

  await prisma.employeePayrollComponent.createMany({
    data: [
      {
        employeeId: owner.employee!.id,
        payrollComponentId: gajiPokok.id,
        amount: 0
      },
      {
        employeeId: admin.employee!.id,
        payrollComponentId: gajiPokok.id,
        amount: 3500000
      },
      {
        employeeId: admin.employee!.id,
        payrollComponentId: lembur.id,
        amount: 25000
      },
      {
        employeeId: teacher.employee!.id,
        payrollComponentId: honorMengajar.id,
        amount: 1800000
      },
      {
        employeeId: teacher.employee!.id,
        payrollComponentId: lembur.id,
        amount: 25000
      },
      {
        employeeId: staff.employee!.id,
        payrollComponentId: gajiPokok.id,
        amount: 3000000
      },
      {
        employeeId: staff.employee!.id,
        payrollComponentId: lembur.id,
        amount: 25000
      }
    ]
  });

  await prisma.schedule.createMany({
    data: [
      {
        employeeId: teacher.employee!.id,
        branchId: branch.id,
        scheduleDate: dateAt(0, 0),
        startTime: dateAt(9, 0),
        endTime: dateAt(15, 0),
        scheduleType: "TEACHING",
        notes: "Jadwal demo guru"
      },
      {
        employeeId: staff.employee!.id,
        branchId: branch.id,
        scheduleDate: dateAt(0, 0),
        startTime: dateAt(8, 0),
        endTime: dateAt(16, 0),
        scheduleType: "OPERATIONAL",
        notes: "Jadwal demo staff"
      },
      {
        employeeId: admin.employee!.id,
        branchId: branch.id,
        scheduleDate: dateAt(0, 0),
        startTime: dateAt(8, 0),
        endTime: dateAt(17, 0),
        scheduleType: "ADMIN",
        notes: "Jadwal demo admin"
      }
    ]
  });

  console.log("Seed complete");
  console.log("Owner: owner@bimba.local / owner123");
  console.log("Admin: admin@bimba.local / admin123");
  console.log("Guru: guru@bimba.local / guru123");
  console.log("Staff: staff@bimba.local / staff123");
}

async function createUserWithEmployee(input: {
  name: string;
  email: string;
  password: string;
  role: "EMPLOYEE" | "ADMIN" | "OWNER";
  employeeCode: string;
  fullName: string;
  employmentType: "FULL_TIME" | "PART_TIME" | "SUPPORT" | "OTHER";
  branchId: string;
}) {
  return prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: hashPassword(input.password),
      role: input.role,
      employee: {
        create: {
          employeeCode: input.employeeCode,
          fullName: input.fullName,
          employmentType: input.employmentType,
          defaultBranchId: input.branchId,
          startDate: new Date()
        }
      }
    },
    include: {
      employee: true
    }
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
