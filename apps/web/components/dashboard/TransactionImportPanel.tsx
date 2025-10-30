"use client";

import { useCallback, useMemo, useRef, useState } from "react";

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

export type ImportStatus =
  | "idle"
  | "ready"
  | "processing"
  | "success"
  | "error";

export interface TransactionImportPanelProps {
  onPrepareImport?: (file: File) => Promise<void>;
}

export function TransactionImportPanel({
  onPrepareImport,
}: TransactionImportPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [helperMessage, setHelperMessage] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setSelectedFile(null);
    setStatus("idle");
    setError(null);
    setHelperMessage(null);
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
        return;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError("CSV file is too large. Please upload a file under 2 MB.");
        setStatus("error");
        setHelperMessage(null);
        setSelectedFile(null);
        return;
      }

      setSelectedFile(file);
      setError(null);
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
    setHelperMessage("Preparing file for parsing…");

    try {
      if (onPrepareImport) {
        await onPrepareImport(selectedFile);
      }

      setStatus("success");
      setHelperMessage("File ready! Continue with parsing to review transactions.");
    } catch (importError) {
      const message =
        importError instanceof Error
          ? importError.message
          : "Something went wrong while preparing the file.";
      setError(message);
      setStatus("error");
      setHelperMessage(null);
    }
  }, [onPrepareImport, selectedFile, status]);

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
    </div>
  );
}
