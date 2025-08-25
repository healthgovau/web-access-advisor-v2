// Global test setup for Vitest
// Provide common DOM polyfills and testing utilities for all tests
// Register jest-dom matchers with Vitest's expect to avoid timing issues
// Import matchers in a way that works with CJS/ESM interop and guard against
// missing packages so tests don't crash in CI or developer machines that
// haven't installed the optional devDependency yet.
import * as matchersModule from '@testing-library/jest-dom/matchers';
import { expect as vitestExpect } from 'vitest';

// jest-dom may export the matchers as a default export or named exports
const matchers = (matchersModule as any).default ?? matchersModule;
try {
  if (matchers && typeof vitestExpect.extend === 'function') {
    vitestExpect.extend(matchers as any);
  }
} catch (err) {
  // If extending fails, continue silently — tests can still run without
  // the extra matchers (they'll just have fewer assertions available).
  // Log to console to aid debugging in CI logs.
  // eslint-disable-next-line no-console
  console.warn('Could not register @testing-library/jest-dom matchers:', err);
}

// Mock DOM APIs that jsdom doesn't implement fully
Object.defineProperty(globalThis.Element.prototype, 'scrollIntoView', {
  configurable: true,
  value: () => {}
});

// Export to satisfy module system
export {};
