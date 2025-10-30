"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import {
  type CsvParseResult,
  parseTransactionCsv,
} from "../../lib/csv/importTransactions";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

export type ImportStatus =
  | "idle"
  | "ready"
  | "processing"
  | "success"
  | "error";

type ImportSummary = {
  insertedCount: number;
  failedCount: number;
  createdCategories: number;
  errors: string[];
};

export interface TransactionImportPanelProps {
  onImportComplete?: () => Promise<void> | void;
}

export function TransactionImportPanel({
  onImportComplete,
}: TransactionImportPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [helperMessage, setHelperMessage] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(
    null
  );
  const [isImporting, setIsImporting] = useState(false);

  const resetState = useCallback(() => {
    setSelectedFile(null);
    setStatus("idle");
    setError(null);
    setHelperMessage(null);
    setParseResult(null);
    setImportSummary(null);
    setIsImporting(false);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, []);

  const handleFileSelected = useCallback(
    (file: File | null) => {
      if (!file) {
        resetState();
        return;
      }

      const lowerName = file.name.toLowerCase();
      const isCsv =
        lowerName.endsWith(".csv") ||
        file.type === "text/csv" ||
        file.type === "application/vnd.ms-excel";

      if (!isCsv) {
        setError("Please choose a CSV file (.csv).");
        setStatus("error");
        setHelperMessage(null);
        setSelectedFile(null);
        setParseResult(null);
        setImportSummary(null);
        setIsImporting(false);
        return;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError("CSV file is too large. Please upload a file under 2 MB.");
        setStatus("error");
        setHelperMessage(null);
        setSelectedFile(null);
        setParseResult(null);
        setImportSummary(null);
        setIsImporting(false);
        return;
      }

      setSelectedFile(file);
      setError(null);
      setParseResult(null);
      setImportSummary(null);
      setIsImporting(false);
      setHelperMessage("File validated. Continue to prepare the import.");
      setStatus("ready");
    },
    [resetState]
  );

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] ?? null;
      handleFileSelected(file);
    },
    [handleFileSelected]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLLabelElement>) => {
      event.preventDefault();
      event.stopPropagation();

      const file = event.dataTransfer.files?.[0] ?? null;
      handleFileSelected(file);
    },
    [handleFileSelected]
  );

  const handleDragOver = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedFile || status !== "ready") {
      return;
    }

    setStatus("processing");
    setError(null);
    setImportSummary(null);
    setHelperMessage("Preparing file for parsing…");

    try {
      const result = await parseTransactionCsv(selectedFile, {
        sourceName: selectedFile.name,
      });

      if (result.transactions.length === 0) {
        throw new Error(
          result.errors.length
            ? "No valid transactions found. Please review the errors below."
            : "No transactions found in the uploaded CSV."
        );
      }

      setParseResult(result);
      setStatus("success");
      setHelperMessage(
        "File parsed successfully. Review the summary below and import when ready."
      );
    } catch (importError) {
      const message =
        importError instanceof Error
          ? importError.message
          : "Something went wrong while preparing the file.";
      setError(message);
      setStatus("error");
      setHelperMessage(null);
    }
  }, [selectedFile, status]);

  const transactionsToImport = useMemo(() => {
    if (!parseResult) {
      return [];
    }

    return parseResult.transactions.filter(
      (transaction) => !transaction.duplicateOfRow
    );
  }, [parseResult]);

  const handleImportTransactions = useCallback(async () => {
    if (!parseResult || transactionsToImport.length === 0) {
      setError("No transactions available to import.");
      return;
    }

    setIsImporting(true);
    setError(null);
    setHelperMessage("Importing transactions…");

    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error: invokeError } = await supabase.functions.invoke<
        ImportSummary
      >("sync_transactions", {
        body: {
          transactions: transactionsToImport.map((transaction) => ({
            occurredOn: transaction.occurredOn,
            description: transaction.description,
            amount: transaction.amount,
            type: transaction.type,
            category: transaction.category,
            notes: transaction.notes,
            source: parseResult.metadata.source ?? "csv",
          })),
        },
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (!data) {
        throw new Error("Import did not return a response. Please try again.");
      }

      setImportSummary(data);
      setHelperMessage("Import completed successfully. Dashboard will refresh.");
      if (onImportComplete) {
        await onImportComplete();
      }
    } catch (invokeError) {
      const message =
        invokeError instanceof Error
          ? invokeError.message
          : "Failed to import transactions.";
      setError(message);
    } finally {
      setIsImporting(false);
    }
  }, [onImportComplete, parseResult, transactionsToImport]);

  const statusBadge = useMemo(() => {
    switch (status) {
      case "success":
        return (
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
            Ready
          </span>
        );
      case "processing":
        return (
          <span className="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
            Processing…
          </span>
        );
      case "ready":
        return (
          <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
            Validated
          </span>
        );
      case "error":
        return (
          <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">
            Needs attention
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
            Idle
          </span>
        );
    }
  }, [status]);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Import from CSV</h3>
          <p className="mt-1 text-sm text-slate-500">
            Upload a bank export to add multiple transactions at once.
          </p>
        </div>
        {statusBadge}
      </div>

      <label
        htmlFor="transaction-import-input"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="mt-4 flex flex-1 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-6 text-center transition hover:border-slate-400 hover:bg-slate-50"
      >
        <input
          ref={inputRef}
          id="transaction-import-input"
          type="file"
          accept=".csv,text/csv"
          onChange={handleInputChange}
          className="sr-only"
        />
        <span className="text-sm font-medium text-slate-700">
          Drop CSV file here or click to browse
        </span>
        <span className="mt-2 text-xs text-slate-500">
          Maximum size 2 MB. UTF-8 encoded files recommended.
        </span>
        {selectedFile ? (
          <span className="mt-3 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">
            {selectedFile.name}
          </span>
        ) : null}
      </label>

      {helperMessage ? (
        <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {helperMessage}
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!selectedFile || status === "processing" || status === "success"}
          className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-emerald-200"
        >
          Prepare import
        </button>
        <button
          type="button"
          onClick={resetState}
          disabled={status === "idle" && !selectedFile}
          className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Clear selection
        </button>
      </div>

      {parseResult ? (
        <div className="mt-6 space-y-4 rounded-xl bg-slate-50/80 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Parsed summary
              </p>
              <p className="text-xs text-slate-500">
                {parseResult.metadata.source
                  ? `Source: ${parseResult.metadata.source}`
                  : "Source file"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center text-xs font-medium text-slate-600 sm:grid-cols-4">
              <div>
                <p className="text-lg font-semibold text-slate-900">
                  {parseResult.metadata.processedRows}
                </p>
                <p>ready</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-900">
                  {parseResult.metadata.skippedRows}
                </p>
                <p>skipped</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-900">
                  {parseResult.metadata.duplicateCount}
                </p>
                <p>duplicates</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-900">
                  {transactionsToImport.length}
                </p>
                <p>to import</p>
              </div>
            </div>
          </div>

          {parseResult.errors.length > 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <p className="font-medium">
                {parseResult.errors.length} row
                {parseResult.errors.length > 1 ? "s" : ""} skipped due to
                validation issues.
              </p>
              <ul className="mt-2 space-y-1">
                {parseResult.errors.slice(0, 3).map((row) => (
                  <li key={row.rowNumber}>
                    Row {row.rowNumber}: {row.message}
                  </li>
                ))}
              </ul>
              {parseResult.errors.length > 3 ? (
                <p className="mt-1 italic">
                  Additional errors omitted. Review the CSV if needed.
                </p>
              ) : null}
            </div>
          ) : null}

          {parseResult.duplicates.length > 0 ? (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-800">
              <p className="font-medium">
                {parseResult.duplicates.length} duplicate entr
                {parseResult.duplicates.length > 1 ? "ies" : "y"} detected in
                the file. They will be skipped during import.
              </p>
            </div>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleImportTransactions}
              disabled={isImporting || transactionsToImport.length === 0}
              className="inline-flex w-full items-center justify-center rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:bg-indigo-200"
            >
              {isImporting
                ? "Importing…"
                : `Import ${transactionsToImport.length} transaction${
                    transactionsToImport.length === 1 ? "" : "s"
                  }`}
            </button>
            <button
              type="button"
              onClick={resetState}
              disabled={isImporting}
              className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Start over
            </button>
          </div>

          {importSummary ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              <p className="font-medium">
                {importSummary.insertedCount} transaction
                {importSummary.insertedCount === 1 ? "" : "s"} added. {" "}
                {importSummary.createdCategories} new categor
                {importSummary.createdCategories === 1 ? "y" : "ies"} created.
              </p>
              {importSummary.failedCount > 0 ? (
                <p className="mt-1">
                  {importSummary.failedCount} transaction
                  {importSummary.failedCount === 1 ? "" : "s"} failed to
                  import. Please review and try again.
                </p>
              ) : null}
              {importSummary.errors.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {importSummary.errors.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
