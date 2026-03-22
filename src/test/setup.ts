import '@testing-library/jest-dom';

// Global test setup for Vitest + jsdom

// @testing-library/dom's waitFor checks `typeof jest !== 'undefined'` to detect
// fake timers and call jest.advanceTimersByTime(). Expose vi as jest so waitFor
// correctly advances fake timers without hanging in async tests.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).jest = (globalThis as any).vi;
// Provides a real in-memory localStorage implementation so tests can read
// and write across calls within the same test, and clears it between tests.

const localStorageStore: Record<string, string> = {};

const localStorageMock = {
  getItem: (key: string) => localStorageStore[key] ?? null,
  setItem: (key: string, value: string) => { localStorageStore[key] = value; },
  removeItem: (key: string) => { delete localStorageStore[key]; },
  clear: () => { Object.keys(localStorageStore).forEach(k => delete localStorageStore[k]); },
  get length() { return Object.keys(localStorageStore).length; },
  key: (index: number) => Object.keys(localStorageStore)[index] ?? null,
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Clear localStorage before every test so state never leaks between tests.
beforeEach(() => {
  localStorageMock.clear();
});
