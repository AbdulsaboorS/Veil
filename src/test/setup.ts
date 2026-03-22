import '@testing-library/jest-dom';

// Global test setup for Vitest + jsdom
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
