// Demo mode serves recorded runs from bundled fixtures instead of a live backend.
// The flag lives in sessionStorage so it ends with the tab and never touches the
// visitor's saved connections, settings or thread cache.

const KEY = "10xgraph.demo"

export const SCENARIOS = ["support"]
export const DEFAULT_SCENARIO = "support"

// Used when sessionStorage is unavailable (private mode, blocked storage).
let fallback = null

export const resolveScenario = (id) =>
  SCENARIOS.includes(id) ? id : DEFAULT_SCENARIO

export const enterDemo = (id) => {
  const scenario = resolveScenario(id)
  fallback = scenario
  try {
    sessionStorage.setItem(KEY, scenario)
  } catch {
    /* the in-memory fallback keeps this page load in demo mode */
  }
  return scenario
}

export const exitDemo = () => {
  fallback = null
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* nothing stored */
  }
}

export const activeScenario = () => {
  try {
    return sessionStorage.getItem(KEY) ?? fallback
  } catch {
    return fallback
  }
}

export const isDemoActive = () => activeScenario() !== null
