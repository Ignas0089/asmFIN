import { vi } from "vitest";

import {
  createErrorResult,
  createIdleResult,
  createLoadingResult,
  createSuccessResult,
  executeWithRetry,
} from "./queryHelpers";

afterEach(() => {
  vi.useRealTimers();
});

describe("queryHelpers", () => {
  it("creates consistent result wrappers", () => {
    const data = { value: 5 };

    expect(createIdleResult(data)).toEqual({
      status: "idle",
      data,
      error: null,
    });
    expect(createLoadingResult(data)).toEqual({
      status: "loading",
      data,
      error: null,
    });
    expect(createSuccessResult(data)).toEqual({
      status: "success",
      data,
      error: null,
    });

    const errorResult = createErrorResult(data, new Error("boom"));
    expect(errorResult).toEqual({
      status: "error",
      data,
      error: "boom",
    });
  });

  it("normalizes non-error inputs when creating error results", () => {
    const result = createErrorResult({}, { message: "failure" });

    expect(result.error).toContain("failure");
  });

  it("retries failed async operations with exponential backoff", async () => {
    vi.useFakeTimers();

    const operation = vi
      .fn<[], Promise<string>>()
      .mockRejectedValueOnce(new Error("first"))
      .mockRejectedValueOnce("second")
      .mockResolvedValue("success");
    const onRetry = vi.fn();

    const promise = executeWithRetry(operation, {
      retries: 2,
      retryDelayMs: 50,
      onRetry,
    });

    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBe("success");

    expect(operation).toHaveBeenCalledTimes(3);
    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenNthCalledWith(1, 1, expect.any(Error));
    expect(onRetry).toHaveBeenNthCalledWith(2, 2, expect.any(Error));
  });

  it("throws a normalized error after exceeding retries", async () => {
    const operation = vi.fn<[], Promise<string>>().mockRejectedValue("kaboom");

    await expect(
      executeWithRetry(operation, { retries: 1, retryDelayMs: 0 }),
    ).rejects.toThrowError("kaboom");
    expect(operation).toHaveBeenCalledTimes(2);
  });
});
