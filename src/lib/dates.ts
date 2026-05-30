export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

export function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

export function combineDateAndTime(dateInput: string, timeInput: string) {
  const [year, month, day] = dateInput.split("-").map(Number);
  const [hour, minute] = timeInput.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

export function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getPayrollPeriod(periodEndInput?: string) {
  const now = new Date();
  const periodEndDate = periodEndInput ? new Date(`${periodEndInput}T23:59:59`) : now;
  const periodEnd = new Date(
    periodEndDate.getFullYear(),
    periodEndDate.getMonth(),
    29,
    23,
    59,
    59,
    999
  );
  const periodStart = new Date(periodEnd.getFullYear(), periodEnd.getMonth() - 1, 29, 0, 0, 0, 0);

  return { periodStart, periodEnd };
}

export function daysBetweenInclusive(startDate: Date, endDate: Date) {
  const start = startOfDay(startDate).getTime();
  const end = startOfDay(endDate).getTime();
  return Math.max(1, Math.floor((end - start) / 86_400_000) + 1);
}
