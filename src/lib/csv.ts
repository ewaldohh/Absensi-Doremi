type CsvValue = Date | number | string | null | undefined;

export type CsvColumn<T> = {
  header: string;
  value: (row: T) => CsvValue;
};

export function toExcelCsv<T>(columns: Array<CsvColumn<T>>, rows: T[]) {
  const delimiter = ";";
  const headerLine = columns.map((column) => escapeCsvCell(column.header, delimiter)).join(delimiter);
  const rowLines = rows.map((row) =>
    columns.map((column) => escapeCsvCell(formatCsvValue(column.value(row)), delimiter)).join(delimiter)
  );

  return `\uFEFFsep=${delimiter}\r\n${[headerLine, ...rowLines].join("\r\n")}\r\n`;
}

function formatCsvValue(value: CsvValue) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return value ?? "";
}

function escapeCsvCell(value: CsvValue, delimiter: string) {
  const text = String(value ?? "");

  if (text.includes('"') || text.includes("\n") || text.includes("\r") || text.includes(delimiter)) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}
