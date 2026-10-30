# Audit: Evals + Observability pages (read-only)

Paths are relative to /home/shudiptot/projects/Agentflow. "PG" = agentflow-playground/src. "API" = agentflow-api/tenxgraph_api/src/app. "CORE" = agentflow/tenxgraph/qa/evaluation.

## 1. What each page does today

### Evals (PG/pages/evals/)
A read-only viewer of `10xgraph eval` JSON reports. It does not run evals, create eval sets, or edit criteria.
- Left: list of runs (name, `#n`, pass-rate pill, case count, "ago") - run-list.jsx:16-55.
- Centre: header (title, sub, pass rate, stats row, pass/fail bar), tabs Cases / Regression - drilldown.jsx:242-321. Cases table with score bar vs fixed 0.8 line, status, latency, token "cost". Regression tab compares the run with the previous run of the same eval set (case-level score delta, pass/fail flips).
- Right: case detail - input, simulated conversation (for simulation cases), expected, actual, per-criterion rubric bars, threshold/latency/cost - case-detail.jsx.
- Data: REAL, from `eval_reports/*.json` in the API server's cwd via `GET /v1/evals/runs` and `/v1/evals/runs/{id}` (API/routers/evals/router.py:27-38, services/eval_report_service.py). Demo mode serves recorded fixtures (PG/store/evals-slice.js:85-93, demo-client.js:130-133). No mock data in live mode.
- Empty/error states: no runs -> "No eval runs - connect to a backend." (run-list.jsx:26) shown for every cause. Detail loading/error/none states exist (drilldown.jsx:251-270). `runsError`/`runsStatus` are stored (evals-slice.js:27-38) but never read by any component.
- Loaded once on mount (evals-page.jsx:26-28); no refresh button, no polling.

### Observability (PG/pages/observability/)
Plain explanation: it is a per-run trace viewer for the thread currently open in Chat. When you chat with an agent, the API server records every stream chunk (node name, timestamp, token usage, tool names) into an in-memory store, and `GET /v1/observability/{thread_id}` rebuilds from those chunks a waterfall of "spans" (graph root -> node -> LLM call / tool call), a log of events, and token totals. The page shows that for the latest run of the active chat thread: a Gantt-style timeline (which node ran when, how long), an events list, and token/estimated-cost tables. It answers "what did the graph just do on my last message, and what did it cost?". It is not a historical analytics tool: data is process-local, capped (200 threads, 20 runs/thread, 2000 records/run - API/utils/telemetry_store.py:21-23), lost on restart, and only bound when `MODE != production` (API/loader.py:548-554).
- Data: REAL (API/routers/graph/router.py:344-370, graph_service.py:1301-1470; SDK client.observability in agentflow-client/src/endpoints/observability.ts). Demo mode uses `DEMO_TRACE_THREAD` (observability-page.jsx:50).
- States: no thread -> "No active thread. Start a run in Chat" (page:22-24); loading; error; empty (404 or run=null) -> "No runs captured... Send a message in Chat" (page:27-29, slice:46-49,71-75).
- Loads only on mount / thread change (page:58-60). After you send another chat message the page does not refresh unless you navigate away and back (inference from the effect deps; no polling found).

## 2. Gaps (capability exists, not surfaced)

Evals
- Run an eval from the UI: only CLI `10xgraph eval` (API/../cli/commands/eval.py:721 `execute`, main.py:734 `eval_cmd`). No POST endpoint exists in router.py (only 2 GETs). UI/API gap both.
- Eval sets / cases: core `EvalSet`, `EvalCase.single_turn/multi_turn` (CORE/dataset/eval_set.py:169-259) have no listing, viewing, or authoring in API or UI.
- Criteria catalogue (ExactMatch, ContainsKeywords, RougeMatch, LLMJudge, Rubric, FactualAccuracy, Hallucination, Safety, SimulationGoals, NodeOrderMatch, Trajectory - CORE/criteria/__init__.py): UI only shows per-case criterion score by name; no criterion description, threshold per criterion, `details`, `error` (eval_result.py:61-66 `CriterionResult.details/error/threshold` dropped by `_case_rubric`, eval_report_service.py ~L90-105).
- Dropped per-case data from `EvalCaseResult` (eval_result.py:136-152): `error` (case errors never shown; `status` is only pass/fail, so error vs fail is conflated - service L110, and stats lump `error_cases` into failed), `actual_trajectory`, `actual_tool_calls`, `node_visits`, `node_responses`, `node_details` (per-node tokens/inputs), `turn_results`, `agent_token_usage` vs judge `token_usage`.
- Summary `criterion_stats` (eval_result.py:269) never used: no per-criterion pass-rate view.
- HTML report: core HTMLReporter exists (CORE/reporters/html.py) and CLI writes it (eval.py:875-892), but no API route serves it. See bug B1.
- Comparison is only "vs previous run of same set id" (service `_run_labels`); no pick-any-two, no trend chart over history, no model comparison though `config_used.model` is available.
- Run history is just file names under `eval_reports/`; no filter/search/sort by eval set, no delete.
- SDK has no eval methods (evals-slice.js:7-8 comment confirms; grep of agentflow-client/src finds no eval endpoint). Playground uses raw fetch and a hand-copied auth-header builder (evals-slice.js:69-79) that can drift from the SDK's.

Observability
- Per-LLM-call and per-tool latency: spans for llm/tool get `duration_ms=0.0` always (graph_service.py ~L1393, ~L1412), so the waterfall bars are a fixed 1.5% sliver (transform.js:70). Node span duration is only first-to-last chunk time. "Latency per node" is approximate; tool timing is absent.
- Model name: `_telemetry_record` never sets a `model` key (graph_service.py:485-531) yet `_reconstruct_run` reads `rec.get("model")` -> model always null -> Detail shows "gen_ai.request.model: -" and the Cost "by model" row is "-" (transform.js:226).
- Errors: `is_error` captured only into the event summary "error"; spans have no status field, UI hardcodes "OK" (detail-panel.jsx:32,54). Run `status` (done/error/stopped) is returned but not shown anywhere.
- Run picker: API supports `?run_id=` and returns `run_ids`; SDK supports it (observability.ts); slice stores `runIds` (slice:29) and `loadObservability(threadId, runId)` accepts it; UI never lets you choose (see B3).
- Not shown: tool call arguments/results, LLM prompt/response content, state diffs, checkpoints, interrupts. Thread state/checkpoints exist on the Threads page (client.threadState, threads-slice.js:128) but are not linked to a run/span.
- No export (JSON/OTLP) of the trace.
- External tracing: `observability` block in 10xgraph.json wires Logfire/LangSmith (API/core/config/setup_middleware.py:272-340) and OTEL (L347+) but the header "Logfire / LangSmith / Jaeger - off" buttons are static (obs-header.jsx:13-17, always `off:true`), never reflect real config, and have no handler.
- Core event/publisher model is richer than what the endpoint keeps (it flattens StreamChunk to 9 fields, graph_service.py:508-518; state/execution_meta, interrupts, message ids, content are dropped). Inference: this is a deliberate size trade-off.

## 3. Bugs / stubs

| # | Where | Issue | Conf. |
|---|---|---|---|
| B1 | PG/pages/evals/components/drilldown.jsx:305-308 | "Download HTML report" button has no onClick and no API route to serve it: dead control | High |
| B2 | API/routers/evals/services/eval_report_service.py `_build_case_view` ("expected": "-") + case-detail.jsx:59-62 | "Expected" box is always "-"; the schema has expected trajectory/node order/rubrics but no single expected text. Misleading panel | High |
| B3 | PG/pages/observability/components/obs-header.jsx:37-45 | "scope thread" and "latest of N" are chevron-decorated but non-interactive (no handlers, no state): look like dropdowns, do nothing | High |
| B4 | obs-header.jsx:13-17,47-59 | Deep-link buttons hardcoded "off", `type=button` with no handler | High |
| B5 | PG/pages/observability/transform.js:226-227 | `modelRows` gives every model the whole-run cost (`estCost(usage)`), and cost uses a hardcoded blended rate (L16); labelled "est." but not model-aware | High (rate is documented in comment) |
| B6 | graph_service.py:485-531 vs :1384 | `model` read but never recorded -> always empty (see gaps) | High |
| B7 | PG/pages/evals/components/case-detail.jsx:93 and drilldown.jsx:6,58 | Threshold hardcoded 0.80 in case detail and the score bar/column header, while the API derives the real threshold only per run (`_derive_threshold`, service, returns 80 if none) and per criterion thresholds are discarded | High |
| B8 | PG/pages/evals/components/run-list.jsx:26 | Empty text always "connect to a backend" even when connected but `eval_reports/` is empty (API returns []) or fetch failed (`runsError` unused). Should say "run `10xgraph eval` in <cwd>" | High |
| B9 | API/routers/evals/services/eval_report_service.py `_load_reports` + `_run_labels` | Every call rescans and re-parses ALL report files, and the detail endpoint does it again (O(files) per click); malformed files are silently skipped. Run id = filename stem. Fine for dev, slow with many reports | Medium |
| B10 | graph_service.py `_reconstruct_run` node spans keyed by node name | A node visited multiple times in a loop (ReAct cycles) collapses into one span stretching from first to last visit; waterfall misrepresents timing. `iterations` = distinct node count, not loop iterations (`len(node_order)`) | High |
| B11 | graph_service.py tool spans loop (~L1400-1412) | Tool span emitted when the same record has any `tool_call` kind, for each name in `tool_names`, which includes `tool_result` names; a record with both could double count. Inference, unverified at runtime | Low |
| B12 | observability-page.jsx:22-29 + loader.py:548-554 | In production mode (store unbound) endpoint returns empty -> UI says "Send a message in Chat" - misleading; should say tracing is disabled in production | Medium |
| B13 | PG/pages/observability/components/detail-panel.jsx:54 | Sub text "status OK" hardcoded for any span, including errored runs | High |
| B14 | PG/pages/observability/observability-page.jsx:58-60 | No refresh after new chat message / no manual refresh; stale trace possible (inference from deps) | Medium |
| B15 | PG/pages/evals/components/case-detail.jsx:47 | React key `${role}:${text}` can collide for repeated identical turns | Low |
| B16 | API/routers/evals/router.py:21-24 | Evals endpoints are unauthenticated (public allowlist, route_guard.py:31-32) while `/v1/observability` requires `graph:read`. Documented as intentional dev-only; but the report contains agent outputs and message content, so it is reachable by anyone who can hit the server | Medium (noted as intended in comment) |

## 4. Observability: purpose, overlap, recommendation
Purpose: see section 1 paragraph. Is it clear in the UI? No. The title is just "Observability" (obs-header.jsx:35) with no subtitle; the scope/run selectors look interactive but are not; stats like "iterations" and "spans" are jargon; the page depends on a Chat thread existing and shows a blank "No active thread" otherwise. Nothing says "this is the trace of your last chat run, kept in server memory".

Overlap with Threads inspector (PG/pages/threads/): different data, adjacent question. Threads shows persisted checkpointer data (messages, state, `execution_meta`, context) via `client.threads/threadState/threadMessages` (threads-slice.js:103-129; state-pane.jsx:87-88); Observability shows ephemeral per-run timing/tokens. Both are keyed by thread id, and a user debugging a run needs both; today they cannot jump between them. Chat has `ui/trace.jsx` (components/ui) which I did not audit in depth, likely a per-message trace UI (unverified overlap).
Recommendation: keep both, but (a) rename to "Run trace" (or "Traces") with a one-line subtitle, (b) add a thread picker/run picker so it does not depend on the Chat page state, (c) add a cross-link "Open thread state" / "View trace" between Threads and the trace, or fold Observability into the Threads page as a "Trace" tab per run, since both are thread-scoped. Cost tab could move to the header stats only (already duplicated: tokens/est. cost appear in both header and Cost tab).

## 5. Prioritized recommendations
P0
- Remove or wire "Download HTML report" (add `GET /v1/evals/runs/{id}/report.html` using core HTMLReporter): dead primary-looking button (B1).
- Fix model capture (`model` in `_telemetry_record`) and node-span-per-visit: the trace currently lacks model and mis-draws loops (B6, B10).
- Make selectors real or remove them (run picker using `run_ids`, thread picker); clarify page title/subtitle: user-reported confusion (B3, section 4).
- Distinguish error/fail in eval cases and show case `error` text: failures from exceptions are invisible today (gaps, service L110).
P1
- Empty/error states: show `runsError`, "no reports in <dir>, run `10xgraph eval`", and "tracing disabled in production" (B8, B12).
- Real tool and LLM durations (timestamp deltas between tool_call and tool_result) so the waterfall is meaningful (gap).
- Real per-criterion thresholds/details/error in the rubric, drop hardcoded 0.80 (B7).
- Replace "Expected" with expected trajectory / node order / criteria description, or hide it (B2).
- Refresh/auto-refresh on Observability and a refresh button on Evals (B14).
- Add `evals` + `observability` methods to the SDK and use them, remove the duplicated auth-header code (evals-slice.js:69-79).
P2
- Trace export (JSON), trace-to-thread cross-links, tool args/results in detail panel.
- Eval history trend and compare-any-two-runs; per-criterion stats from `criterion_stats`.
- Run eval from UI (POST endpoint + eval set browser): large feature, only if the playground should be more than a viewer.
- Show real status of Logfire/LangSmith/OTEL from server config instead of hardcoded "off".
