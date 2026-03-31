// src/setupTests.js

import "@testing-library/jest-dom/vitest"

// Optional: Suppress act() warnings or other noisy console errors in tests
const suppressedErrors = [/Warning.*not wrapped in act/, /DeprecationWarning/]
const originalError = console.error
console.error = (...arguments_) => {
  if (suppressedErrors.some((pattern) => pattern.test(arguments_[0]))) return
  originalError(...arguments_)
}
