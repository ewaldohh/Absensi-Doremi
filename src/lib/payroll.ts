import {
  AttendanceEventType,
  AttendanceStatus,
  PayrollCalculationType,
  PayrollComponentType,
  PayrollLineSource,
  RequestStatus
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { addDays, getPayrollPeriod, isSundayInJakarta, startOfDay, toDateInputValue } from "@/lib/dates";
import { getSettingsMap, settingNumber } from "@/lib/settings";

export async function generatePayrollRun(periodEndInput: string | undefined, generatedBy?: string) {
  const { periodStart, periodEnd } = getPayrollPeriod(periodEndInput);
  const settings = await getSettingsMap();
  const lateDeductionAmount = settingNumber(settings, "lateDeductionAmount");
  const leaveFreeDays = settingNumber(settings, "leaveFreeDays");
  const leaveDeductionAmount = settingNumber(settings, "leaveDeductionAmount");
  const employees = await prisma.employee.findMany({
    where: {
      isActive: true,
      user: {
        isActive: true
      }
    },
    include: {
      user: true,
      payrollComponents: {
        where: {
          isActive: true,
          payrollComponent: {
            isActive: true
          }
        },
        include: {
          payrollComponent: true
        }
      }
    },
    orderBy: {
      fullName: "asc"
    }
  });

  const lateComponent = await ensurePayrollComponent("Potongan Terlambat", "DEDUCTION", "PER_DAY", lateDeductionAmount);
  const leaveComponent = await ensurePayrollComponent("Potongan Izin/Sakit", "DEDUCTION", "PER_DAY", leaveDeductionAmount);
  const overtimeComponent = await ensurePayrollComponent("Lembur", "EARNING", "PER_HOUR", 0);
  const manualHolidays = await prisma.holiday.findMany({
    where: {
      holidayDate: {
        gte: periodStart,
        lte: periodEnd
      }
    }
  });
  const manualHolidayDates = new Set(manualHolidays.map((holiday) => toDateInputValue(holiday.holidayDate)));
  const isNonWorkingDay = (date: Date) => isSundayInJakarta(date) || manualHolidayDates.has(toDateInputValue(date));

  return prisma.$transaction(async (tx) => {
    await tx.payrollRun.deleteMany({
      where: {
        periodStart,
        periodEnd,
        status: "DRAFT"
      }
    });

    const run = await tx.payrollRun.create({
      data: {
        periodStart,
        periodEnd,
        generatedBy
      }
    });

    for (const employee of employees) {
      const fixedLines = employee.payrollComponents
        .filter((employeeComponent) => employeeComponent.payrollComponent.calculationType === PayrollCalculationType.FIXED)
        .map((employeeComponent) => {
          const component = employeeComponent.payrollComponent;
          const amount = employeeComponent.amount ?? component.defaultAmount;
          return {
            payrollComponentId: component.id,
            componentName: component.name,
            componentType: component.componentType,
            quantity: 1,
            rate: amount,
            amount,
            sourceType: PayrollLineSource.MANUAL
          };
        });

      const lateEvents = await tx.attendanceEvent.findMany({
        where: {
          employeeId: employee.id,
          eventType: AttendanceEventType.CHECK_IN,
          status: AttendanceStatus.VALID,
          eventTime: {
            gte: periodStart,
            lte: periodEnd
          },
          schedule: {
            is: {
              status: {
                not: "CANCELLED"
              }
            }
          }
        },
        include: {
          schedule: true
        }
      });

      const lateCount = lateEvents.filter((event) => {
        if (!event.schedule) {
          return false;
        }

        if (isNonWorkingDay(event.eventTime)) {
          return false;
        }

        const toleranceEnd = new Date(event.schedule.startTime.getTime() + 15 * 60 * 1000);
        return event.eventTime > toleranceEnd;
      }).length;

      const approvedLeaves = await tx.leaveRequest.findMany({
        where: {
          employeeId: employee.id,
          status: RequestStatus.APPROVED,
          startDate: {
            lte: periodEnd
          },
          endDate: {
            gte: periodStart
          }
        }
      });

      const leaveDays = approvedLeaves.reduce(
        (total, leave) => total + countWorkingLeaveDays(leave.startDate, leave.endDate, periodStart, periodEnd, isNonWorkingDay),
        0
      );
      const leaveDeductionDays = Math.max(0, leaveDays - leaveFreeDays);

      const approvedOvertimes = await tx.overtimeRequest.findMany({
        where: {
          employeeId: employee.id,
          status: RequestStatus.APPROVED,
          overtimeDate: {
            gte: periodStart,
            lte: periodEnd
          }
        }
      });

      const overtimeRate =
        employee.payrollComponents.find(
          (employeeComponent) => employeeComponent.payrollComponent.name.toLowerCase() === "lembur"
        )?.amount ?? overtimeComponent.defaultAmount;
      const overtimeMinutes = approvedOvertimes.reduce((total, overtime) => total + overtime.totalMinutes, 0);
      const overtimeHours = overtimeMinutes / 60;
      const overtimeAmount = Math.round(overtimeHours * overtimeRate);

      const automaticLineCandidates = [
        lateCount > 0
          ? {
              payrollComponentId: lateComponent.id,
              componentName: lateComponent.name,
              componentType: PayrollComponentType.DEDUCTION,
              quantity: lateCount,
              rate: lateDeductionAmount,
              amount: lateCount * lateDeductionAmount,
              sourceType: PayrollLineSource.ATTENDANCE,
              notes: `${lateCount} hari terlambat`
            }
          : null,
        leaveDeductionDays > 0
          ? {
              payrollComponentId: leaveComponent.id,
              componentName: leaveComponent.name,
              componentType: PayrollComponentType.DEDUCTION,
              quantity: leaveDeductionDays,
              rate: leaveDeductionAmount,
              amount: leaveDeductionDays * leaveDeductionAmount,
              sourceType: PayrollLineSource.LEAVE,
              notes: `${leaveDays} hari izin/sakit, ${leaveFreeDays} hari bebas potongan`
            }
          : null,
        overtimeAmount > 0
          ? {
              payrollComponentId: overtimeComponent.id,
              componentName: overtimeComponent.name,
              componentType: PayrollComponentType.EARNING,
              quantity: overtimeHours,
              rate: overtimeRate,
              amount: overtimeAmount,
              sourceType: PayrollLineSource.OVERTIME,
              notes: `${overtimeMinutes} menit lembur approved`
            }
          : null
      ];

      const automaticLines = automaticLineCandidates.filter(
        (line): line is Exclude<(typeof automaticLineCandidates)[number], null> => line !== null
      );

      const lines = [...fixedLines, ...automaticLines];
      const grossEarnings = lines
        .filter((line) => line.componentType === PayrollComponentType.EARNING)
        .reduce((total, line) => total + line.amount, 0);
      const totalDeductions = lines
        .filter((line) => line.componentType === PayrollComponentType.DEDUCTION)
        .reduce((total, line) => total + line.amount, 0);

      await tx.payrollItem.create({
        data: {
          payrollRunId: run.id,
          employeeId: employee.id,
          grossEarnings,
          totalDeductions,
          netPay: grossEarnings - totalDeductions,
          lines: {
            create: lines
          }
        }
      });
    }

    return run;
  });
}

async function ensurePayrollComponent(
  name: string,
  componentType: "EARNING" | "DEDUCTION",
  calculationType: "FIXED" | "PER_DAY" | "PER_HOUR" | "PER_SESSION" | "FORMULA",
  defaultAmount: number
) {
  const existing = await prisma.payrollComponent.findFirst({
    where: {
      name
    }
  });

  if (existing) {
    return existing;
  }

  return prisma.payrollComponent.create({
    data: {
      name,
      componentType,
      calculationType,
      defaultAmount
    }
  });
}

function countWorkingLeaveDays(
  leaveStart: Date,
  leaveEnd: Date,
  periodStart: Date,
  periodEnd: Date,
  isNonWorkingDay: (date: Date) => boolean
) {
  let total = 0;
  let cursor = new Date(Math.max(startOfDay(leaveStart).getTime(), startOfDay(periodStart).getTime()));
  const end = new Date(Math.min(startOfDay(leaveEnd).getTime(), startOfDay(periodEnd).getTime()));

  while (cursor <= end) {
    if (!isNonWorkingDay(cursor)) {
      total += 1;
    }

    cursor = addDays(cursor, 1);
  }

  return total;
}
