export type DataStatus = "idle" | "loading" | "success" | "error";

export interface DataResult<T> {
  status: DataStatus;
  data: T;
  error: string | null;
}

export interface RetryOptions {
  retries?: number;
  retryDelayMs?: number;
  onRetry?: (attempt: number, error: unknown) => void;
}

function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === "string") {
    return new Error(error);
  }

  try {
    return new Error(JSON.stringify(error));
  } catch (stringifyError) {
    return new Error(`Unknown error: ${String(stringifyError)}`);
  }
}

export function createIdleResult<T>(data: T): DataResult<T> {
  return {
    status: "idle",
    data,
    error: null,
  };
}

export function createLoadingResult<T>(data: T): DataResult<T> {
  return {
    status: "loading",
    data,
    error: null,
  };
}

export function createSuccessResult<T>(data: T): DataResult<T> {
  return {
    status: "success",
    data,
    error: null,
  };
}

export function createErrorResult<T>(data: T, error: unknown): DataResult<T> {
  const normalized = normalizeError(error);

  return {
    status: "error",
    data,
    error: normalized.message,
  };
}

export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { retries = 2, retryDelayMs = 250, onRetry } = options;

  let attempt = 0;
  let lastError: unknown;

  while (attempt <= retries) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === retries) {
        break;
      }

      onRetry?.(attempt + 1, error);

      if (retryDelayMs > 0) {
        await new Promise((resolve) =>
          setTimeout(resolve, retryDelayMs * Math.pow(2, attempt))
        );
      }
    }

    attempt += 1;
  }

  throw normalizeError(lastError);
}
