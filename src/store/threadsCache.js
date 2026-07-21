// Client-side cache of threads the user has interacted with in this playground.
// Persisted to localStorage so switching threads and refreshing both work — the
// server (often an in-memory checkpointer) is not the source of truth here.

const KEY = "agentflow.threads"
const MAX_THREADS = 50

export const loadThreads = () => {
  if (typeof window === "undefined") {
    return { order: [], byId: {}, activeId: null }
  }
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && parsed.byId) return parsed
    }
  } catch {
    /* fall through to empty */
  }
  return { order: [], byId: {}, activeId: null }
}

export const saveThreads = ({ order, byId, activeId }) => {
  if (typeof window === "undefined") return
  try {
    // Cap the number of cached threads (drop oldest) so storage stays bounded.
    let trimmedOrder = order
    let trimmedById = byId
    if (order.length > MAX_THREADS) {
      trimmedOrder = order.slice(0, MAX_THREADS)
      trimmedById = {}
      trimmedOrder.forEach((id) => {
        trimmedById[id] = byId[id]
      })
    }
    localStorage.setItem(
      KEY,
      JSON.stringify({ order: trimmedOrder, byId: trimmedById, activeId })
    )
  } catch {
    /* storage full / disabled — non-fatal */
  }
}
