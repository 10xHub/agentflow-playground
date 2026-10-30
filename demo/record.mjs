// Records the playground demo from a live 10xGraph API.
//
//   node demo/record.mjs [baseUrl]        (default http://localhost:8010)
//
// Plays every run in demo/scenarios/support.json through the real client, keeps each
// stream chunk with its arrival time, then reads back everything the playground's screens
// request (threads, state, messages, traces, memory, evals, graph, tools) using the same
// calls the playground makes. Writes src/demo/fixtures/support.json. Never edit that file
// by hand: change the agent or the scenario and record again.

import { randomUUID } from "node:crypto"
import { readFileSync, writeFileSync } from "node:fs"

import { Message, TenxGraphClient } from "10xgraph-client"

const baseUrl = (process.argv[2] || "http://localhost:8010").replace(/\/$/, "")
const scenario = JSON.parse(readFileSync("demo/scenarios/support.json", "utf8"))
const clientVersion = JSON.parse(
  readFileSync("node_modules/10xgraph-client/package.json", "utf8")
).version
const client = new TenxGraphClient({ baseUrl, timeout: 120000 })

// Plain JSON only: the fixture must look exactly like what crossed the wire.
const plain = (value) => JSON.parse(JSON.stringify(value))

const fetchData = async (path) => {
  const res = await fetch(`${baseUrl}${path}`)
  if (!res.ok) throw new Error(`${path}: ${res.status}`)
  const json = await res.json()
  return json?.data ?? json
}

const recordRun = async (run) => {
  const started = Date.now()
  const chunks = []
  // An explicit id: without one the client sends "0", which a Postgres checkpointer
  // refuses on the second thread.
  const messages = [Message.text_message(run.prompt, "user", randomUUID())]
  for await (const chunk of client.stream(messages, {
    config: { thread_id: run.threadId },
  })) {
    chunks.push({ t: Date.now() - started, chunk: plain(chunk) })
  }
  const errors = chunks.filter(({ chunk }) => chunk.event === "error")
  if (errors.length) {
    throw new Error(
      `run ${run.id} streamed an error: ${JSON.stringify(errors[0])}`
    )
  }
  console.log(
    `  ${run.id}: ${chunks.length} chunks in ${Date.now() - started} ms`
  )
  return { ...run, ended: "complete", chunks }
}

// user_memory_tool schedules its write in the background, so wait until the memory is
// listable before a later run searches for it.
const waitForMemories = async (memoryConfig) => {
  const started = Date.now()
  while (Date.now() - started < 60000) {
    const list = await client.listMemories({ ...memoryConfig, limit: 100 })
    if (list?.data?.memories?.length) {
      console.log(`  memory write visible after ${Date.now() - started} ms`)
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error("memory write never became visible")
}

const recordTrace = async (threadId) => {
  const latest = plain(await client.observability(threadId))
  const runs = {}
  for (const runId of latest?.data?.run_ids ?? []) {
    runs[runId] = plain(await client.observability(threadId, runId))
  }
  return { latest, runs }
}

const main = async () => {
  console.log(`Recording from ${baseUrl}`)
  await client.ping()

  const memoryConfig = { config: { collection: "agentflow_memories" } }
  const runs = []
  for (const run of scenario.runs) {
    runs.push(await recordRun(run))
    if (run.writesMemory) await waitForMemories(memoryConfig)
  }

  const threadIds = [...new Set(runs.map((r) => r.threadId))]
  const threadState = {}
  const threadMessages = {}
  const observability = {}
  for (const id of threadIds) {
    threadState[id] = plain(await client.threadState(id))
    threadMessages[id] = plain(await client.threadMessages(id))
    observability[id] = await recordTrace(id)
  }

  const search = {}
  for (const query of scenario.memoryQueries) {
    search[query.trim().toLowerCase()] = plain(
      await client.searchMemory({ query, ...memoryConfig, limit: 25 })
    )
  }

  const evalRuns = await fetchData("/v1/evals/runs")
  const evalDetail = {}
  for (const run of evalRuns.runs ?? []) {
    evalDetail[run.id] = await fetchData(
      `/v1/evals/runs/${encodeURIComponent(run.id)}`
    )
  }

  const fixture = {
    id: scenario.id,
    title: scenario.title,
    recordedAt: new Date().toISOString(),
    versions: { "10xgraph-client": clientVersion, model: scenario.model },
    ping: plain(await client.ping()),
    graph: plain(await client.graph()),
    graphTools: plain(await client.graphTools()),
    graphStateSchema: plain(await client.graphStateSchema()),
    threads: plain(await client.threads()),
    threadState,
    threadMessages,
    observability,
    memories: {
      list: plain(await client.listMemories({ ...memoryConfig, limit: 100 })),
      search,
    },
    evals: { runs: evalRuns, detail: evalDetail },
    runs,
  }

  writeFileSync(
    "src/demo/fixtures/support.json",
    `${JSON.stringify(fixture, null, 2)}\n`
  )
  console.log("Wrote src/demo/fixtures/support.json")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
