import { createSlice } from "@reduxjs/toolkit"

import { addTokens, emptyTokens, normalizeUsage } from "@/lib/token-usage"
import ct from "@constants/"

// Cap stored run history so a long session does not grow Redux unbounded.
const MAX_RUNS = 100

const normalizeThreadId = (threadId) => {
  if (threadId === null || threadId === undefined) {
    return null
  }

  return String(threadId)
}

/**
 * Recompute a run's token totals from its per-message usage map.
 * Keyed by message id so a streamed snapshot + its deltas never double-count.
 */
const recomputeTokens = (run) => {
  run.tokens = Object.values(run.usageById).reduce(
    (accumulator, usage) => addTokens(accumulator, usage),
    emptyTokens()
  )
}

// Thread id may resolve from a temp id to the server id mid-run; move the
// run's latest-pointer to the resolved thread.
const applyResolvedThread = (state, run, runId, threadId) => {
  if (threadId === undefined) {
    return
  }

  const normalizedThreadId = normalizeThreadId(threadId)

  if (normalizedThreadId !== run.threadId) {
    if (state.latestByThread[run.threadId] === runId) {
      delete state.latestByThread[run.threadId]
    }
    run.threadId = normalizedThreadId
  }

  state.latestByThread[normalizedThreadId] = runId
}

// Invoke passes its client tool-loop count; stream falls back to the number of
// model passes that reported token usage.
const resolveIterations = (run, iterations) =>
  iterations || Object.keys(run.usageById).length || run.iterations || 1

const pruneRuns = (state) => {
  while (state.order.length > MAX_RUNS) {
    const removedId = state.order.pop()
    const removed = state.byId[removedId]
    delete state.byId[removedId]

    if (removed && state.latestByThread[removed.threadId] === removedId) {
      delete state.latestByThread[removed.threadId]
    }
  }
}

const initialState = {
  byId: {},
  order: [], // newest first
  latestByThread: {},
}

const runsSlice = createSlice({
  name: ct.store.RUNS_STORE,
  initialState,
  reducers: {
    startRun: (state, action) => {
      const { runId, threadId, mode, startedAt } = action.payload
      const normalizedThreadId = normalizeThreadId(threadId)

      state.byId[runId] = {
        id: runId,
        threadId: normalizedThreadId,
        mode: mode || "invoke",
        status: "running",
        startedAt: startedAt || null,
        finishedAt: null,
        durationMs: null,
        iterations: 0,
        toolCallCount: 0,
        finalMessageId: null,
        usageById: {},
        tokens: emptyTokens(),
      }

      state.order = state.order.filter((id) => id !== runId)
      state.order.unshift(runId)
      state.latestByThread[normalizedThreadId] = runId
      pruneRuns(state)
    },
    accumulateRunUsage: (state, action) => {
      const { runId, messageId, usages } = action.payload
      const run = state.byId[runId]

      if (!run) {
        return
      }

      const normalized = normalizeUsage(usages)
      if (!normalized) {
        return
      }

      const key = messageId ? String(messageId) : `${runId}:final`
      run.usageById[key] = normalized
      recomputeTokens(run)
    },
    bumpRunToolCount: (state, action) => {
      const { runId, count } = action.payload
      const run = state.byId[runId]

      if (!run) {
        return
      }

      run.toolCallCount += count || 1
    },
    setRunFinalMessage: (state, action) => {
      const { runId, finalMessageId } = action.payload
      const run = state.byId[runId]

      if (run) {
        run.finalMessageId = finalMessageId
      }
    },
    finishRun: (state, action) => {
      const { runId, threadId, status, finishedAt, iterations, toolCallCount } =
        action.payload
      const run = state.byId[runId]

      if (!run) {
        return
      }

      run.status = status || "done"
      run.finishedAt = finishedAt || null

      if (run.startedAt && finishedAt) {
        run.durationMs = Math.max(0, finishedAt - run.startedAt)
      }

      run.iterations = resolveIterations(run, iterations)

      if (toolCallCount != null) {
        run.toolCallCount = toolCallCount
      }

      applyResolvedThread(state, run, runId, threadId)
      recomputeTokens(run)
    },
    clearRuns: () => initialState,
  },
})

export const {
  startRun,
  accumulateRunUsage,
  bumpRunToolCount,
  setRunFinalMessage,
  finishRun,
  clearRuns,
} = runsSlice.actions

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

const selectRunsState = (state) => state[ct.store.RUNS_STORE]

export const selectLatestRun = (state, threadId) => {
  const runs = selectRunsState(state)
  if (!runs) {
    return null
  }

  const runId = runs.latestByThread[normalizeThreadId(threadId)]
  return runId ? runs.byId[runId] || null : null
}

export const selectRunHistory = (state, threadId) => {
  const runs = selectRunsState(state)
  if (!runs) {
    return []
  }

  const normalizedThreadId = normalizeThreadId(threadId)
  return runs.order
    .map((id) => runs.byId[id])
    .filter(
      (run) =>
        run && (!normalizedThreadId || run.threadId === normalizedThreadId)
    )
}

export const selectRunByFinalMessageId = (state, messageId) => {
  const runs = selectRunsState(state)
  if (!runs || !messageId) {
    return null
  }

  for (const id of runs.order) {
    const run = runs.byId[id]
    if (run && run.status !== "running" && run.finalMessageId === messageId) {
      return run
    }
  }

  return null
}

export default runsSlice.reducer
