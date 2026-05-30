const JAKARTA_OFFSET_HOURS = 7;
const JAKARTA_OFFSET_MS = JAKARTA_OFFSET_HOURS * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function startOfDay(date: Date) {
  return startOfDateInput(toDateInputValue(date));
}

export function endOfDay(date: Date) {
  return endOfDateInput(toDateInputValue(date));
}

export function startOfDateInput(dateInput: string) {
  const { year, month, day } = parseDateInput(dateInput);
  return new Date(Date.UTC(year, month - 1, day, -JAKARTA_OFFSET_HOURS, 0, 0, 0));
}

export function endOfDateInput(dateInput: string) {
  const { year, month, day } = parseDateInput(dateInput);
  return new Date(Date.UTC(year, month - 1, day, 23 - JAKARTA_OFFSET_HOURS, 59, 59, 999));
}

export function combineDateAndTime(dateInput: string, timeInput: string) {
  const { year, month, day } = parseDateInput(dateInput);
  const [hour, minute] = timeInput.split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour - JAKARTA_OFFSET_HOURS, minute, 0, 0));
}

export function toDateInputValue(date: Date) {
  const jakartaDate = new Date(date.getTime() + JAKARTA_OFFSET_MS);
  const year = jakartaDate.getUTCFullYear();
  const month = `${jakartaDate.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${jakartaDate.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isSundayInJakarta(date: Date) {
  const jakartaDate = new Date(date.getTime() + JAKARTA_OFFSET_MS);
  return jakartaDate.getUTCDay() === 0;
}

export function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * ONE_DAY_MS);
}

export function getPayrollPeriod(periodEndInput?: string) {
  const now = new Date();
  const selected = periodEndInput ? parseDateInput(periodEndInput) : parseDateInput(toDateInputValue(now));
  const periodEndInputValue = dateInputFromParts(selected.year, selected.month - 1, 29);
  const periodStartInputValue = dateInputFromParts(selected.year, selected.month - 2, 29);
  const periodEnd = endOfDateInput(periodEndInputValue);
  const periodStart = startOfDateInput(periodStartInputValue);

  return { periodStart, periodEnd };
}

export function daysBetweenInclusive(startDate: Date, endDate: Date) {
  const start = startOfDay(startDate).getTime();
  const end = startOfDay(endDate).getTime();
  return Math.max(1, Math.floor((end - start) / 86_400_000) + 1);
}

function parseDateInput(dateInput: string) {
  const [year, month, day] = dateInput.split("-").map(Number);

  if (!year || !month || !day) {
    throw new Error("Tanggal tidak valid.");
  }

  return { year, month, day };
}

function dateInputFromParts(year: number, monthIndex: number, day: number) {
  const normalized = new Date(Date.UTC(year, monthIndex, day));
  const normalizedYear = normalized.getUTCFullYear();
  const normalizedMonth = `${normalized.getUTCMonth() + 1}`.padStart(2, "0");
  const normalizedDay = `${normalized.getUTCDate()}`.padStart(2, "0");
  return `${normalizedYear}-${normalizedMonth}-${normalizedDay}`;
}
