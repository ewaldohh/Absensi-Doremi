const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0
});

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Jakarta"
});

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta"
});

const timeFormatter = new Intl.DateTimeFormat("id-ID", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta"
});

export function formatRupiah(value: number) {
  return rupiahFormatter.format(value);
}

export function formatDate(value: Date | string) {
  return dateFormatter.format(new Date(value));
}

export function formatDateTime(value: Date | string) {
  return dateTimeFormatter.format(new Date(value));
}

export function formatTime(value: Date | string) {
  return timeFormatter.format(new Date(value));
}

export function titleCaseEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
