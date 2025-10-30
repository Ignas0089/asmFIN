import "@testing-library/jest-dom/vitest";

class ResizeObserver {
  observe() {
    // noop
  }

  unobserve() {
    // noop
  }

  disconnect() {
    // noop
  }
}

if (typeof globalThis.ResizeObserver === "undefined") {
  // Vitest runs in jsdom, which does not provide ResizeObserver by default.
  globalThis.ResizeObserver = ResizeObserver as unknown as typeof ResizeObserver;
}
