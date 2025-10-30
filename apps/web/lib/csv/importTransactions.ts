import { z } from "zod";

export type TransactionKind = "income" | "expense";

export interface CsvTransactionRecord {
  rowNumber: number;
  occurredOn: string;
  description: string;
  amount: number;
  type: TransactionKind;
  category: string | null;
  notes: string | null;
  raw: Record<string, string>;
  duplicateOfRow?: number;
}

export interface CsvDuplicate {
  key: string;
  firstRow: number;
  duplicateRow: number;
}

export interface CsvRowError {
  rowNumber: number;
  message: string;
  raw: Record<string, string>;
}

export interface CsvParseMetadata {
  totalRows: number;
  processedRows: number;
  skippedRows: number;
  duplicateCount: number;
  headers: string[];
  source?: string;
}

export interface CsvParseOptions {
  /** Optional CSV delimiter. Defaults to comma. */
  delimiter?: string;
  /** Decimal separator used in amount fields. Defaults to dot. */
  decimalSeparator?: "." | ",";
  /** Provide when parsing strings directly so the caller can reference origin. */
  sourceName?: string;
}

export interface CsvParseResult {
  transactions: CsvTransactionRecord[];
  duplicates: CsvDuplicate[];
  errors: CsvRowError[];
  metadata: CsvParseMetadata;
}

const DEFAULT_OPTIONS: Required<Pick<CsvParseOptions, "delimiter" | "decimalSeparator">> = {
  delimiter: ",",
  decimalSeparator: ".",
};

const HEADER_ALIAS_MAP: Record<string, keyof CsvHeaderRecord> = {
  date: "date",
  transaction_date: "date",
  posted_date: "date",
  booking_date: "date",
  occurred_on: "date",
  description: "description",
  details: "description",
  memo: "description",
  amount: "amount",
  value: "amount",
  eur: "amount",
  debit: "amount",
  credit: "amount",
  type: "type",
  transaction_type: "type",
  category: "category",
  category_name: "category",
  tag: "category",
  notes: "notes",
  note: "notes",
  memo_note: "notes",
  reference: "externalId",
  external_id: "externalId",
  id: "externalId",
};

type NormalizedHeader = keyof typeof HEADER_ALIAS_MAP extends infer T
  ? T extends string
    ? T
    : never
  : never;

type CsvHeaderRecord = {
  date?: string;
  description?: string;
  amount?: string;
  type?: string;
  category?: string;
  notes?: string;
  externalId?: string;
};

const REQUIRED_HEADERS: Array<keyof CsvHeaderRecord> = [
  "date",
  "description",
  "amount",
];

const typeSchema = z
  .enum(["income", "expense", "credit", "debit", "inflow", "outflow", "withdrawal", "deposit", "payment"])
  .transform((value) => normalizeTransactionType(value));

function normalizeTransactionType(value: string): TransactionKind {
  const normalized = value.trim().toLowerCase();

  if (["income", "credit", "inflow", "deposit"].includes(normalized)) {
    return "income";
  }

  if (["expense", "debit", "outflow", "withdrawal", "payment"].includes(normalized)) {
    return "expense";
  }

  return "income";
}

function sanitizeHeader(header: string): NormalizedHeader {
  return header
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_") as NormalizedHeader;
}

function parseCsv(content: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let currentField = "";
  let currentRow: string[] = [];
  let insideQuotes = false;

  const pushField = () => {
    currentRow.push(currentField);
    currentField = "";
  };

  const pushRow = () => {
    if (currentRow.length > 0 || currentField.length > 0) {
      pushField();
    }

    if (currentRow.length > 0) {
      rows.push(currentRow);
    }

    currentRow = [];
  };

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];

    if (char === "\"") {
      const nextChar = content[index + 1];

      if (insideQuotes && nextChar === "\"") {
        currentField += "\"";
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }

      continue;
    }

    if (!insideQuotes && char === delimiter) {
      pushField();
      continue;
    }

    if (!insideQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && content[index + 1] === "\n") {
        index += 1;
      }

      pushRow();
      continue;
    }

    currentField += char;
  }

  pushRow();

  return rows;
}

function buildHeaderMap(headers: string[]): Array<keyof CsvHeaderRecord | null> {
  return headers.map((header) => {
    const sanitized = sanitizeHeader(header);
    const mapped = HEADER_ALIAS_MAP[sanitized];
    return mapped ?? null;
  });
}

function ensureRequiredHeaders(
  headerMap: Array<keyof CsvHeaderRecord | null>,
  headers: string[],
): asserts headerMap is Array<keyof CsvHeaderRecord | null> {
  const present = new Set(headerMap.filter((header): header is keyof CsvHeaderRecord => Boolean(header)));
  const missing = REQUIRED_HEADERS.filter((required) => !present.has(required));

  if (missing.length > 0) {
    throw new Error(
      `CSV is missing required columns: ${missing
        .map((header) => `"${header}"`)
        .join(", ")} (detected headers: ${headers.join(", ")})`,
    );
  }
}

function parseAmount(raw: string | undefined, decimalSeparator: "." | ","): number | null {
  if (!raw) {
    return null;
  }

  const trimmed = raw.trim();

  if (!trimmed) {
    return null;
  }

  let normalized = trimmed.replace(/[^0-9,.-]/g, "");

  if (decimalSeparator === ",") {
    normalized = normalized.replace(/\./g, "");
    const lastComma = normalized.lastIndexOf(",");

    if (lastComma !== -1) {
      normalized = `${normalized.slice(0, lastComma).replace(/,/g, "")}.${normalized.slice(lastComma + 1)}`;
    }
  } else {
    normalized = normalized.replace(/,/g, "");
  }

  const parsed = Number(normalized);

  if (Number.isNaN(parsed)) {
    return null;
  }

  return parsed;
}

function parseDate(raw: string | undefined): string | null {
  if (!raw) {
    return null;
  }

  const trimmed = raw.trim();

  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.replace(/[.]/g, "/");
  const parts = normalized.split(/[\/-]/).filter(Boolean);

  if (parts.length !== 3) {
    return null;
  }

  let year: number;
  let month: number;
  let day: number;

  if (parts[0].length === 4) {
    year = Number(parts[0]);
    month = Number(parts[1]);
    day = Number(parts[2]);
  } else if (parts[2].length === 4) {
    year = Number(parts[2]);
    const first = Number(parts[0]);
    const second = Number(parts[1]);

    if (first > 12 && second <= 12) {
      day = first;
      month = second;
    } else if (second > 12 && first <= 12) {
      month = first;
      day = second;
    } else {
      // Default to DD/MM/YYYY ordering when ambiguous.
      day = first;
      month = second;
    }
  } else {
    return null;
  }

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  const candidate = new Date(Date.UTC(year, month - 1, day));

  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return null;
  }

  return candidate.toISOString().slice(0, 10);
}

function toRecord(headers: string[], values: string[]): Record<string, string> {
  const record: Record<string, string> = {};

  headers.forEach((header, index) => {
    const value = values[index] ?? "";
    record[header] = value.trim();
  });

  return record;
}

function normalizeWhitespace(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized : null;
}

function computeDuplicateKey(transaction: CsvTransactionRecord): string {
  return [transaction.occurredOn, transaction.description.toLowerCase(), transaction.amount.toFixed(2)].join("|");
}

export async function parseTransactionCsv(
  file: File,
  options: CsvParseOptions = {},
): Promise<CsvParseResult> {
  const content = await file.text();
  return parseTransactionCsvText(content, { ...options, sourceName: options.sourceName ?? file.name });
}

export function parseTransactionCsvText(
  csvContent: string,
  options: CsvParseOptions = {},
): CsvParseResult {
  const { delimiter, decimalSeparator } = { ...DEFAULT_OPTIONS, ...options };
  const rows = parseCsv(csvContent, delimiter);

  if (rows.length === 0) {
    return {
      transactions: [],
      duplicates: [],
      errors: [
        {
          rowNumber: 0,
          message: "CSV file does not contain any rows.",
          raw: {},
        },
      ],
      metadata: {
        totalRows: 0,
        processedRows: 0,
        skippedRows: 0,
        duplicateCount: 0,
        headers: [],
        source: options.sourceName,
      },
    };
  }

  const [headerRow, ...valueRows] = rows;
  const headerMap = buildHeaderMap(headerRow);

  ensureRequiredHeaders(headerMap, headerRow);

  const transactions: CsvTransactionRecord[] = [];
  const duplicates: CsvDuplicate[] = [];
  const errors: CsvRowError[] = [];
  const seenKeys = new Map<string, number>();

  valueRows.forEach((values, index) => {
    const rowNumber = index + 2; // account for header row
    const rawRecord = toRecord(headerRow, values);
    const mapped: CsvHeaderRecord = {};

    headerMap.forEach((mappedHeader, columnIndex) => {
      if (!mappedHeader) {
        return;
      }

      mapped[mappedHeader] = values[columnIndex];
    });

    const occurredOn = parseDate(mapped.date);

    if (!occurredOn) {
      errors.push({
        rowNumber,
        message: "Missing or invalid date value.",
        raw: rawRecord,
      });
      return;
    }

    const description = normalizeWhitespace(mapped.description);

    if (!description) {
      errors.push({
        rowNumber,
        message: "Missing transaction description.",
        raw: rawRecord,
      });
      return;
    }

    const amountValue = parseAmount(mapped.amount, decimalSeparator ?? DEFAULT_OPTIONS.decimalSeparator);

    if (amountValue === null) {
      errors.push({
        rowNumber,
        message: "Missing or invalid amount value.",
        raw: rawRecord,
      });
      return;
    }

    let transactionType: TransactionKind | null = null;

    if (mapped.type) {
      const parsedType = typeSchema.safeParse(mapped.type.trim().toLowerCase());
      if (parsedType.success) {
        transactionType = parsedType.data;
      }
    }

    if (!transactionType) {
      transactionType = amountValue < 0 ? "expense" : "income";
    }

    const normalizedAmount = Math.abs(amountValue);
    const category = normalizeWhitespace(mapped.category);
    const notes = normalizeWhitespace(mapped.notes);

    const transaction: CsvTransactionRecord = {
      rowNumber,
      occurredOn,
      description,
      amount: Number(normalizedAmount.toFixed(2)),
      type: transactionType,
      category: category ?? null,
      notes: notes ?? null,
      raw: rawRecord,
    };

    const duplicateKey = computeDuplicateKey(transaction);
    const firstRow = seenKeys.get(duplicateKey);

    if (typeof firstRow === "number") {
      transaction.duplicateOfRow = firstRow;
      duplicates.push({
        key: duplicateKey,
        firstRow,
        duplicateRow: rowNumber,
      });
    } else {
      seenKeys.set(duplicateKey, rowNumber);
    }

    transactions.push(transaction);
  });

  return {
    transactions,
    duplicates,
    errors,
    metadata: {
      totalRows: valueRows.length,
      processedRows: transactions.length,
      skippedRows: errors.length,
      duplicateCount: duplicates.length,
      headers: headerRow,
      source: options.sourceName,
    },
  };
}

