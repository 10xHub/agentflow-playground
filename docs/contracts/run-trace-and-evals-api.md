# Run trace and eval report API contract (X4, X5, X7, X9, X12)

Package: `10xgraph-api` 1.0.0rc1. All changes are additive; existing field names are unchanged.
Both endpoints answer with the usual envelope `{ "data": <payload>, "metadata": {...} }`; the shapes
below are the `data` payload.

Status: implemented and verified against the running dev server OpenAPI (`/openapi.json` lists the
schemas `ObsSpanSchema`, `ObsRunSchema`, `ObservabilitySchema`, `EvalRunDetailSchema`, `EvalCaseViewSchema`,
`EvalRubricRowSchema`). Code: `tenxgraph_api/src/app/utils/run_trace.py`, `routers/evals/schemas.py`.

## GET /v1/observability/{thread_id}?run_id=<optional>

Auth: `graph:read` permission (unchanged). Returns the latest run unless `run_id` is given.
Data is process-local and in memory (development mode only), so it vanishes on server restart.

```jsonc
{
  "thread_id": "t1",
  "enabled": true,                 // NEW (X7). false = tracing store not bound (MODE=production)
  "reason": null,                  // NEW (X7). null | "disabled_in_production" | "store_unavailable" | "no_runs"
  "run_count": 1,
  "run_ids": ["r1"],
  "run": {                         // null when disabled or no runs
    "run_id": "r1",
    "thread_id": "t1",
    "status": "done",              // running | done | error | stopped  (unchanged)
    "started_at": 1761650000.0,    // epoch seconds
    "finished_at": 1761650003.2,
    "duration_ms": 3200.0,
    "error": null,                 // NEW. first error text seen in the run, else null
    "model": "gpt-4o-mini-2024-07-18", // NEW (X12). first model seen, else null
    "models": ["gpt-4o-mini-2024-07-18"], // NEW (X12)
    "usage": { "prompt_tokens": 120, "completion_tokens": 30, "reasoning_tokens": 0, "total_tokens": 150 },
    "llm_calls": 2,
    "tool_calls": 1,
    "iterations": 3,               // CHANGED (X4). number of node visits (was: distinct node names)
    "notes": ["..."],              // NEW. honest limits for this run, human readable (may be empty)
    "spans": [ /* Span[] */ ],
    "events": [ /* Event[] newest first, unchanged */ ]
  }
}
```

### Span

Flat list; build the tree from `parent`. Order is chronological by `start_ms`.
Tree shape: `root` > `node` (one per visit) > `llm` and `tool`.

```jsonc
{
  "id": "s3",
  "name": "node: agent",           // "graph" | "node: <name>" | "llm.generate" | "tool: <name>"
  "kind": "node",                  // root | node | llm | tool
  "parent": "root",                // parent span id, null for root
  "start_ms": 12.4,                // REAL offset from run start (arrival time at the API)
  "duration_ms": 840.2,            // REAL for node, llm and tool (was 0.0 for llm and tool)
  "status": "ok",                  // NEW. ok | error | running
  "error": null,                   // NEW. string when status == "error"
  "inputs":  { },                  // NEW. object or null, see below
  "outputs": { },                  // NEW. object or null, see below
  "step": 1,                       // NEW. graph step (node spans), else null
  "visit": 2,                      // NEW. 1-based visit count of this node name (node spans), else null
  "model": "gpt-4o-mini-...",      // llm spans (X12), else null
  "input_tokens": 120,             // llm spans, else null
  "output_tokens": 30,             // llm spans, else null
  "total_tokens": 150,             // NEW. llm spans, else null
  "reasoning_tokens": 0,           // NEW. llm spans, else null
  "tool_name": null,               // NEW. tool spans
  "tool_call_id": null             // NEW. tool spans
}
```

Per kind:

| kind | `inputs` | `outputs` |
|---|---|---|
| root | `{ "user_message": string }` first user message seen (null if the run did not emit it) | `{ "assistant_message": string }` last complete assistant text (null if none) |
| node | `{ "incoming_message": MessageSummary }` APPROXIMATE: the latest complete message emitted before the visit began; null if none | `{ "messages": MessageSummary[] }` complete messages emitted during the visit |
| llm | always `null`: the full prompt is not recorded by core | `{ "text": string, "tool_calls": [{ "id", "name", "args" }] }` (keys omitted when empty) |
| tool | `{ "args": object }` | `{ "result": any }` (clipped, see below) |

`MessageSummary` = `{ "role": "user|assistant|tool|system", "text"?: string, "tool_calls"?: [{ "id", "name" }], "tool_results"?: [{ "call_id", "is_error" }] }`.

Large values are clipped to 4000 characters; a clipped value becomes a string ending in
`...[truncated N chars]`. Values are JSON, never Python reprs.

Timing rules (for the playground waterfall):
- `start_ms` / `duration_ms` come from the arrival time of each streamed chunk at the API, not from
  chunk timestamps (core stamps `StreamChunk.timestamp` once at import, so it is not usable).
- node span: from the first chunk of the visit to the last chunk attributed to it.
- llm span: from the previous boundary in the same visit (visit start or previous tool result / llm end)
  to the chunk carrying the final token usage.
- tool span: from the tool node's `invoking_tool` update to its `tool_result` / `tool_failed` chunk
  (falls back to the assistant `tool_call` block when the update is absent, e.g. invoke runs).
  Parent is the tool node's visit.

### Event (unchanged)

`{ "id": "e0", "type": "message|updates|state|error|result", "node": "agent", "offset_ms": 12.0, "summary": "..." }`

### Empty states (X7)

| `enabled` | `reason` | `run` | Meaning |
|---|---|---|---|
| false | `"disabled_in_production"` | null | MODE=production, local trace store is intentionally off |
| false | `"store_unavailable"` | null | store not bound in a non-production server (unexpected) |
| true | `"no_runs"` | null | tracing on, no run captured for this thread yet |
| true | null | object | normal |

### Not available (and why)

- Full LLM prompt (system prompt, message history sent to the model): core does not put it on the
  stream. LLM `inputs` is therefore null. Node `inputs` is only the approximate incoming message.
- Dollar cost: only token counts exist.
- `invoke` (non-stream) runs: there is no chunk stream, so the trace is built from the final messages.
  No node attribution (all spans hang off `root`), no step/visit, and timings come from message
  creation timestamps (LLM and tool durations are approximate or 0). `notes` says so.
- Streaming deltas: LLM output is taken from the complete assistant message, not the deltas.
- Records are capped at 2000 per run, 20 runs per thread, 200 threads (in memory only).

## GET /v1/evals/runs

```jsonc
{ "runs": [ {
  "id": "refunds-1761650000", "name": "Refund flows", "run": "#3",
  "rate": 66.7, "status": "fail",   // pass | fail  (unchanged)
  "cases": 3,
  "errors": 1,                       // NEW (X5). cases that errored (separate from failed)
  "ago": "5m ago"
} ] }
```

## GET /v1/evals/runs/{run_id}

```jsonc
{
  "title": "Refund flows · run #3", "sub": "...", "rate": 66.7,
  "status": "fail",                  // pass | fail (unchanged)
  "threshold": 80.0,
  "counts": { "total": 3, "passed": 1, "failed": 1, "errored": 1 },   // NEW (X5)
  "stats": [
    { "label": "cases", "value": "3" },
    { "label": "passed", "value": "1", "tone": "ok" },
    { "label": "failed", "value": "1", "tone": "bad" },   // CHANGED (X5). failed only, no longer includes errors
    { "label": "errors", "value": "1", "tone": "bad" },   // NEW (X5). tone omitted when 0
    { "label": "avg score", "value": "0.62" },
    { "label": "avg latency", "value": "1.2s" },
    { "label": "total tokens", "value": "450 tok" }
  ],
  "cases": [ /* Case[] */ ],
  "regression": null                  // unchanged
}
```

### Case

```jsonc
{
  "id": "c1", "name": "Refund", "type": "eval",    // eval | sim
  "score": 0.5,
  "status": "pass",                  // CHANGED (X5). pass | fail | error  ("error" = case.error set)
  "error": null,                     // NEW (X5). case-level error text when status == "error"
  "lat": "1.2s", "cost": "150 tok",
  "input": "I want a refund",
  "expected": "Refund issued; tools: refund_order; nodes: agent > tools",  // X9: one-line summary, "—" if none
  "expected_detail": {               // NEW (X9). null when no criterion recorded expectations
    "response": "Refund issued",              // string | null
    "tool_trajectory": [ { "name": "refund_order", "args": {} } ],  // array | null
    "node_order": ["agent", "tools"]          // array | null
  },
  "actual": "The refund has been processed.",
  "rubric": [                        // null when the case has no criteria
    {
      "key": "tool_name_match", "value": 0.5, "tone": "danger",
      "kind": "criterion",           // NEW. criterion | summary (the "weighted score" row)
      "passed": false,               // NEW. bool | null (null for summary)
      "threshold": 0.8,              // NEW (X5). number | null
      "details": { "reason": "..." },// NEW (X5). object | null (criterion details as recorded)
      "error": null                  // NEW (X5). string | null (criterion failed to run)
    }
  ],
  "conversation": null               // unchanged
}
```

`expected` source: the eval report JSON contains results only, not the `EvalCase`. The summary is
derived from the criterion `details` that the built-in criteria record (`expected_response`,
`expected_trajectory`, `expected_node_order`, `expected_names`). A case evaluated only with LLM
judge criteria has no expectations on record, so `expected` is `"—"` and `expected_detail` is null.
`expected_response` is clipped at 500 characters by the criterion itself.

## Implementation notes

- A node visit begins when the node name changes or the graph `step` changes, so a node that runs twice
  in a row is two visits. `visit` counts visits per node name.
- `status` on a span is `running` only while the run itself is `running`; a tool span with no recorded
  result in a finished run keeps `status: "ok"`, `duration_ms: 0`, `outputs: null`.
- `error` text in production is already sanitized by the server (generic message), same as stream error chunks.
- Eval `regression` rows: `flip` is `pass → error`, `fail → error`, `error → pass`, etc. (or `<status> (same)`); `stay` is true only when the status is unchanged. An errored case that was passing counts toward `newly failing`.
