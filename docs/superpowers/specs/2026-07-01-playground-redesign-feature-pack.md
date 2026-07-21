# Agentflow Playground — Redesign & Feature Pack

Date: 2026-07-01
Status: Design draft (feature spec). Next step is an HTML mockup, then a React build.
Scope: The playground UI only. Grounded in the existing `agentflow-api` (FastAPI)
and `@10xscale/agentflow-client` (TS SDK) surfaces. The current React app is treated
as prior art, not a constraint — this is a clean redesign.

---

## 1. What the playground is (positioning)

The playground is the **developer & debugging console for an Agentflow deployment**.
It is not a demo chat app. It is the tool you keep open in two situations:

1. **Build time** — while developing an agent locally (`agentflow api` on `:8000`),
   you drive it, watch every event, inspect state, edit checkpoints, test tools and
   memory, and iterate on prompts/config.
2. **Deploy/production time** — you point the same tool at a deployed base URL, paste
   a valid auth token, and debug *live*: what threads exist for this token, what a run
   actually did, where it stalled, what it remembered, what it cost.

Core principle: **the playground is a thin, honest client over the API.** It shows what
the deployment exposes and nothing it makes up. Every panel maps to real endpoints or
real client-SDK methods. If a capability is not present on the connected backend
(no checkpointer, no store, not a live agent), the UI detects that and degrades
gracefully instead of showing fake data.

Design values:
- **Multi-environment.** Save several backends (local / staging / prod), switch instantly.
- **Token-scoped truth.** Everything reflects what *your token* can see and do (RBAC).
- **Read-mostly, but with power tools.** Safe to open against production; destructive
  actions (delete thread, clear state, forget memory) are explicit and guarded.
- **Transport-transparent.** You can see and choose invoke vs SSE stream vs WebSocket,
  and inspect raw frames.

### Two classes of surface

The areas split into two distinct modes, and the redesign keeps them physically separate:

- **Interactive / "driver" surfaces** (Chat, Live). *You* are the end user — you send
  messages and get responses. Conversation-centric layout. Chat shows your current thread
  and can optionally jump back to your prior threads, but its job is to **act**.
- **Inspector / "admin" surfaces** (Thread Inspector, Memory Inspector, and the
  Observability/Evals/Graph views). You are the **operator**, not the end user. You
  connect with an admin token, list everything that token is allowed to read *across all
  users*, drill in to find a fault, and repair it — then verify. List-first, table-driven,
  opened *because something is wrong*.

These are not the same UI with a filter toggle. The mental model, the layout, and the
danger level differ, so Thread Inspector and Memory Inspector are their own full pages,
separate from Chat. Example flow the Thread Inspector must serve: *"I deployed a solution,
I hold an admin account, a user reports a broken conversation — I open the inspector, find
their thread in the list, read the incoming user messages, see where it went wrong, fix
the thread (or delete the offending messages) to repair it manually, and confirm it's
healthy."*

---

## 2. Personas & primary jobs

| Persona | Job the playground does for them |
|---|---|
| Agent developer (local) | Drive the agent, watch the graph execute node-by-node, inspect/edit state, test tools + memory, compare prompt/model variants, catch regressions. |
| On-call / debugger (prod) | Connect with a token, find the failing thread, replay the run's trace, read the checkpoint, see token/cost, export a repro. |
| Reviewer / QA | Browse eval report history, see pass/fail and regressions, drill into failing cases. |
| Demoer | Show a live voice agent, streaming, tool use — an impressive, real end-to-end loop. |

---

## 3. Information architecture

A left rail with the following top-level areas. The **Connection bar** is global (top),
always showing the active backend, token status, and detected capabilities.

```
┌ Connection bar: [ backend ▾ ] [ token ● verified ] [ caps: stream · ws · live · store · checkpointer ]
│
│  ── interactive / driver ──
├─ 1. Chat            (interactive playground: invoke / stream / websocket + thread switcher)
├─ 2. Live            (realtime audio agent)
│  ── inspector / admin ──
├─ 3. Thread Inspector (standalone: list ALL readable threads → drill in → repair → verify)
├─ 4. Observability   (trace timeline, event stream, token/cost, deep-links)
├─ 5. Evals           (eval report browser + case drilldown + regressions)
├─ 6. Memory Inspector (standalone: browse/search/audit/repair the agent memory store)
├─ 7. Graph           (graph + state-schema inspector, live current-node)
├─ 8. Tools & MCP     (registered tools, client-side tool lab, direct invoke)
├─ 9. Files           (multimodal upload manager + config)
└─ ⚙ Settings         (connections, auth, theme, defaults, request inspector)
```

The **Request/Response Inspector** (a "network tab" for the agent API) is a global,
dockable panel available from any area — every HTTP call and WS frame the playground
makes is logged there for copy/export.

---

## 4. Feature pack

Each feature notes **what it does**, **how it's achieved** (endpoint / SDK method), and
**why it helps**. Endpoints are on the `agentflow-api` server; methods are on
`@10xscale/agentflow-client`'s `AgentFlowClient`.

### 4.0 Connection & Auth (foundational)

- **Connection profiles.** Save N backends, each with base URL + auth. Auth modes the
  client already supports: bearer, basic, header (`AgentFlowAuth` union). Switch active
  profile from the top bar.
- **Verify & capability probe.** On connect: `ping()` for liveness, `graph()` +
  `graphStateSchema()` for the agent's shape, `getMultimodalConfig()` for file limits.
  From these, derive a **capability set** (streaming, websocket, live/audio agent,
  checkpointer present, store present) and light up / grey out areas accordingly.
- **Token & permission inspector.** Decode the JWT (client-side, display-only) to show
  claims and expiry; surface RBAC permissions the token carries so the developer knows
  *why* something is or isn't visible. (Authorization is enforced server-side via
  `RequirePermission`; the UI only reflects it.)
- **Why:** this is what makes the tool usable against production — connect, prove who you
  are, see exactly what you're allowed to touch.

### 4.1 Chat — the interactive playground

The primary surface. One conversation UI, three selectable transports so you can compare
behavior and latency on the *same* agent:

- **Invoke (sync).** `invoke(messages, options)` → full `InvokeResult`. Good for seeing
  the final state, `iterations`, `recursion_limit_reached`, and complete `all_messages`.
- **Stream (SSE).** `stream(messages, options)` → async generator of `StreamChunk`
  (`event: message | updates | state | error`) over `POST /v1/graph/stream`.
  Token/message-by-message rendering.
- **WebSocket (turn-based).** `wsStream(messages, options)` over `WS /v1/graph/ws` —
  same chunk API, persistent connection, no HTTP reconnect per tool-call iteration.
  A per-run toggle lets you A/B stream vs ws latency on tool-heavy agents.

Controls exposed (all already supported by the API/options):
- `response_granularity`: `full | partial | low`.
- `recursion_limit`.
- `initial_state` injection and per-run `config` overrides (e.g. `thread_id`).
- Thread selection / new-thread creation.

Message rendering — full fidelity for every content block type the SDK defines:
text, reasoning (thinking), tool_call, tool_result, image, audio (inline player),
video, document, data, annotation, error. Reasoning and tool calls are collapsible.

Run controls & recovery:
- **Stop** an in-flight run: `stopGraph(threadId)` / `POST /v1/graph/stop`.
- **Fix wedged thread:** `fixGraph(threadId)` / `POST /v1/graph/fix` — clears dangling
  empty tool-call messages that stall a thread. One-click recovery.
- **Per-message run readout:** tokens (prompt / completion / reasoning / cache_read /
  cache_create / image / audio), duration, iterations, tool-call count, node path.

Thread switcher (convenience, not the admin tool): the current thread is shown by
default; a lightweight switcher lets you jump back into your prior threads
(`threads()` scoped to your token) and continue them. This is deliberately minimal —
deep thread debugging lives in the Thread Inspector (4.3), not here. This switcher can
even be cut for a first pass without hurting the core loop.

Multimodal input: attach images / audio / video / documents via `uploadFile()` →
`file_id` referenced in the outgoing message; limits driven by `getMultimodalConfig()`.

Client-side tools: register browser-owned tools with `registerTool()` + `setup()`; the
invoke/stream/ws loops already detect `remote_tool_call` blocks, run the handler, and
resume. Surfaced so agents that depend on client-executed tools (geolocation, clipboard,
a JS sandbox) can be tested — see 4.8.

- **Why:** this is the daily driver. Transport toggle + granularity + state injection +
  recovery in one place is exactly the build-time inner loop.

### 4.2 Live — realtime audio agent

A dedicated mode (not retrofitted into the text box) for agents rooted at a live/audio
agent, over `WS /v1/graph/live` via the SDK's `realtime(init, options)` →
`RealtimeSession`.

- **Audio I/O.** Mic capture as PCM16 @ 16 kHz in; speaker playback of PCM16 @ 24 kHz out.
- **Session config.** model (e.g. a Gemini/OpenAI live model), voice, modalities, VAD
  config, optional `thread_id`, system prompt.
- **Live transcripts.** input_transcript / output_transcript streamed side-by-side.
- **Turn & interruption UI.** turn_complete, interrupted, go_away, agent_changed (handoff)
  events visualized on a session timeline.
- **Tool calls during voice.** tool_call / tool_result events shown inline.
- **Connection health.** open / close / reconnecting / reconnected with backoff status.
- **Meters.** input VU meter + output waveform so you can see the agent is hearing/speaking.
- Only enabled when the capability probe says the agent is a live agent (close code 1008
  otherwise).
- **Why:** the highest-wattage demo and the only way to exercise the realtime path.

### 4.3 Thread Inspector — standalone admin/repair console

A dedicated, full-page surface — **not** part of the Chat panel. This is what an operator
opens against a deployment with an admin token to find and repair a broken conversation.
List-first and table-driven.

Layout: a master **thread list** (left/top) → **thread detail** (main). The intended
workflow, end to end:

1. **List all readable threads.** `threads({search, offset, limit})` / `GET /v1/threads`
   — every thread the (admin) token is permitted to read, across users. Search + paginate.
   Show id, last-activity, message count, status, and any error flag so a broken thread is
   easy to spot.
2. **Open a thread.** `threadDetails(id)` metadata + `threadMessages(id, {search, offset,
   limit})` — the full, searchable message history. Read the incoming user messages and
   the agent's responses to locate where it went wrong.
3. **Inspect state.** `threadState(id)` / `GET /v1/threads/{id}/state` — the checkpoint:
   context messages, `context_summary`, `execution_meta` (current_node, step, interrupt
   info, is_running / interrupted / stopped flags), config.
4. **Repair.** The operator's toolkit, each guarded with a confirm:
   - **Fix thread** — `fixGraph(threadId)` / `POST /v1/graph/fix` clears dangling/empty
     tool-call messages that wedge a thread.
   - **Delete offending messages** — `deleteMessage(threadId, messageId)` to surgically
     remove a bad turn.
   - **Edit / reset state** — `updateThreadState(id, config, state)` to inject a fix;
     `clearThreadState(id)` to reset; `addThreadMessages` to patch history.
   - **Stop** a still-running thread — `stopGraph(threadId)`.
   - **Delete thread** — `deleteThread(threadId)` as a last resort.
5. **Verify.** Re-read state/messages (or re-run from the checkpoint) to confirm the thread
   is healthy again.
- **Why:** this is *the* production-debugging workflow. In prod you start from "which
  thread broke" and need to both diagnose and repair without a shell — backed entirely by
  existing checkpointer/graph endpoints.

### 4.4 Observability — trace, events, cost

The backend has **no trace HTTP API** (OTEL/Sentry export to external collectors; the
Logfire/LangSmith work is deferred and Python-side). So the playground builds
observability from **the event stream it already receives** plus **deep-links** to
external tools. Three complementary views:

- **Trace timeline (per run).** The server's `OtelPublisher` reconstructs a
  graph → node → LLM → tool span tree with GenAI-semantic attributes. The same
  structure is derivable client-side from `StreamChunk` `updates`/`state` events
  (node enter/exit, tool start/finish, timings). Render it as a waterfall so you can
  see where time went and which node stalled. (`session.id` == `thread_id`.)
- **Live event stream.** Every `StreamChunk` (message / updates / state / error) with
  type filter, search, and JSON inspection — the honest, enhanced successor to today's
  events log. Also fed by the global Request/Response Inspector for raw frames.
- **Token & cost dashboard.** Aggregate the per-run usage (already normalized:
  prompt / completion / reasoning / cache_read / cache_create / image / audio) across a
  thread or session; break down by model, node, and tool; show run count, iterations,
  latency percentiles.
- **External deep-links.** When the deployment ships traces to Logfire / LangSmith /
  Jaeger, offer a "open trace" link keyed by `thread_id` / `session.id` rather than
  re-building a full APM in the browser. Endpoints are configured per connection profile.
- **Why:** you get real per-run observability with zero new backend, and a clean escape
  hatch to the heavyweight tools when they're wired up.

### 4.5 Evals — report browser & regressions

`agentflow eval` runs `*_eval.py` cases (standard eval sets *and* user-simulator
scenarios), applies a threshold, and writes **HTML + JSON reports to `eval_reports/`**.
Today those live on the server filesystem with no way to view them remotely.

Playground design:
- **Report browser.** List past eval runs (newest first) with pass rate, threshold,
  case count, timestamp, and pass/fail badge.
- **Run drilldown.** Per-case results: input, expected vs actual, score, pass/fail,
  latency, and cost per case. Simulator scenarios show the full simulated conversation.
- **Regression view.** Compare two runs (or a run vs its predecessor) to spot
  newly-failing cases and score drift over time.
- **Data source (minimal backend addition).** Because the reports are JSON on disk, this
  area needs one small read-only endpoint on `agentflow-api` to *list* and *fetch* the
  JSON reports (the HTML report is already self-contained for download). This is the only
  net-new backend surface the feature pack asks for; it is read-only and permission-gated
  like every other route. For local build-time use, the playground can alternatively read
  the JSON directly from a configured `eval_reports/` path.
- **(Later) trigger a run** from the UI would need an execution endpoint; deferred.
- **Why:** turns eval from a terminal-only artifact into a browsable quality history that
  a reviewer can open against any environment.

### 4.6 Memory Inspector — standalone admin/repair console

A dedicated, full-page surface — the memory counterpart to the Thread Inspector, and the
same admin mental model: connect with a token, browse/audit everything in the store you're
allowed to read, and repair it. Replaces the current hardcoded/fake memory panel with a
real browser over the store API. List-first (master list → detail), separate from Chat.

- **List & filter.** `listMemories({offset, limit})` with filter by type / category /
  user / thread — the "what does this deployment remember" audit view.
- **Search across strategies.** `searchMemory({strategy})` where `RetrievalStrategy` is
  SIMILARITY / TEMPORAL / RELEVANCE / HYBRID / GRAPH_TRAVERSAL; show returned `score`,
  `memory_type`, metadata, and (optionally) the vector. `DistanceMetric` selectable — this
  is how you diagnose *why* an agent retrieved (or failed to retrieve) something.
- **Detail + repair.** `getMemory` to inspect; `storeMemory` / `updateMemory` /
  `deleteMemory` to correct a bad memory; bulk `forgetMemories({filters})` to purge
  (guarded).
- **Only enabled** when the capability probe finds a store configured.
- **Why:** a developer building a memory-backed agent currently has zero visibility into
  what it remembered; an operator has no way to audit or fix a polluted store. This makes
  retrieval quality directly inspectable and repairable.

### 4.7 Graph — structure & live execution inspector

- **Graph view.** Render nodes/edges from `graph()` / `GET /v1/graph`.
- **State schema.** `graphStateSchema()` / `GET /v1/graph:StateSchema` — the shape the
  state editor (4.3) writes against.
- **Live current-node highlight.** During a run, highlight the executing node using the
  `updates`/`execution_meta.current_node` events, so you *watch* the agent traverse.
- **Tool/MCP annotations.** Show which tools/MCP servers hang off each node (feeds 4.8).
- **Why:** connects the abstract graph to what's actually happening in a run.

### 4.8 Tools & MCP — registry + client-side lab

- **Server tool/MCP registry.** List tools and MCP servers per node with their schemas
  (from the graph definition).
- **Client-side tool lab.** Define and `registerTool()` browser-owned tools, `setup()`
  them, then run a chat turn that triggers the `remote_tool_call` loop to watch the
  handler execute and its `tool_result` feed back. Ships with a few example tools
  (geolocation, clipboard, a JS sandbox).
- **Why:** the only way to exercise client-executed tools, and a clean way to read tool
  schemas while debugging tool-calling agents.

### 4.9 Files — multimodal manager

- **Upload & inspect.** `uploadFile()` → `file_id`; `getFileInfo()` for mime/size/
  extraction status; `getFileAccessUrl()` for a signed/fallback URL; `getFile()` to
  download.
- **Config-driven limits.** `getMultimodalConfig()` drives allowed types/sizes so the UI
  matches the server instead of hardcoding.
- **Why:** supports the multimodal chat/live flows and lets you verify extraction.

### 4.10 Cross-cutting: Request/Response Inspector

A global, dockable "network tab" for the agent API: every HTTP request and every WS frame
the playground sends/receives is logged with method, path, status, timing, and body.
One-click **copy as cURL** and **export run as JSON** for filing a repro. This is the
single most useful debugging affordance and costs nothing beyond instrumenting the client
wrapper.

---

## 5. Additional testing surfaces worth including

Beyond the four you named, these earn their place because the framework supports them and
they materially help *testing an agent*:

1. **Prompt/config diff harness.** Run the same input across model / prompt / config
   variants side-by-side; compare output, tokens, latency, iterations. Manual A/B for
   iterating on an agent. (Pure client orchestration over `invoke`/`stream` with
   different `config`/`initial_state`.)
2. **Human-in-the-loop (interrupt) console.** `execution_meta` carries interrupt info and
   `is_running / interrupted / stopped` flags. When a run interrupts (approval, tool
   confirmation), surface it, let the developer provide input, and resume from the
   checkpoint. Essential for testing HITL agents.
3. **Replay / re-run from checkpoint.** Load a thread's checkpoint and re-run from a
   chosen point after editing state — combines 4.3 + 4.7 for reproducing and fixing bad
   runs deterministically.
4. **Snapshot export for bug reports.** Bundle a thread's messages + state + event trace +
   run stats into a single JSON a developer can attach to an issue.

Items 1–4 are recommended; 2 and 3 lean on existing checkpoint/interrupt semantics and
are high value for real agent debugging.

---

## 6. Backend additions required (kept to a minimum)

The feature pack is deliberately buildable almost entirely against **existing** endpoints.
The only genuinely new backend surface:

- **Eval report read API** (4.5): read-only, permission-gated endpoints to list eval runs
  and fetch a run's JSON report from `eval_reports/`. Small, isolated, optional for
  local-only use (playground can read the directory directly at build time).

Everything else — chat/live/threads/state/memory/graph/files/observability — is served by
routes and SDK methods that already exist. Observability is derived client-side plus
external deep-links; no trace API is invented.

---

## 7. Client SDK version note

The current playground pins `@10xscale/agentflow-client@0.0.4`, which predates
`wsStream`, `realtime`, and parts of the memory/files surface. The redesign targets the
**current** client SDK. Confirm the exact published version at build time (do not pin from
memory) and upgrade before implementation.

---

## 8. Delivery approach

1. This document — the full feature pack (done).
2. **Static HTML mockups** of the key screens (Chat, Live, Threads, Observability, Evals,
   Memory) to settle layout and interaction before committing to components.
3. **React build** of the validated design against the current client SDK.

Phasing suggestion for the build (not binding):
- **P0 (core loop):** Connection/Auth + Chat (invoke/stream/ws) + Thread Inspector
  (list → detail → repair) + Request Inspector.
- **P1 (inspect):** Observability (timeline/events/cost) + Memory Inspector + Graph.
- **P2 (advanced):** Live audio + Evals + Tools/MCP lab.
- **P3 (power):** Diff harness + HITL console + replay + snapshot export.

---

## 9. Out of scope

- The current React implementation's internal architecture (Redux slices, etc.) — the
  build stage will choose its own state approach; this spec is UI/feature-level.
- Inventing a full APM/trace store in the browser — we derive per-run traces from events
  and deep-link to Logfire/LangSmith/Jaeger for the heavyweight view.
- Triggering eval or test runs from the UI (execution endpoints) — deferred.
- Any change to authn/authz semantics — the playground only reflects server-side RBAC.

---

## 10. Verify-at-implementation (do not guess)

- Current published version of `@10xscale/agentflow-client` and any renamed methods.
- Exact `StreamChunk` `updates`/`state` payload fields used to reconstruct the trace
  timeline and current-node highlight.
- The eval report JSON schema (`eval_reports/*.json`) before building the Evals viewer.
- Live-agent model IDs / voice options accepted by `WS /v1/graph/live`.
- Whether the target deployments actually export to Logfire/LangSmith/Jaeger before
  wiring deep-links.
