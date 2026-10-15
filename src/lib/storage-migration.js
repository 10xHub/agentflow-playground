// One-time move of localStorage keys from the Agentflow-era names to the 10xGraph
// names, so saved connections, settings, threads and theme survive the rename.
// Imported first in main.jsx: it must run before any module reads these keys.
// Remove in 2.0 together with the other Agentflow fallbacks.

export const RENAMED_KEYS = [
  ["pyagenity-settings", "10xgraph.settings"],
  ["agentflow.connections", "10xgraph.connections"],
  ["agentflow.threads", "10xgraph.threads"],
  ["agentflow.theme", "10xgraph.theme"],
  ["agentflow-client-tools", "10xgraph.client-tools"],
]

/**
 * Copy each old key to its new name when only the old one exists, then drop the old key.
 */
export const migrateStorageKeys = (storage = globalThis.localStorage) => {
  if (!storage) return
  for (const [oldKey, newKey] of RENAMED_KEYS) {
    try {
      const old = storage.getItem(oldKey)
      if (old === null) continue
      if (storage.getItem(newKey) === null) storage.setItem(newKey, old)
      storage.removeItem(oldKey)
    } catch {
      // Storage can throw in private mode or when blocked; the app runs without it.
    }
  }
}

migrateStorageKeys()
