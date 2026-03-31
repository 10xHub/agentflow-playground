/**
 * Enables API request mocking in non-production environments.
 *
 * Dynamically imports the mock service worker and starts it to intercept network requests.
 * Does nothing in production environments.
 * @async
 * @function enableMocking
 * @returns {Promise<void>|undefined} A promise that resolves when the mock worker is started, or undefined in production.
 */
export const enableMocking = async () => {
  if (import.meta.env.PROD) {
    return
  }

  const { worker } = await import("./services/mock")

  // `worker.start()` returns a Promise that resolves
  // once the Service Worker is up and ready to intercept requests.
  // eslint-disable-next-line consistent-return
  return worker.start()
}
