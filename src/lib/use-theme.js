import { useCallback, useSyncExternalStore } from "react"

// Theme choice is persisted here; the resolved light/dark is written to
// `data-theme` on <html>, and tokens.css swaps the palette off that attribute.
// An inline bootstrap in index.html applies the saved theme before first paint
// (no flash); this module keeps every mounted useTheme() in sync afterwards.
export const THEME_STORAGE_KEY = "agentflow.theme"
const MODES = ["light", "dark", "system"]
const DEFAULT_MODE = "dark"
const DARK_QUERY = "(prefers-color-scheme: dark)"

const readMode = () => {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY)
    return MODES.includes(v) ? v : DEFAULT_MODE
  } catch {
    return DEFAULT_MODE
  }
}

const systemPrefersDark = () =>
  typeof window !== "undefined" && window.matchMedia?.(DARK_QUERY).matches

export const resolveTheme = (mode) =>
  mode === "system" ? (systemPrefersDark() ? "dark" : "light") : mode

const applyTheme = (mode) => {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", resolveTheme(mode))
  }
}

// Simple external store so a theme change in one place (e.g. Settings) updates
// every other consumer (e.g. the top-bar toggle icon) without prop drilling.
const listeners = new Set()
const notify = () => listeners.forEach((l) => l())

// Follow the OS while on "system", and mirror changes from other tabs.
if (typeof window !== "undefined") {
  window.matchMedia?.(DARK_QUERY).addEventListener?.("change", () => {
    if (readMode() === "system") {
      applyTheme("system")
      notify()
    }
  })
  window.addEventListener("storage", (e) => {
    if (e.key === THEME_STORAGE_KEY) {
      applyTheme(readMode())
      notify()
    }
  })
}

export const setThemeMode = (mode) => {
  const next = MODES.includes(mode) ? mode : DEFAULT_MODE
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next)
  } catch {
    /* ignore write failures (private mode) — still apply for this session */
  }
  applyTheme(next)
  notify()
}

const subscribe = (cb) => {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

/**
 * Theme controls. `theme` is the resolved "light"|"dark" (drives icons/labels),
 * `mode` is the stored choice "light"|"dark"|"system" (drives the selector).
 */
export function useTheme() {
  const mode = useSyncExternalStore(subscribe, readMode, () => DEFAULT_MODE)
  const setMode = useCallback((m) => setThemeMode(m), [])
  // Toggle commits an explicit light/dark (so the top-bar toggle also persists).
  const toggle = useCallback(
    () => setThemeMode(resolveTheme(readMode()) === "light" ? "dark" : "light"),
    []
  )
  return { theme: resolveTheme(mode), mode, setMode, toggle }
}
