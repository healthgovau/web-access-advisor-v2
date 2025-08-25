// Global test setup for Vitest
// Mock DOM APIs that jsdom doesn't implement fully
Object.defineProperty(globalThis.Element.prototype, 'scrollIntoView', {
  configurable: true,
  value: () => {}
});

// Optionally expose any other globals or polyfills used across tests
export {};
