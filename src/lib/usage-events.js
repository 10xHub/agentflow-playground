import { logEvent } from "firebase/analytics"

import { getAnalyticsInstance } from "@/firebase"

// Events fired before the async support check resolves are held here so the
// very first page view is not lost. Capped so a disabled build cannot grow it
// without bound.
const MAX_QUEUED = 20

let instance = null
let ready = false
let initPromise = null
const queue = []

const emit = (name, parameters) => {
  if (!instance) return
  try {
    logEvent(instance, name, parameters)
  } catch {
    // Analytics is best-effort: ad blockers and offline clients throw here.
  }
}

const flush = () => {
  for (const [name, parameters] of queue) emit(name, parameters)
  queue.length = 0
}

const ensureReady = () => {
  initPromise ??= (async () => {
    try {
      instance = await getAnalyticsInstance()
    } catch {
      instance = null
    }
    ready = true
    flush()
  })()
  return initPromise
}

/**
 * Log a custom event. Fire-and-forget: never throws, never returns a promise.
 * @param {string} eventName Firebase event name (snake_case).
 * @param {object} [parameters] Counts, enums and booleans only — no user content.
 */
export const track = (eventName, parameters = {}) => {
  ensureReady()
  if (ready) {
    emit(eventName, parameters)
    return
  }
  if (queue.length < MAX_QUEUED) queue.push([eventName, parameters])
}

/**
 * Log a page view. React Router does not fire these on client navigation.
 * @param {string} path Route pathname.
 * @param {string} [title] Human-readable page title.
 */
export const trackPageView = (path, title) => {
  track("page_view", { page_path: path, page_title: title || path })
}
