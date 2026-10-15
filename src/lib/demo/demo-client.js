// Answers the TenxGraphClient methods the playground uses from a recorded fixture
// (demo/record.mjs). Each instance works on its own deep copy, so "delete" and
// "edit" in the demo change nothing outside this tab.

import { searchLocally } from "./local-search"

const ok = (data) => ({ data, metadata: { demo: true } })

const notFound = (what) =>
  Object.assign(new Error(`${what} is not part of this recorded demo`), {
    status: 404,
  })

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Writes the demo accepts without changing the recording.
const accepted = async () => ok({ success: true })
const ignored = () => {}
const filesUnavailable = async () => {
  throw notFound("Files")
}
const invokeUnavailable = async () => {
  throw new Error("The recorded demo replays streamed runs only.")
}
const wsUnavailable = () => {
  throw new Error("WebSocket streaming is coming soon.")
}
const liveUnavailable = () => {
  throw new Error(
    "Live voice needs a live server, so it is not part of the recorded demo."
  )
}

export class DemoClient {
  // Long pauses in a recording are shortened so a replay never looks stuck.
  static MAX_GAP_MS = 1500

  constructor(fixture, { sleep = defaultSleep, speed = 1 } = {}) {
    this.f = structuredClone(fixture)
    this.sleep = sleep
    this.speed = speed
    this.played = new Set()
    this.queued = null
  }

  recorded(table, id, what) {
    const value = this.f[table]?.[id]
    if (value === undefined) return Promise.reject(notFound(what))
    return Promise.resolve(structuredClone(value))
  }

  ping = async () => structuredClone(this.f.ping)
  graph = async () => structuredClone(this.f.graph)
  graphTools = async () => structuredClone(this.f.graphTools)
  graphStateSchema = async () => structuredClone(this.f.graphStateSchema)
  threads = async () => structuredClone(this.f.threads)
  threadState = (id) => this.recorded("threadState", id, `Thread ${id}`)
  threadMessages = (id) => this.recorded("threadMessages", id, `Thread ${id}`)

  observability = async (threadId, runId) => {
    const trace = this.f.observability[threadId]
    if (!trace) throw notFound(`Trace for ${threadId}`)
    const response = runId ? trace.runs[runId] : trace.latest
    if (!response) throw notFound(`Run ${runId}`)
    return structuredClone(response)
  }

  deleteThread = async (id) => {
    const list = this.f.threads.data
    list.threads = list.threads.filter((t) => t.thread_id !== id)
    delete this.f.threadState[id]
    delete this.f.threadMessages[id]
    return ok({ success: true })
  }

  deleteMessage = accepted
  updateThreadState = accepted
  clearThreadState = accepted
  stopGraph = accepted
  fixGraph = accepted
  registerToolHandler = ignored
  getFileAccessUrl = filesUnavailable
  realtime = liveUnavailable
  invoke = invokeUnavailable
  wsStream = wsUnavailable

  /**
   * Replays the queued run's recorded chunks with their recorded spacing.
   * @yields {object} One recorded stream chunk.
   */
  async *stream() {
    const run = this.f.runs.find((r) => r.id === this.queued)
    this.queued = null
    if (!run) {
      throw new Error(
        "This is a recorded demo. Pick one of the suggested prompts, or run 10xGraph on your own agent."
      )
    }
    // Marked before the first chunk, so a run the visitor stops still unlocks the next.
    this.markPlayed(run.id)
    let previous = 0
    for (const { t, chunk } of run.chunks) {
      const gap = Math.min((t - previous) / this.speed, DemoClient.MAX_GAP_MS)
      previous = t
      if (gap > 0) await this.sleep(gap)
      yield structuredClone(chunk)
    }
  }

  listMemories = async () => structuredClone(this.f.memories.list)

  searchMemory = async ({ query }) => {
    const recorded = this.f.memories.search[(query || "").trim().toLowerCase()]
    if (recorded) return structuredClone(recorded)
    return ok({
      results: searchLocally(this.f.memories.list.data.memories, query),
      keyword: true,
    })
  }

  deleteMemory = async (id) => {
    const list = this.f.memories.list.data
    list.memories = list.memories.filter((m) => m.id !== id)
    return ok({ success: true, data: id })
  }

  /** Memory searches the recording holds, offered when a query falls back to keywords. */
  recordedQueries = () => Object.keys(this.f.memories.search)

  evalRuns = async () => structuredClone(this.f.evals.runs)

  evalRun = async (id) => {
    const detail = this.f.evals.detail[id]
    if (detail === undefined) throw notFound(`Eval run ${id}`)
    return structuredClone(detail)
  }

  availableRuns = () =>
    this.f.runs.filter(
      (r) =>
        !this.played.has(r.id) && (r.after === null || this.played.has(r.after))
    )

  markPlayed = (id) => {
    this.played.add(id)
  }

  queueRun = (id) => {
    this.queued = id
  }
}

let instance = null

/** One DemoClient per tab, so local edits persist while navigating between screens. */
export const getDemoClient = (scenario, fixture) => {
  if (!instance || instance.scenario !== scenario) {
    instance = new DemoClient(fixture)
    instance.scenario = scenario
  }
  return instance
}

/** Forget played runs and local edits, so the next demo starts from the recording. */
export const resetDemoClient = () => {
  instance = null
}
