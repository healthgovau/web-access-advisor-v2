Vitest test setup
=================

This project uses Vitest with a centralized test setup loaded from `tests/setup/test-setup.ts`.

Key points:
- Global test setup is configured in `vitest.config.ts` via `test.setupFiles` and runs before your tests.
- `tests/setup/test-setup.ts` currently polyfills `Element.prototype.scrollIntoView` and loads `@testing-library/jest-dom` matchers.
- Run tests locally with:

  ```bash
  npm run test
  npm run test:run   # run in CI-friendly mode
  ```

CI note
-------
Ensure your CI environment installs devDependencies (includes `jsdom` and `vitest`) and runs the `vitest` command above. If your CI config uses a different working directory, update `vitest.config.ts` accordingly.
