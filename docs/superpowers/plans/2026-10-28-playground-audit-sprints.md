# Playground Audit Sprints Implementation Plan (Sprints 1 to 5)

**Progress (2026-10-28, complete):** All five sprints done. Sprint 1 and 2 done. Sprint 3: Run trace (3.1-3.3: /trace route with /observability redirect, run tree with node visits, LLM and tool calls, Inputs/Outputs/Metadata detail tabs, thread selector, "View trace" on Threads, empty states from enabled/reason) and Evals (3.4) done. Sprint 4 (Files page, memory create/edit, memory search filters, server file list) done. Sprint 5 (Live events, typed input and options, WebSocket un-gated, attachments) done. Cross-package: X1-X12 done in agentflow-api, agentflow-client (1.0.0-rc.2, unpublished, tarball installed in node_modules with --no-save) and core (StreamChunk timestamp fix, media list_keys, all four pause kinds pass at every granularity: interrupt, before, after, remote_tool). Static pauses (interrupt_before/after) continue with `{"resume": null}` and no message (API drops resume for static pauses). Verified: playground 421 tests, eslint clean, build ok, headless demo smoke of all 11 routes with 0 console errors; API 2157 passed (91.38% coverage), ruff clean; core 4194 passed; client 597 passed, build ok. Maintainer to-dos: publish 10xgraph-client 1.0.0-rc.2 and bump the playground pin; reinstall core in agentflow-api/.venv (pip install -e ../agentflow) and install the websocket extra to test files list and WS locally; re-record the demo against the current API (small upload, and so trace spans get durations and tokens); delete agentflow-client/10xgraph-client-1.0.0-rc.2.tgz (do not commit); check agentflow-docs for any "send a message to continue" wording about interrupt_before/after.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the gaps and bugs the three 2026-10-28 audits found in the 10xGraph Playground, in five sprints, ordered so that wrong or fake UI is fixed first and new features follow.

**Architecture:** Sprint 1 touches the playground only and fixes behavior that is wrong today (data-loss risk, dead controls, swallowed errors, hardcoded values). It adds one shared error pattern that every later sprint reuses. Sprints 2 to 5 add features on top of endpoints and SDK methods that already exist. Anything that needs a change in `agentflow-api` or `agentflow-client` is listed once in the Cross-package track, with the sprint item it unblocks.

**Tech Stack:** React 19, Vite 6, Redux Toolkit, Vitest + Testing Library (happy-dom), `10xgraph-client` (installed: 0.6.0), `10xgraph-api` (repo: 1.0.0rc1), `10xgraph` core (repo: 1.0.0rc1).

**Spec:** The three audits, accepted by the maintainer as correct on 2026-10-28:
- `agentflow-playground/docs/audit/2026-10-28-memory-files.md`
- `agentflow-playground/docs/audit/2026-10-28-evals-observability.md`
- `agentflow-playground/docs/audit/2026-10-28-threads-live-chat.md`

Where this plan corrects an audit claim after re-reading the code, the correction is in "Audit corrections" below. Where it could not verify something, the text says "Unverified".

## Global Constraints

- The executor does not commit and does not `git add`. Every task ends at a checkpoint where the maintainer reviews and commits.
- All implementation goes to Sonnet subagents with precise briefs. The main agent reviews, runs the suites and records results.
- Never read `.env` files. Ask the maintainer to set them up.
- Demo mode must keep working. `src/lib/demo/demo-client.js` (`DemoClient`) must implement every client method a page calls, and `src/lib/demo/test-fixture.js` must hold data for it. Any task that adds a client call adds the matching `DemoClient` method and a test in `src/lib/demo/demo-client.test.js`. In demo mode, writes are accepted and ignored or applied to the in-tab copy; nothing reaches a backend.
- At every checkpoint, `npx eslint .` and the full `npx vitest run` pass. ESLint is `@10xscale/eslint-modern` with `max-lines-per-function` 200 for `.jsx` and 100 for `.js`, plus prettier. Test files (`*.test.js`, `*.test.jsx`) are excluded from ESLint, so they are checked by running them.
- No new file whose dev-served path matches an ad-block pattern: analytics, tracking, telemetry, metrics, stats, pixel, beacon. Applies to file names, directory names and CSS module names. (`src/lib/usage-events.js` already exists and is fine.)
- Prose and UI copy: spell the product "10xGraph". No em dashes, no emojis, no hype words.
- Versions: all three packages release next as 1.0.0 in lockstep (major.minor identical, patch independent). The repo versions today are `10xgraph` 1.0.0rc1, `10xgraph-api` 1.0.0rc1, `10xgraph-client` 1.0.0-rc.1. The playground installs `10xgraph-client` `^0.6.0`, which does not resolve to the 1.0 prerelease. Any playground work that needs a 1.0 client feature is gated on the client 1.0.0 release (see Cross-package track, item X1).
- Tests follow the existing patterns: slice tests mock `@/lib/tenxgraph-client` with `vi.hoisted` and `configureStore` (see `src/store/memory-slice.demo.test.js`); component tests render inside `Provider` and mock `@/lib/connection/connection-context` (see `src/pages/chat/components/composer.test.jsx`). Vitest runs with `globals: true`, `happy-dom` and `src/setup-tests.js`. Files under `src/components/ui/**` are excluded from tests and must not be edited (vendored shadcn).

## Review Focus

Failure modes the audits imply that no single audit fix would test by itself. Each one has a test in the task named in brackets.

1. **Forget with a filter active.** The visible set is 2 rows out of 40 loaded; Forget deletes exactly those 2 ids and none of the other 38. [Task 4]
2. **Delete the only thread, or a thread that is not selected.** The pane shows the empty state, not stale data; deleting an unselected thread does not reload the selected one. [Task 2]
3. **One of the two thread detail calls fails.** The page shows the data that did load plus a visible error, not "No messages". [Task 3]
4. **A 404 on thread state is not an error.** A thread with no checkpoint yet shows "No state", with no alert. [Task 3]
5. **Stop before the first chunk, in invoke mode.** The turn ends as "stopped", the composer unlocks, and the server is asked to stop once the thread id is known. [Task 10]
6. **Non-fatal Live error.** The session stays live; only a fatal error ends it, and Restart never leaves an old socket open. [Task 11]
7. **Observability on a server in production mode.** The empty state does not tell the user to "send a message" as if it would help. [Task 8]

## Audit corrections

Found while verifying the audits against the code. Details sit in the tasks.

- Audit path `pages/live/live-session.jsx` is `pages/live/components/live-session.jsx` (340 lines). Line numbers in the audits drift by a few lines in places (for example `consumeStream` starts at `src/store/chat-thunks.js:319`, not 325). Tasks cite the function name first.
- Audit asks to "show errored cases with error text" and "stop dropping criterion details" in the playground. The data never reaches the client: `_build_case_view` and `_case_rubric` in `agentflow-api/tenxgraph_api/src/app/routers/evals/services/eval_report_service.py` drop `error`, per-criterion `threshold`, `details` and `error` before the response is built. This cannot be done playground-only. It moves to Sprint 3 and is Cross-package item X5.
- The run detail response already includes a run-level `threshold` (percent, `_derive_threshold`), and `drilldown.jsx:288` already renders it. Only the score bar (`drilldown.jsx:6` `THRESHOLD = 0.8`, `:58`) and `case-detail.jsx:93` are hardcoded. The fix is playground-only for run-level thresholds; per-criterion thresholds need X5.
- Node-span-per-visit (audit B10) is an API defect: `node_spans` in `_reconstruct_run` (`graph_service.py`, around line 1384) is keyed by node name. It is not fixable in `transform.js`. The response does carry `events` with `node` and `offset_ms`, so the playground can approximate visits by grouping consecutive events of the same node. That is a stopgap (Sprint 3) and the API change is X4.
- Not in the audit: the SDK's `searchMemory` defaults `memory_type` to `episodic`, `category` to `""` and `score_threshold` to `0` when the caller omits them (`agentflow-client/src/endpoints/searchMemory.ts`; the installed 0.6.0 `dist/index.js` does the same). So the playground's Search tab today searches episodic memories only, while the facet column implies all types. This is Cross-package item X6 (blocker for honest search) and Sprint 4 work; a one-line honesty note is included in Task 4.
- Not in the audit: `observability-slice.js` `isNotFound` checks `e?.status === 404`, but SDK errors carry `statusCode` (`agentflow-client/src/errors.ts:30`). It works today only through the `/not found/i` message fallback. Hardened in Task 8.
- Observability cannot tell "tracing disabled (MODE=production)" from "no runs yet": `get_observability` returns the same empty payload for both (`graph_service.py:1312-1314`). Task 8 therefore words the empty state to cover both; a real flag is Cross-package item X7 (enhancement).
- Interrupt resume needs the 1.0 client. Installed 0.6.0 has no `resume`, `interrupt_id` or `on_busy` option (verified in `node_modules/10xgraph-client/dist`; they appear only in the repo's 1.0.0-rc.1 source). The audit's "ws gate is stale because 0.6.0 and 0.7.0 shipped" is true for WebSocket, but Sprint 5 still gates the un-gate on 1.0.0 per the maintainer's ruling.

## Shared pattern (defined in Task 1, used everywhere after)

One rule for every failure in the playground:
- **A load that leaves a pane unable to render** (thread detail, eval runs, memory list): an inline `ErrorNote` in that pane, with the server's message and a Retry button when a retry makes sense.
- **A user action that failed** (delete, forget, clear, fix, stop): a destructive toast through `notifyError(title, error)`. Partial failures are one toast with counts, because `src/components/ui/use-toast.js` sets `TOAST_LIMIT = 1` (a second toast replaces the first).
- Nothing swallows an error silently. A `catch` either shows one of the above or has a comment saying why the failure is harmless.

Existing code to reuse, verified: `src/components/ui/toast.jsx` (has a `destructive` variant), `src/components/ui/toaster.jsx` (`Toaster`), `src/components/ui/use-toast.js` (`toast()`). `Toaster` is not mounted anywhere today (grep finds no `<Toaster`), and `toast()` has no caller outside the vendored folder. Task 1 mounts it.

## File Structure (new files)

| Path | Responsibility |
|---|---|
| `src/lib/notify.js` | `notifyError`, `notifySuccess`: the only place that calls `toast()` |
| `src/components/shell/error-note.jsx` (+ `.module.css`) | Inline load-failure note with optional Retry |
| `src/store/threads-slice.test.js` | Threads thunk behavior |
| `src/pages/threads/threads-page.test.jsx` | Threads detail error rendering |
| `src/store/memory-slice.test.js` | Forget and delete behavior against a live-style client |
| `src/pages/observability/components/run-picker.jsx` | Real run selector |
| `src/pages/live/components/live-session.test.jsx` | Live session event handling |
| `src/components/shell/sidebar.test.jsx` | Threads badge populates without visiting Threads |

Sprints 2 to 5 add files listed in their own sections.

---

# Sprint 1: Correctness and honest UI (playground only, 2 weeks)

Nothing in this sprint changes `agentflow-api` or `agentflow-client`. Every task ends at a checkpoint: the maintainer reviews and commits.

**Deferred out of Sprint 1, with reason:** eval "errored case" display and criterion details (data not sent by the API, X5; moved to Sprint 3); Chat Stop that truly cancels the HTTP request (needs SDK `AbortSignal`, X2; Task 10 does the best possible without it).

### Task 1: Shared error pattern

**Files:**
- Create: `src/lib/notify.js`, `src/lib/notify.test.jsx`
- Create: `src/components/shell/error-note.jsx`, `src/components/shell/error-note.module.css`, `src/components/shell/error-note.test.jsx`
- Modify: `src/components/shell/app-shell.jsx` (mount `<Toaster />` once, inside the root `div`, next to `<ConnectionBar>`)

**Interfaces:**
- Produces: `notifyError(title: string, error?: unknown): void` (description is `error.message` if present, else the string form; variant `destructive`), `notifySuccess(title: string, description?: string): void`.
- Produces: `<ErrorNote message: string, onRetry?: () => void />` rendering `role="alert"`, the message, and a "Retry" button only when `onRetry` is given.

- [ ] **Step 1: Write the failing tests.** `notify.test.jsx`: render `<Toaster />`, call `notifyError("Could not delete thread", new Error("403 Forbidden"))` inside `act`, assert `screen.findByText("Could not delete thread")` and `findByText("403 Forbidden")`. `error-note.test.jsx`: renders `role="alert"` with the message; Retry button is absent without `onRetry`; clicking Retry calls it once. Unverified: Radix Toast under happy-dom may need a `ResizeObserver` stub. If so, add the stub to the test file, not to `src/setup-tests.js`; if the Toaster still will not render, fall back to `vi.mock("@/components/ui/use-toast")` and assert the `toast` spy received `{ variant: "destructive", title, description }`.
- [ ] **Step 2: Run to verify failure.** `npx vitest run src/lib/notify.test.jsx src/components/shell/error-note.test.jsx`. Expected: FAIL, modules not found.
- [ ] **Step 3: Implement.** `notify.js` wraps `toast` from `@/components/ui/use-toast`. `error-note.jsx` is a small presentational component; take colors and spacing from the danger styling already used in `src/pages/threads/threads.module.css` (`.listEmpty`) rather than inventing tokens. Mount `Toaster` in `app-shell.jsx`.
- [ ] **Step 4: Run to verify pass.** Same command, expected PASS. Then `npx eslint src/lib/notify.js src/components/shell`.
- [ ] **Step 5: Checkpoint: maintainer reviews** the toast look in the running app (trigger it from the browser console is not possible, so Task 3 is where it is first seen) and commits.

### Task 2: Threads, delete then select loads the next thread (audit B1)

**Files:**
- Modify: `src/store/threads-slice.js` (`removeThread`, line 138; `threadRemoved` reducer, line 60)
- Test: `src/store/threads-slice.test.js` (new)

**Interfaces:**
- Consumes: `loadThread(threadId)`, `threadRemoved`, `listLoaded` from the same slice.
- Produces: after `removeThread(id)` resolves, `state.threads.selectedId` is the next thread (or `null`) and `detail` belongs to it.

- [ ] **Step 1: Write the failing tests** with a mocked client (`threads`, `threadState`, `threadMessages`, `deleteThread` as `vi.fn`) and a store holding only `threads: threadsReducer`.
  - `selects and loads the next thread after deleting the selected one`: list `[a, b]`, select `a`, `removeThread("a")`; expect `selectedId === "b"`, `threadState` called with `"b"`, `detail.messages` equals b's messages, `detailStatus === "ready"`.
  - `shows the empty state after deleting the last thread`: list `[a]`; expect `selectedId === null` and `detail === null`.
  - `does not reload when an unselected thread is deleted`: list `[a, b]`, selected `a`, delete `b`; `threadState` call count unchanged after the delete.
- [ ] **Step 2: Run to verify failure.** `npx vitest run src/store/threads-slice.test.js`. Expected: first test FAIL (`detail` stays `null`).
- [ ] **Step 3: Implement.** In `removeThread`, after `dispatch(threadRemoved(threadId))`, read `getState().threads.selectedId`; if it is non-null and differs from the id before removal, `await dispatch(loadThread(next))`. The thunk needs `getState` as its second argument.
- [ ] **Step 4: Run to verify pass.** Same command; then `npx eslint src/store/threads-slice.js`.
- [ ] **Step 5: Checkpoint: maintainer reviews** by deleting the selected thread in the running app and confirming the next one fills the pane. Maintainer commits.

### Task 3: Threads, surface errors (audit B2)

**Files:**
- Modify: `src/store/threads-slice.js` (`loadThread` line 116, `removeThread`, `clearThread`, `removeMessage`; add reducer `detailPartial`)
- Modify: `src/pages/threads/threads-page.jsx` (`ThreadsPage`, detail section; select `detailStatus` and `detailError`)
- Test: `src/store/threads-slice.test.js` (extend), `src/pages/threads/threads-page.test.jsx` (new)

**Interfaces:**
- Consumes: `notifyError`, `ErrorNote` (Task 1).
- Produces: `detailPartial(message: string)` sets `detailError` without changing `detailStatus`. `removeThread`, `clearThread`, `removeMessage` resolve to `true` on success and `false` after showing a toast.

Rules for `loadThread`: use `Promise.allSettled`. Both rejected: `detailFailed(first message)`. One rejected: load the other and dispatch `detailPartial`. A rejection with `statusCode === 404` on `threadState` is not an error (a thread with no checkpoint yet); treat it as "no state".

- [ ] **Step 1: Write the failing tests.**
  - Slice: `both calls failing sets detailStatus error with the message`; `messages failing but state ok loads state and sets detailError`; `a 404 on state is not an error` (`detailError === null`); `removeThread failure shows a toast and keeps the thread in the list` (mock `@/lib/notify`, assert `notifyError` called with title "Could not delete thread", list unchanged); same for `clearThread` ("Could not clear state") and `removeMessage` ("Could not delete message"). `busy` ends `false` in every case.
  - Page: render `ThreadsPage` in `Provider` with preloaded `threads` state (`selectedId: "a"`, `detailStatus: "error"`, `detailError: "500 Internal Server Error"`), mock `@/lib/tenxgraph-client` so mount-time `loadThreadList` does not throw. Assert `screen.getByRole("alert")` has the message and "Retry" re-dispatches (client `threadState` called again).
- [ ] **Step 2: Run to verify failure.** `npx vitest run src/store/threads-slice.test.js src/pages/threads/threads-page.test.jsx`. Expected: FAIL.
- [ ] **Step 3: Implement** as in the rules above. In the page, render `<ErrorNote>` above `TabBody` when `detailError` is set.
- [ ] **Step 4: Run to verify pass,** then `npx eslint src/store/threads-slice.js src/pages/threads`.
- [ ] **Step 5: Checkpoint: maintainer reviews** with the API stopped mid-session (delete should toast, not silently re-enable the button). Maintainer commits.

### Task 4: Memory, "Forget visible" deletes only the shown rows; delete and forget failures are visible (audit section 3, data-loss item)

**Files:**
- Modify: `src/store/memory-slice.js` (`forgetVisible` line 206, `deleteMemory` line 194)
- Modify: `src/pages/memory/components/memory-list.jsx` (`confirmForget`, around line 259: pass `shown.map((m) => m.id)`)
- Test: `src/store/memory-slice.test.js` (new)

**Interfaces:**
- Produces: `forgetVisible(ids: string[])`. It deletes exactly `ids`, using `Promise.allSettled`, then refreshes. Failures produce one toast: `"Forgot 7 of 9 memories"` with the first error message as description, via `notifyError`. Full success is silent (the list refresh is the feedback).
- `deleteMemory(id)` catches, calls `notifyError("Could not delete memory", e)`, and still ends `busy: false`.

- [ ] **Step 1: Write the failing tests** (mocked client with `deleteMemory`, `listMemories`; store seeded through `loaded`).
  - `forgets only the ids it is given`: 40 items loaded, call `forgetVisible(["m1","m2"])`; `deleteMemory` called exactly twice, with those ids.
  - `reports partial failure once`: one of three rejects; `notifyError` called once with a title containing "2 of 3"; list refreshed afterwards.
  - `deleteMemory failure toasts and clears busy`.
- [ ] **Step 2: Run to verify failure.** `npx vitest run src/store/memory-slice.test.js`. Expected: FAIL (current thunk deletes all 40 and ignores errors).
- [ ] **Step 3: Implement.** Also, in `memory-list.jsx`, the Forget label already uses `shown.length`; keep it, and make sure the confirm button text reads "Forget N" with the same N that is sent.
- [ ] **Step 4: Run to verify pass,** then `npx eslint src/store/memory-slice.js src/pages/memory`. Add one honesty line to the Search tab, under the controls, in `memory-list.jsx`: "Search covers one memory type (the SDK default is episodic). Type and category facets do not apply here." Unverified: whether the store treats `category: ""` as a filter; the note says only what is verified. Remove this line in Sprint 4 when the real filters land.
- [ ] **Step 5: Checkpoint: maintainer reviews** by filtering to a few rows and forgetting; the rest must remain. Maintainer commits.

### Task 5: Memory, remove the no-op Collection input (audit section 3, first item)

**Files:**
- Modify: `src/pages/memory/components/facets-column.jsx` (remove the `collection` input, datalist and the helper sentence, lines 40-80; keep `user_id` and `loaded`; replace with a read-only row `collection` with value `set in code` and a one-line note: "The server owns the collection (set in code or in the store config). The playground cannot change it.")
- Modify: `src/pages/memory/memory-page.jsx` (drop `collection`, `setCollection`, and the reload-on-collection effect dependency)
- Modify: `src/pages/memory/components/memory-detail.jsx` (remove the `collection` prop and the row at line 154)
- Modify: `src/store/memory-slice.js` (remove `collection` state, `setCollection`, `cfgFor`; send no `config`)
- Modify: `src/pages/memory/data.js` (remove `DEFAULT_COLLECTION`, `COLLECTIONS`)
- Test: `src/store/memory-slice.test.js` (extend), `src/pages/memory/components/facets-column.test.jsx` (new)

Verified reason: `collection` is in the server-owned key list of `agentflow-api/tenxgraph_api/src/app/core/auth/request_config.py` (lines 20-22 and 76-77), so a client-sent `config.collection` is stripped.

- [ ] **Step 1: Write the failing tests.** Slice: `browseMemories sends no config.collection` (assert `listMemories` was called with `{ limit: 100 }` and no `config`). Component: `FacetsColumn` renders no `textbox` and shows the text "set in code".
- [ ] **Step 2: Run to verify failure.** `npx vitest run src/store/memory-slice.test.js src/pages/memory`. Expected: FAIL.
- [ ] **Step 3: Implement** the removals. Check `src/lib/demo` and `memory-slice.demo.test.js` still pass (they do not reference `collection`; confirm with grep before finishing).
- [ ] **Step 4: Run to verify pass,** then `npx eslint src/pages/memory src/store/memory-slice.js`.
- [ ] **Step 5: Checkpoint: maintainer reviews** the Memory page, then commits.

### Task 6: Evals, dead button, real empty and error states (audit B1, B8, B7 partly)

**Files:**
- Modify: `src/pages/evals/components/drilldown.jsx` (remove the "Download HTML report" button, lines 305-308, and the unused `Download` import; replace the hardcoded `THRESHOLD` at line 6 and the "threshold 0.8" text at line 58 with `detail.threshold / 100`)
- Modify: `src/pages/evals/components/case-detail.jsx` (line 93: use the run threshold passed in as a prop instead of `0.80`)
- Modify: `src/pages/evals/components/run-list.jsx` (accept `status` and `error`; four states: loading, error with `ErrorNote` and Retry, connected-but-empty, runs)
- Modify: `src/pages/evals/evals-page.jsx` (pass `runsStatus`, `runsError`, `detail.threshold`; Retry dispatches `loadEvalRuns()`)
- Test: `src/pages/evals/components/run-list.test.jsx` (new), `src/pages/evals/components/drilldown.test.jsx` (new)

Empty copy (no em dashes): `No eval reports found. Run 10xgraph eval in the folder where the API server runs; reports are read from eval_reports/ there.` Verified: no route serves the HTML report (`evals/router.py` has two GET routes only), so removing the button is correct.

- [ ] **Step 1: Write the failing tests.** `run-list`: `shows the server error and a Retry button when runsStatus is error` (alert text equals the error; Retry calls the handler); `shows the eval_reports hint when ready and empty`; `does not say "connect to a backend"`. `drilldown`: `has no Download HTML report button`; `the score threshold label uses the run threshold` (detail.threshold 70 renders "0.7").
- [ ] **Step 2: Run to verify failure.** `npx vitest run src/pages/evals`.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run to verify pass,** then `npx eslint src/pages/evals`.
- [ ] **Step 5: Checkpoint: maintainer reviews,** commits.

### Task 7: Observability, real run picker; remove the fake scope control and link chips (audit B3, B4)

**Files:**
- Create: `src/pages/observability/components/run-picker.jsx`, `run-picker.test.jsx`
- Modify: `src/pages/observability/components/obs-header.jsx` (remove the `scope` block, the `DEEP_LINKS` array and its buttons, the `ChevronDown` and `ExternalLink` imports; mount `RunPicker`)
- Modify: `src/pages/observability/observability-page.jsx` (pass `runIds`, current `run.run_id`, and `onPickRun`)
- Modify: `src/store/observability-slice.js` (nothing new; `loadObservability(threadId, runId)` already accepts a run id)

Verified: `GET /v1/observability/{thread_id}?run_id=` exists (`routers/graph/router.py:345-365`), the SDK 0.6.0 `observability(threadId, runId?)` accepts it, the API returns `run_ids` oldest first (latest is `runs[-1]`), and `DemoClient.observability` already handles `runId`.

**Interfaces:**
- Produces: `<RunPicker runIds: string[], current: string | null, onPick: (runId: string) => void />`: a native `<select>` (accessible, no new dependency), newest first, the newest labeled "latest", each option showing the short run id. Renders a plain "1 run" label when there is only one run, and nothing when there are none.

- [ ] **Step 1: Write the failing tests.** `run-picker`: lists run ids newest first; selecting an older id calls `onPick` with it; the newest option is labeled "latest"; one run renders no `combobox`. `obs-header` (in the same file or a small `obs-header.test.jsx`): renders no "Logfire", "LangSmith", "Jaeger" text and no "scope" control.
- [ ] **Step 2: Run to verify failure.** `npx vitest run src/pages/observability`.
- [ ] **Step 3: Implement.** The page keeps the picked run id in the store through the existing `loadObservability(threadId, runId)` call; when the thread changes, call it without a run id (latest).
- [ ] **Step 4: Run to verify pass,** then `npx eslint src/pages/observability`.
- [ ] **Step 5: Checkpoint: maintainer reviews** after two chat messages on one thread (two runs appear). Maintainer commits.

### Task 8: Observability, remove invented values (audit B5, B12, B13)

**Files:**
- Modify: `src/pages/observability/components/detail-panel.jsx` (remove the `{ k: "status", v: "OK" }` row at line 32 and the `· status OK` suffix at line 54)
- Modify: `src/pages/observability/transform.js` (`buildStats` line 101: add a `status` stat from `run.status`; `modelRows` line 217: per-model cost from that model's own input and output tokens)
- Modify: `src/pages/observability/observability-page.jsx` (`placeholderFor`, empty-state copy)
- Modify: `src/store/observability-slice.js` (`isNotFound` also checks `e?.statusCode === 404`)
- Test: `src/pages/observability/transform.test.js` (new), `src/store/observability-slice.test.js` (new)

Copy for the empty state: `No runs captured for this thread. Traces are kept in server memory and are off when the server runs with MODE=production. In development, send a message in Chat.` Reason: the API cannot distinguish the two cases (see Audit corrections; X7).

- [ ] **Step 1: Write the failing tests.** `transform`: `per-model cost uses each model's own tokens` (two llm spans, different models and token counts; the rows' cost strings differ and neither equals the whole-run cost); `buildStats includes the run status`; `no span is labeled OK` (detail panel text contains no "status OK"; render `DetailPanel` with a tool span). Slice: `a 404 with statusCode and no message match is treated as empty`.
- [ ] **Step 2: Run to verify failure.** `npx vitest run src/pages/observability src/store/observability-slice.test.js`.
- [ ] **Step 3: Implement.** Keep the cost estimate labeled "est." and keep the blended rate comment; only the per-model attribution changes.
- [ ] **Step 4: Run to verify pass,** then `npx eslint src/pages/observability src/store/observability-slice.js`.
- [ ] **Step 5: Checkpoint: maintainer reviews,** commits.

### Task 9: Observability, refresh after a new chat message (audit B14)

**Files:**
- Modify: `src/pages/observability/observability-page.jsx` (effect dependencies; Refresh button in `obs-header.jsx`)
- Test: `src/pages/observability/observability-page.test.jsx` (new)

Approach: select `s.chat.generating`; the load effect depends on it and reloads when it goes from `true` to `false`. Add a Refresh button (`aria-label="Refresh trace"`) that dispatches `loadObservability(threadId, currentRunId)`.

- [ ] **Step 1: Write the failing test.** Render the page with a mocked client whose `observability` is a `vi.fn`; dispatch `setGenerating(true)` then `setGenerating(false)` from `chat-slice`; expect `observability` called a second time. A second test clicks Refresh and expects another call.
- [ ] **Step 2: Run to verify failure.** `npx vitest run src/pages/observability/observability-page.test.jsx`.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run to verify pass,** then `npx eslint src/pages/observability`.
- [ ] **Step 5: Checkpoint: maintainer reviews,** commits.

### Task 10: Chat, Stop reliability within what the SDK allows (audit B3, B6)

**Files:**
- Modify: `src/store/chat-thunks.js` (`consumeStream` line 319, `stopGeneration` line 369, `fixThread` line 388, `runInvoke` line 453, `executeRun` line 485)
- Test: `src/store/chat-thunks.stop.test.js` (new; the existing `chat-thunks.demo.test.js` shows how to drive thunks with a fake client)

Verified constraint: neither `invoke` nor `stream` in the SDK accepts an `AbortSignal` (`agentflow-client/src/endpoints/stream.ts:300-312`, `invoke.ts:82-94` create their own controller). So the playground cannot cancel the HTTP request; it can stop waiting and ask the server to stop. Full fix is X2.

Behavior to implement:
1. **Stream mode:** when `signal.aborted` is seen in `consumeStream`, read the thread id from that chunk first (`syncThreadId` logic), call `stopGraph(threadId)` if one is known, then break. This covers Stop on the first turn, before the thread id is in the store.
2. **Invoke mode:** race the `client.invoke(...)` promise against an abort promise (listener on `signal`). On abort the turn finishes as "stopped", `generating` becomes `false`, and `stopGraph` is called when the thread id is known. The underlying request keeps running until the server stops it; a new send during that window uses the API's default `on_busy: "wait"` (queues up to 30 s). Note this limit in a code comment.
3. **Errors:** `stopGraph` failure shows `notifyError("Could not stop the run", e)` instead of being swallowed.
4. **Stale guards:** remove `typeof client.stopGraph === "function"`, `typeof client.fixGraph === "function"` and `typeof client.wsStream === "function"` checks; 0.6.0 has all three (verified in `dist/client.d.ts`). `fixThread` success shows `notifySuccess("Thread fixed", ...)`. Unverified: the shape of `FixGraphResponse` (the audit says it returns `removed_count`); read `agentflow-client/src/endpoints/fixGraph.ts` before writing the message, and omit the count if absent.
5. `DemoClient` already implements `stopGraph`, `fixGraph`, `wsStream`; no change needed. Confirm with `src/lib/demo/demo-client.test.js`.

- [ ] **Step 1: Write the failing tests.**
  - `stream: stop before the thread id is known still calls stopGraph once the first chunk carries it`.
  - `invoke: stop resolves the turn as stopped without waiting for the pending request` (fake `invoke` returns a never-resolving promise; dispatch `stopGeneration()`; expect the last agent message `runMeta.status === "stopped"` and `generating === false`).
  - `stopGraph rejection triggers notifyError`.
  - `fixThread reports success`.
- [ ] **Step 2: Run to verify failure.** `npx vitest run src/store/chat-thunks.stop.test.js`.
- [ ] **Step 3: Implement.** Keep `consumeStream` and `runInvoke` under the 100-line `.js` function limit by extracting helpers.
- [ ] **Step 4: Run to verify pass,** then `npx eslint src/store/chat-thunks.js` and `npx vitest run src/store/chat-thunks.demo.test.js` (must still pass).
- [ ] **Step 5: Checkpoint: maintainer reviews** by pressing Stop in both modes against a slow agent. Maintainer commits.

### Task 11: Live, honest badge and correct error handling (audit B7, B10)

**Files:**
- Modify: `src/pages/live/components/live-session.jsx` (`SessionHeader` line 39-44: remove the hardcoded "Gemini Live" `mockTag`; `start` line 207; `session.on("error")` line 247; `teardown` line 199; the stale comment at lines 11-15 that cites `agentflow-api/graph/live.py`)
- Test: `src/pages/live/components/live-session.test.jsx` (new)

Behavior: the model is server-configured (the component's own comment says so), so the header shows "Live" with no vendor name. A `fatal: false` error shows a banner but keeps status `live`; a `fatal: true` error (or `close`) ends the session. `start()` closes any previous session and player first (`sessionReference.current?.close()` then `teardown()`), so Restart never leaks a socket. Verified event shape: `{ type: 'error'; code?; message; fatal: boolean }` (`agentflow-client/src/endpoints/realtime.ts`). Unverified: whether the SDK session object exposes a synchronous `close()`; the audit lists `close` among session methods, confirm in `realtime.ts` before coding.

- [ ] **Step 1: Write the failing tests** with a fake session (an object with `on(event, fn)`, `close: vi.fn()`, `activityStart`, `activityEnd`, and a `emit(event, payload)` helper) returned by a mocked `client.realtime`; mock `@/lib/realtime-audio` (`createPcmPlayer` returns `{ play: vi.fn(), close: vi.fn() }`).
  - `shows no vendor name in the header` (no "Gemini" text).
  - `a non-fatal error keeps the session live and shows the message`.
  - `a fatal error ends the session`.
  - `restart closes the previous session before opening a new one` (`close` called once on the first fake session).
- [ ] **Step 2: Run to verify failure.** `npx vitest run src/pages/live`.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run to verify pass,** then `npx eslint src/pages/live`.
- [ ] **Step 5: Checkpoint: maintainer reviews** with a real Live agent if available (Unverified without one; tests cover the logic), commits.

### Task 12: Sidebar Threads badge populates at startup (audit B14 last item)

**Files:**
- Modify: `src/components/shell/app-shell.jsx` (effect: when `useConnection().isConnected`, dispatch `loadThreadList()` if `threads.listStatus === "idle"`)
- Test: `src/components/shell/sidebar.test.jsx` (new)

Verified: `loadThreadList` is dispatched only in `threads-page.jsx`, and the badge reads `s.threads.list.length` (`sidebar.jsx:16`). `loadThreadList` auto-selects and loads the first thread, so a startup load would also fetch that thread's detail. To avoid the extra two requests, add an option `loadThreadList({ select: false })` and use it here; the Threads page keeps today's behavior.

- [ ] **Step 1: Write the failing test.** Render `AppShell` inside `MemoryRouter` and `Provider` with a mocked connection (`isConnected: true`, `isDemo: false`) and a mocked client returning 3 threads; expect the Threads nav item to show "3" without visiting `/threads`, and `threadState` not called. Second test: in demo mode (`isDemo: true`) the badge shows the recorded count.
- [ ] **Step 2: Run to verify failure.** `npx vitest run src/components/shell/sidebar.test.jsx`.
- [ ] **Step 3: Implement.** Mind `demoSwitched`: it resets every slice, so the effect depends on `isDemo` as well and reloads after a switch.
- [ ] **Step 4: Run to verify pass,** then `npx eslint src/components/shell src/store/threads-slice.js` and the full suite: `npx vitest run`.
- [ ] **Step 5: Checkpoint: maintainer reviews** Sprint 1 as a whole in the running app (including `/demo`), runs `npx eslint .` and `npx vitest run`, then commits.

---

# Sprint 2: Chat human-in-the-loop and real threads

Each sprint below gets expanded to full step detail (tests first, exact commands) just before it starts. This is task level only.

**Depends on:** X1 (playground upgrades to client 1.0.0; needed for `resume`, `interrupt_id`, `on_busy`), API 1.0.0rc1 or later for the same options.

### How interrupts and resume work (verified from code)

- **Pause.** A node or tool calls `interrupt(value, message=, reason=, response_schema=)` (`agentflow/tenxgraph/utils/interrupt.py`). The graph saves state and ends the run. Over `POST /v1/graph/stream` the client receives a chunk with `event: "updates"` and `data: { status: "interrupted", node, step, max_steps, reason, interrupt }`, where `interrupt` is `{ id, key, node, value, message, reason, response_schema, tool_call_id }` (`stream_handler.py:397-420`). The chunk also carries `thread_id` and `run_id`. Over `invoke`, the audit says the pause surfaces as state (`pending_interrupt()`); Unverified what the invoke response body contains for a paused run. Sprint 2 expansion must check `GraphService.invoke` and the invoke response schema before choosing whether Chat supports approval in invoke mode, or only in stream mode.
- **Persisted state.** The pause is saved as `execution_meta.interrupt_reason === "interrupt"`, `interrupt_data.interrupt` holding the same object, status `interrupted_before`. `GET /v1/threads/{id}/state` therefore shows a pending interrupt after a reload (the Chat inspector already prints `interrupted_node`, `interrupt_reason`, `interrupt_data`).
- **Resume.** Send the same thread again with `resume` (any JSON value, may be `null`) and optionally `interrupt_id` (`GraphInputSchema` in `graph_schemas.py:22-76`). No messages are required. With `interrupt_id` set, a mismatch or a thread that is not paused returns 409 before anything runs (`_check_resume_target`). A value that fails the interrupt's `response_schema` returns 422. `resume: null` is a cancel and is never schema-checked. On resume the interrupted node runs again from its start, so code before `interrupt()` runs twice.
- **SDK.** `invoke`, `stream`, `wsStream` accept `resume` and `interrupt_id`, sent on the first request of a call only; the client does not track interrupt ids; new `ConflictError` for 409 (`agentflow-client/CHANGELOG.md`, 1.0.0-rc.1). Not in 0.6.0.
- **Other pause kind.** `interrupt_before` / `interrupt_after` nodes and remote-tool pauses set status `interrupted_before/after` with no `Interrupt` object (`handler_utils.py`). Those resume by running the thread again, not with `resume`. Unverified exact client flow; the expansion step reads `compiled_graph.py` around line 227-300 and decides whether Chat shows a "Continue" action for them. Not in the acceptance criteria below until verified.

### Task 2.1: Interrupt approve, reject and respond in Chat

**Goal:** A run paused by `interrupt()` shows a prompt in the transcript with actions, and answering it continues the same turn.
**Files likely touched:** `src/store/chat-thunks.js` (detect the interrupted `updates` chunk in `consumeStream`; new thunk `resumeRun({ value, interruptId })`), `src/store/chat-slice.js` (`pendingInterrupt` on the active turn; `finishAgentTurn` runMeta status `"interrupted"`), new `src/pages/chat/components/interrupt-card.jsx` (message, `value` preview, Approve / Reject buttons, and a JSON form when `response_schema` is present), `src/pages/chat/components/composer.jsx` (lock free text while an interrupt is pending), `package.json` (client dependency, X1), `src/lib/demo/demo-client.js` and fixture (one recorded interrupt scenario is optional; at minimum `stream` must tolerate a `resume` option).
**Acceptance (observable):**
- A streamed run that pauses ends as "needs input", not "done" and not "(no text returned)", and shows the interrupt's `message`.
- Approve sends `resume: <schema-valid approval value>` with `interrupt_id`; Reject sends `resume: null`; both continue streaming into the same thread. Which value "Approve" sends comes from `response_schema` (for example `{ "approved": true }`); when there is no schema, a free JSON editor is shown instead of fixed buttons.
- A 409 or 422 shows the server's message in the card; the card stays open.
- Reloading the page and reopening the thread still offers the pending interrupt (read from `threadState`).
**Tests to add:** thunk test with a fake stream that yields an interrupted chunk, then a resume that yields a final message; card renders each schema variant; 409 keeps the card open; composer locked while pending.
**Cross-package:** X1 blocker (client 1.0.0). Needs API with `resume` (1.0.0rc1 has it).

### Task 2.2: Server-backed Chat thread picker; "Open in Chat" from Threads

**Goal:** Chat lists threads from the server, loads history on switch, and Threads can open a thread in Chat.
**Files likely touched:** `src/pages/chat/components/chat-header.jsx` (`ThreadPicker`, lines 36-137), `src/store/chat-slice.js` and `src/store/threads-cache.js` (cache becomes a fast path, server is the source of truth), `src/store/chat-thunks.js` (new `openServerThread(id)` using `threads()`, `threadMessages()`), `src/pages/threads/threads-page.jsx` (button "Open in Chat" with `useNavigate`), `src/lib/messageContent.js` (map stored messages to Chat blocks; Threads already renders them with `Trace`, `ReasoningStep`, `ToolStep`).
**Acceptance:**
- The picker shows server threads (name, short id, updated) and can search.
- Choosing one loads its messages into Chat; sending continues that thread with the server id (works under the 1.0 default `runs.thread_ids: "server"` because the id is server-assigned and owned by the caller).
- Deleting a thread in Threads removes it from the Chat picker; if it was the active Chat thread, Chat starts a clean draft (audit B4).
- "Open in Chat" from Threads lands on `/chat` with that thread active.
- "Remove from cache" is relabeled so it is clear it does not delete on the server.
**Tests to add:** thunk loads history and sets `threadId`; deleting the active thread resets Chat; Threads button navigates; demo mode serves the recorded threads.
**Cross-package:** none.

### Task 2.3: Threads list and messages paging and search within API support

**Goal:** More than 100 threads are reachable; the count is honest.
**Verified facts:** `GET /v1/threads` takes `search`, `offset`, `limit` (default 100, max 1000; `checkpointer/router.py:456`, `_clamp_limit`). `threads()` and `threadMessages()` accept the same in SDK 0.6.0 (`ThreadsRequest { search?, offset?, limit? }`). The response has no total or `has_more`; "more may exist" is inferred when the page came back full.
**Files likely touched:** `src/store/threads-slice.js` (`loadThreadList({ search, offset })`, `loadMoreThreads`), `src/pages/threads/components/thread-list.jsx` (server search box with debounce, "Load more" button, replace "N readable" with "N loaded" plus "more available" when the last page was full), message paging in `messages-pane.jsx`, per-message delete confirm (audit B2 tail), `ago()` deduplicated into `src/lib/` (audit B11).
**Acceptance:** typing in search issues a server search (not only a client filter); "Load more" appends the next page; the label never claims a total the API did not give; message list loads in pages for long threads.
**Tests to add:** slice appends pages; full page shows "Load more", short page hides it; search resets offset.
**Cross-package:** X8 (enhancement: total count in the list response).

### Task 2.4: Client tools persist across reloads; `remote_tool_call` visible in the transcript

**Goal:** Browser-owned tools keep working after a reload or client rebuild, and their calls show in Chat.
**Verified facts:** handlers are registered only from the Tools editor (`client-editor.jsx:236` calls `registerClientTools({ only })`); the tool records persist in localStorage with `registered: true` (`tools-slice.js`), but `getTenxGraphClient()` builds a new client when the connection config changes (`lib/tenxgraph-client.js:94-101`), dropping handlers. Chat's `BLOCK_BUILDERS` (`chat-thunks.js:156`) handles `reasoning`, `tool_call`, `tool_result` only.
**Files likely touched:** `src/lib/tenxgraph-client.js` (after constructing a client, re-register persisted tools with `registered: true`; keep demo mode untouched, `DemoClient.registerToolHandler` is a no-op), `src/store/tools-slice.js` (`registerClientTools` reused), `src/store/chat-thunks.js` (add a `remote_tool_call` builder: tool name, arguments, "ran in your browser"), `src/pages/chat/components/` (render via the existing `ToolStep`).
**Acceptance:** register a tool, reload, send a prompt that calls it: the call runs and appears in the transcript with arguments and result; changing the active connection and back keeps it working.
**Tests to add:** a new client instance gets handlers re-registered; a `remote_tool_call` block becomes a tool step.
**Unverified:** the exact `remote_tool_call` block shape in streamed chunks; the expansion reads `agentflow-client/src/tools.ts` and the API remote-tool path (`graph_service.py` around line 673).
**Cross-package:** none.

---

# Sprint 3: Observability and Evals that explain themselves

**Depends on:** X4 and X5 for the API-side items; the rest is playground-only.

### Task 3.1: Rename and explain Observability

**Goal:** A user can tell what the page is without reading the audit.
**Files likely touched:** `src/lib/nav.js` (label `Run trace`), `src/pages/observability/components/obs-header.jsx` (title `Run trace`, subtitle: "What the graph did on a run of this thread: node timing, LLM and tool calls, token use. Kept in server memory; cleared when the server restarts."), `src/pages/observability/observability-page.jsx`, demo callouts (`src/lib/demo/callouts.js`) if they name the page.
**Acceptance:** nav, page title and subtitle use "Run trace"; the route stays `/observability`; jargon stats ("iterations", "spans") get a tooltip each.
**Tests:** header renders title and subtitle; nav item label.
**Decision for the maintainer (see Open decisions):** fold this into Threads as a "Trace" tab instead, since both are thread-scoped. Recommendation: keep the page now, add the tab in Task 3.2 as a link rather than a move, and decide after seeing usage.

### Task 3.2: Thread picker on the trace page; cross-links with Threads

**Goal:** The trace page no longer depends on whichever thread Chat has open.
**Files likely touched:** `src/pages/observability/observability-page.jsx` (thread selector fed by the threads list), `src/pages/threads/threads-page.jsx` (a "View trace" button navigating to `/observability?thread=<id>`), `src/pages/observability/components/obs-header.jsx` ("Open thread state" link back), routing read of the query string.
**Acceptance:** opening the trace from a thread shows that thread's latest run; choosing another thread in the selector loads it; the link back selects the thread in Threads.
**Tests:** query param drives the load; selector change loads.
**Cross-package:** none.

### Task 3.3: Node span per visit for loops (stopgap, then API)

**Goal:** A ReAct loop shows each node visit as its own bar.
**Verified:** the API collapses visits (see Audit corrections). Playground stopgap: in `transform.js`, derive visits from `run.events` (each has `node`, `offset_ms`): a visit is a maximal run of consecutive events with the same node; start is the first event's offset, end the last's. LLM and tool child spans attach to the visit whose window contains their `start_ms`.
**Files likely touched:** `src/pages/observability/transform.js` (new `visitsFromEvents`), `trace-timeline.jsx`, `cost-pane.jsx` (by-node table counts visits).
**Acceptance:** a graph that runs `MAIN -> TOOL -> MAIN` shows three bars, not two; `iterations` shown equals visits.
**Tests:** transform unit tests with a recorded loop fixture (add one to the demo fixture if the recording contains a loop; otherwise a synthetic events array in the test).
**Cross-package:** X4 (the real fix; remove the stopgap when it ships). Unverified: whether event offsets are fine-grained enough on non-streaming (`invoke`) runs.

### Task 3.4: Evals, thresholds, Expected, criterion details, errored cases, refresh

**Goal:** The Evals page shows what the report contains and nothing invented.
**Files likely touched:** `src/pages/evals/components/case-detail.jsx` (Expected box, rubric rows with threshold, details and error), `drilldown.jsx` (an "error" status with its own color, separate from "fail"; case error text), `run-list.jsx` / `evals-page.jsx` (Refresh button re-dispatching `loadEvalRuns()`), `src/lib/demo/test-fixture.js` and the demo fixture (add an errored case and criterion details so demo mode shows them; the real fixture is re-recorded by `demo/record.mjs`, never hand-edited, per the demo-mode plan), React key at `case-detail.jsx:47` (audit B15: include the index).
**Acceptance:**
- A case that raised an exception shows an "error" badge and its error text; the run's failed count separates failures from errors.
- Each rubric row shows its own threshold and, when present, details text.
- "Expected" shows the expected trajectory, node order or criterion description when the report has it, and is hidden otherwise (no more "-").
- Refresh re-reads the report list.
**Tests:** components render each case status; Expected hidden when absent; Refresh calls the loader.
**Cross-package:** X5 blocker for error, details and thresholds per criterion; X9 enhancement for an expected-value field. Without X5, only Refresh and the React key can ship.

---

# Sprint 4: Files and memory authoring

**Depends on:** X6 for honest memory search (blocker for the filter wiring unless the playground always sends an explicit `memory_type`); X3 only for a real file browser (not needed for the lab).

### Verified Files facts

Endpoints (`routers/media/router.py`): `POST /v1/files/upload` (multipart; errors 400 filename required or empty file, 415 content type not allowed or content does not match, 413 too large), `GET /v1/files/{id}` (binary), `GET /v1/files/{id}/info`, `GET /v1/files/{id}/url` (signed direct URL with expiry), `DELETE /v1/files/{id}` (owner only), `GET /v1/config/multimodal`. SDK 0.6.0 has `uploadFile`, `getFile` (Blob), `getFileInfo`, `getFileAccessUrl`, `getMultimodalConfig`. `deleteFile` is in the repo's 1.0.0-rc.1 client but not in 0.6.0 (`dist` has no `deleteFile`), so deleting from the lab needs X1. There is no list endpoint (X3). Today `/files` is a `Placeholder` route (`App.jsx`) and the nav item has badge "Soon" (`lib/nav.js`). `lib/multimodal.js` reads a Redux store key that does not exist in this app's store (`ct.store.MULTIMODAL_STORE`), so it is effectively dead; the lab replaces it.

### Task 4.1: Files lab page

**Goal:** Upload, inspect, preview, delete and look up files using only existing endpoints.
**Files likely touched:** new `src/pages/files/files-page.jsx`, `src/pages/files/components/` (`upload-zone.jsx`, `file-card.jsx`, `preview.jsx`, `recent-list.jsx`, `config-header.jsx`), `src/store/files-slice.js` (new, with a session-local recent list in `localStorage` key `10xgraph.files.recent`, never read or written in demo mode), `src/App.jsx` (replace the `Placeholder` route), `src/lib/nav.js` (remove `badge: "Soon"`), `src/lib/demo/demo-client.js` (implement `uploadFile`, `getFile`, `getFileInfo`, `getMultimodalConfig`, `deleteFile` against the fixture, or keep them throwing a clear "Files are not part of the recorded demo" and hide the page's actions in demo; today `getFileAccessUrl` throws `notFound("Files")`).
**Acceptance:**
- Header shows storage type, max size (MB) and document handling from `getMultimodalConfig`.
- Drop or pick a file: progress state, then a result card with `file_id`, mime type, size, extracted-text preview and the direct URL with its expiry.
- Errors map to plain text: 413 "File is larger than N MB", 415 "This file type is not allowed", 400 "Empty file or missing name"; anything else shows the server message through `ErrorNote`.
- Preview by MIME: image inline, audio and video with controls, PDF in an embed, text in a code block; others show metadata only.
- Lookup by `file_id`; session-local recent list so uploads can be found again (there is no server list); copy `file_id`; delete with a two-step confirm (after X1).
**Tests:** slice maps each status code to its message; card renders each MIME class; recent list persists and is skipped in demo; page shows the multimodal header.
**Cross-package:** X1 for delete; X3 enhancement for a real browser.

### Task 4.2: Memory create and edit

**Goal:** Seed and correct memories from the UI.
**Verified:** `POST /v1/store/memories` (content, memory_type, category, metadata; `storeMemory`), `PUT /v1/store/memories/{id}` (content, metadata; `updateMemory`), `POST /v1/store/memories/{id}` (single get; `getMemory`). All three exist in SDK 0.6.0 (`dist/client.d.ts`).
**Files likely touched:** new `src/pages/memory/components/memory-form.jsx` (type select over the 7 `MemoryType` values already in `memory-page.jsx`, category, content, metadata JSON with validation), `src/store/memory-slice.js` (`createMemory`, `editMemory`), `memory-detail.jsx` (Edit button), `memory-list.jsx` (New memory button), `src/lib/demo/demo-client.js` (`storeMemory`, `updateMemory` mutate the in-tab copy).
**Acceptance:** create adds a row that appears in Browse; edit changes content and metadata; invalid metadata JSON blocks submit with an inline message; failures use the shared pattern.
**Tests:** thunks call the client with the form values; form validation; demo client mutates its copy and nothing else.

### Task 4.3: Server-side search filters wired to the facets

**Goal:** Type, category and score threshold are real search parameters.
**Verified:** `SearchMemorySchema` accepts `memory_type`, `category`, `score_threshold`, `filters`, `max_tokens`, `limit` (`store_schemas.py`); `forget` accepts `memory_type`, `category`, `filters`. See X6 for the SDK default of `episodic`.
**Files likely touched:** `src/store/memory-slice.js` (`searchMemories` sends the selected type, category, threshold and a limit control), `memory-page.jsx` and `facets-column.jsx` (facets apply in Search mode; "All types" must send an explicit value or wait for X6), `memory-list.jsx` (remove the Task 4 honesty line; hide score bars when Search mode has no query), a "limit reached" hint on Browse (list is capped at the requested `limit`, max 1000; there is no offset), `forgetMemories({ memory_type, category })` as the bulk action when a facet is active.
**Acceptance:** selecting a type and category changes the request body (visible in the Inspector frames) and the results; leaving all types selected searches all types; the Browse header says when the cap was reached.
**Tests:** request body assertions per facet combination; score bars hidden without a query.
**Cross-package:** X6.

---

# Sprint 5: Live and transports

**Depends on:** client and API 1.0.0 release for the WebSocket un-gate; X10 for typed Live options if the maintainer wants them.

### Task 5.1: Live event coverage

**Goal:** Handle every event the session can send.
**Verified events** (`agentflow-client/src/endpoints/realtime.ts`): `input_transcript`, `output_transcript`, `tool_call {id,name,args}`, `tool_result {id,result}`, `turn_complete`, `interrupted`, `session_update {resumption_handle}`, `go_away {time_left}`, `agent_changed {author}`, `error {fatal}`. Only open, audio, the two transcripts, error and close are bound today.
**Files likely touched:** `src/pages/live/components/live-session.jsx` (or split into `live-events.js` to stay under the function-length limits), `src/lib/realtime-audio.js` (player gets `flush()`: stop queued buffers and reset `nextTime`), `live.module.css`.
**Acceptance:** on `interrupted` queued audio stops at once (barge-in); `tool_call` and `tool_result` show as step rows in the transcript; `turn_complete` closes the open bubbles; `go_away` shows a banner with the time left; `agent_changed` shows the new agent name; `session_update` stores the resumption handle for Task 5.2.
**Tests:** fake-session tests per event; player `flush` unit test.

### Task 5.2: Typed input and session options

**Goal:** Type to a live agent; choose voice and VAD when the server allows.
**Verified:** the session API has `sendText`; init accepts `model`, `thread_id`, `voice`, `modalities`, `vad`, `system_prompt`, `tools_tags`. On the server, `model` and `tools_tags` are honored only within limits, and `voice`, `vad`, `system_prompt` are applied only if listed in `websocket.realtime_client_overrides` (`graph_service.py:1145-1171`); otherwise they are ignored. The playground cannot tell which are allowed. Unverified: whether `/v1/graph` or ping exposes `realtime_client_overrides`; the expansion checks, and if it does not, the options panel states that the server may ignore them (X10).
**Files likely touched:** `live-session.jsx` (text input row calling `sendText`), new `src/pages/live/components/live-options.jsx` (voice, modality, VAD sensitivity and silence, system prompt, behind an "Advanced" disclosure), a link from the ended session to its thread in `/threads` (the session `thread_id` is generated server side; Unverified where the client reads it, likely `session_update` or the init ack).
**Acceptance:** typed text produces an agent reply; changed options appear in the init frame; when the server ignores one, the UI says options are best effort.
**Tests:** `sendText` called with the typed value; options map to the init object.
**Cross-package:** X10 enhancement.

### Task 5.3: Un-gate WebSocket chat mode (gated on the 1.0.0 release)

**Goal:** `ws` is a normal transport once the 1.0.0 packages ship.
**Verified current state:** `MODES` in `chat-header.jsx:20-24` has `{ id: "ws", soon: true }`; `setMode` in `chat-slice.js` ignores `"ws"`; the thunk path exists (`executeRun` calls `client.wsStream`). The demo-mode plan said ws stays "coming soon" until the next release. That release is 1.0.0 for all three packages. The API is at 1.0.0rc1 today.
**Steps (expansion):** first, before touching the gate, run a WebSocket chat against `10xgraph-api` 1.0.0rc1 with client 1.0.0-rc.1 and record what works (fresh turn, stream, tool round trip, resume with `interrupt_id`, Stop). Only after that passes, flip `soon` to `false`, remove the `setMode` guard, and delete the stale comment. Keep `DemoClient.wsStream` throwing, and keep ws disabled in demo with the existing "Live servers only" style title.
**Acceptance:** after the 1.0.0 release and a passing manual run: ws mode is selectable on a live server, streams a reply, and Stop and interrupt resume behave as in stream mode; in demo it is disabled with a reason.
**Tests:** `setMode("ws")` accepted; header renders ws enabled on a live server and disabled in demo.
**Cross-package:** X1 (client 1.0.0), and API 1.0.0 released. Unverified: WS behavior under the API's 1.0 default `thread_ids: "server"`; the client changelog says `wsStream()` tracks the returned id itself.

### Task 5.4: Chat attachments (only if Task 4.1 landed and it is cheap)

**Goal:** Attach a file to a chat message.
**Files likely touched:** `src/pages/chat/components/composer.jsx` (attach button, chips), `src/store/chat-thunks.js` (`Message.text_message` becomes a message with a media block; the SDK exposes helpers such as `Message.withImage` per the `uploadFile` docs in `client.ts`; Unverified exact helper names for documents), `src/lib/media-resolver.js` (already resolves `file_id` blocks for display), `files-slice.js` (reuse upload and error mapping from Task 4.1).
**Acceptance:** attaching an image uploads it, shows a chip, sends it with the message, and the transcript shows it; limits come from `getMultimodalConfig`; disabled in demo.
**Tests:** upload then send builds a message with a `file_id` block; oversize file shows the mapped error.
**Cross-package:** none beyond X1 if `deleteFile` is used for chip removal.

---

# Cross-package track

Items that need a change in `agentflow-api` or `agentflow-client`. All three packages release the next feature set as 1.0.0 together (major.minor identical, patch independent), so these items ride the 1.0.0 train unless the maintainer defers them to 1.1.0. Each claim below was checked in the code; the check is noted.

| ID | Package | What to add | Unblocks | Type |
|---|---|---|---|---|
| X1 | client (release) | Release `10xgraph-client` 1.0.0 and bump the playground dependency from `^0.6.0` to `^1.0.0`. 1.0.0-rc.1 (repo, `CHANGELOG.md`) adds `resume`, `interrupt_id`, `on_busy`, `ConflictError`, `deleteFile`, `updateThreadMessageFeedback`; installed 0.6.0 has none of them (checked in `node_modules/10xgraph-client/dist`). Until then `npm install 10xgraph-client@next` is possible for local work (the changelog says rc.1 is published under the `next` tag). | Tasks 2.1, 4.1 (delete), 5.3, `on_busy` toggle | Blocker |
| X2 | client | Optional `signal?: AbortSignal` on `invoke()`, `stream()` and `wsStream()` options, linked to the internal controller (`endpoints/stream.ts:300-312`, `endpoints/invoke.ts:82-94` create their own and expose nothing). | A real Stop in Task 10 (cancels the request, not only the wait) | Enhancement (Task 10 works around it) |
| X3 | api + client | `GET /v1/files` (owner-filtered, cursor paging) and `listFiles()` in the SDK. Checked: `routers/media/router.py` has upload, get, info, url, delete, multimodal config and no list route. Unverified: whether `MediaStore` records the owner in a way that supports listing (`ensure_can_access` uses user id, so likely). | A real file browser in Task 4.1 | Enhancement |
| X4 | api | In `_reconstruct_run` (`graph_service.py`, around line 1384) key node spans by visit, not by node name, and count `iterations` as visits. Record real durations: for tool spans, the delta between `tool_call` and `tool_result` timestamps; for LLM spans, the delta from the preceding record. Today llm and tool spans get `duration_ms=0.0` (lines around 1393 and 1412), so the waterfall draws a fixed 1.5% sliver (`transform.js:70`). | Task 3.3 (remove stopgap), meaningful waterfall | Enhancement |
| X5 | api | In `eval_report_service.py`: add `error` and a distinct status (`error` vs `fail`) to `_build_case_view`; add `threshold`, `details`, `error` to each `_case_rubric` row; keep `error_cases` separate in `_build_stats` (line 165 sums them into failed). The core fields exist (`CriterionResult.details/error/threshold`, `EvalCaseResult.error` in `tenxgraph/qa/evaluation/eval_result.py`). | Task 3.4 | Blocker for that task |
| X6 | client | In `searchMemory`, do not default `memory_type` to `episodic`, `category` to `""` or `score_threshold` to `0`; omit unset fields so the server treats them as no filter (`SearchMemorySchema` makes all three optional). Checked in both the repo source and the installed 0.6.0 build. | Honest Search in Task 4.3; today the Search tab is episodic-only | Blocker for Task 4.3 unless the playground always sends an explicit type |
| X7 | api | Add an `enabled: boolean` (or `reason`) field to `ObservabilitySchema` so the UI can say "tracing is off in production" instead of guessing. Checked: `get_observability` returns the same empty payload for no store and no runs. | Exact empty state in Task 8 | Enhancement |
| X8 | api + client | Return a `total` (or `has_more`) in `GET /v1/threads` and the messages list. Checked: `ThreadsListResponseSchema(threads=[...])` carries no count. | Exact counts in Task 2.3 | Enhancement |
| X9 | api | Include an `expected` summary per eval case in the report view (expected trajectory, node order, criterion descriptions) where `EvalCase` has them. Checked: `_build_case_view` hardcodes `"expected": "—"`. | Expected column in Task 3.4 | Enhancement |
| X10 | api | Expose which Live init options the server honors (the `websocket.realtime_client_overrides` and `realtime_models` lists) via `GET /v1/graph` or ping. Checked: `_realtime_overrides` drops options not listed (`graph_service.py:1145-1171`); a client cannot discover the list. | Task 5.2 options panel | Enhancement |
| X11 | client | Add eval and observability-adjacent methods: `evalRuns()` and `evalRun(id)` wrapping `GET /v1/evals/runs` and `/v1/evals/runs/{id}`, so the playground drops its raw `fetch` and hand-copied `evalHeaders` in `store/evals-slice.js` (lines 69-79). Checked: no eval endpoint in `agentflow-client/src` (`observability()` already exists at `client.ts:311`). Note the evals routes are unauthenticated by design (`evals/router.py` comment, public allowlist in `route_guard.py`), so there is no auth to copy. | Cleanup in Sprint 3 (not a blocker) | Enhancement |
| X12 | api | Record the model name in `_telemetry_record` (`graph_service.py:485-531`). `_reconstruct_run` reads `rec.get("model")` but the record never sets it, so `gen_ai.request.model` is always empty and the by-model cost table has a single "-" row. Unverified: where the model name is available on a `StreamChunk` (`message.metadata`? `usages`?); read the core streaming path before deciding. | Model column in the trace and cost panes (Task 8 shows "-" until then) | Enhancement |

Note on X11 and the audit: the audit says the playground "hand-copied auth-header builder can drift from the SDK's"; because the evals routes are unauthenticated, the practical risk is smaller than stated. The SDK method is still the right cleanup.

---

# Out of scope / not gaps

- **Thread rename.** No endpoint. The checkpointer router has no PUT on `/v1/threads/{id}`.
- **Message edit.** The API supports feedback only (`PUT /v1/threads/{id}/messages/{message_id}` replaces `metadata.feedback`), not content edit. Feedback UI is optional and not scheduled.
- **Checkpoint history, time travel, fork.** No API endpoint or SDK method. Would be a core feature first.
- **Memory pagination beyond `limit`.** The list endpoint has `limit` only (max 1000), no offset or cursor. Sprint 4 shows a "limit reached" hint instead.
- **Memory namespaces.** No such concept in the store API; scope is the authenticated user plus the developer-set collection.
- **Running evals from the UI, eval set authoring.** Only the CLI runs evals; there is no POST route. A large feature, not planned.
- **Logfire, LangSmith, OTEL status in the trace header.** Removed in Task 7. Showing real status needs a server endpoint that exposes the `observability` block of `10xgraph.json`; not planned.
- **Trace export (JSON/OTLP), tool arguments and results in span detail.** The telemetry store flattens chunks to nine fields (`_telemetry_record`); richer detail needs an API change. Not planned.
- **Evals auth.** Unauthenticated by design for local report files (audit B16 notes the comment). Not a playground change.
- **Analytics event naming (`thread_deleted` shared by Chat and Threads, audit B13).** Cosmetic; folded into Task 2.2 only if it costs nothing.

# Decisions (maintainer, 2026-10-28)

1. **Observability becomes "Run trace", modeled on LangSmith.** A run tree (run > node visits > LLM and tool calls) where each span shows inputs, outputs, latency, tokens, cost and metadata. Keep it a separate page if that works well; otherwise make it a "Run trace" tab in the Threads inspector next to raw JSON. Sprint 3 Tasks 3.1 to 3.3 are rescoped to this, and X4 and X12 (real durations, model name, span per visit) are required, not optional.
2. **All cross-package items (X1 to X12) land in 1.0.0.** The packages are at 1.0.0 release candidates and 1.0.0 ships this week. Build against the RCs (`10xgraph-client@1.0.0-rc.1`, `10xgraph-api` 1.0.0rc1); do not wait for the final release.
3. **Memory exposes everything the API supports.** Fix X6 (SDK `searchMemory` defaults) instead of adding an "episodic only" note.
4. **Human-in-the-loop ships for stream mode now.** Approve, reject and resume in Chat for streaming runs; invoke mode follows when it is verified, without blocking.
5. **Files page appears in demo mode.** Re-record the demo with a small upload.
6. **WebSocket un-gate does not wait for the final release.** Do it against the RCs.
7. **Target: everything this week.**
