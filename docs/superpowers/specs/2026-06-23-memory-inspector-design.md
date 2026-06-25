# Agent Memory Inspector — Design

Date: 2026-06-23
Package: `agentflow-playground`

## Problem

The playground's "View Memory" panel ([src/components/layout/sheets/view-memory-sheet.jsx](../../../src/components/layout/sheets/view-memory-sheet.jsx))
shows hardcoded fake data ("Used: 45.2 MB", "Active Components: 12"). It does not
touch the agent memory store at all. Meanwhile the client SDK
(`@10xscale/agentflow-client`) exposes the full memory store API, so a developer
building a memory-backed agent has no way to see, search, or manipulate what their
agent remembered.

## Goal

Replace the fake panel with a real Agent Memory Inspector: a dedicated page where a
developer can browse, search, inspect, create, edit, delete, and bulk-forget memories
against their configured backend, scoped either globally or to the active thread.

## Decisions (confirmed)

- **Scope of features:** Full CRUD + search (list, search with filters, view, store, edit, delete, bulk-forget).
- **Thread scoping:** Toggle between "All" and "Current thread".
- **Placement:** New full-screen route (`/memory`), not an overlay sheet.
- **Entry point:** Reuse the existing header "View Memory" button (relabeled "Memory") to navigate to `/memory`; highlight it when the route is active; provide a "Back to chat" affordance on the page.
- **Page layout:** Master–detail (list on the left, detail + inline edit on the right).

## Client API surface used

All methods exist on `AgentFlowClient` and return `{ data, metadata }`:

- `listMemories({ config, options, limit })` → `{ data: { memories: MemoryResult[] } }`
- `searchMemory({ query, memory_type?, category?, limit?, score_threshold?, filters?, retrieval_strategy?, distance_metric?, config?, options? })` → `{ data: { results: MemoryResult[] } }`
- `storeMemory({ content, memory_type, category, metadata?, config?, options? })` → `{ data: { memory_id } }`
- `updateMemory(memoryId, content, { metadata?, config?, options? })`
- `deleteMemory(memoryId, { config?, options? })`
- `forgetMemories({ memory_type?, category?, filters?, config?, options? })` → `{ data: { success } }`

`MemoryResult` = `{ id, content, score, memory_type, metadata, vector: number[], user_id, thread_id, timestamp }`.

Enums imported from the client (single source of truth): `MemoryType`
(episodic, semantic, procedural, entity, relationship, custom, declarative),
`RetrievalStrategy` (similarity, temporal, relevance, hybrid, graph_traversal),
`DistanceMetric` (cosine, euclidean, dot_product, manhattan).

## Architecture (follows existing playground patterns)

### Routing
- Add `MEMORY: "/memory"` to [src/lib/constants/route.constant.js](../../../src/lib/constants/route.constant.js).
- Add `{ path: ct.route.MEMORY, element: <MemoryPage /> }` to [src/route/main.routes.jsx](../../../src/route/main.routes.jsx).
  Renders inside the existing `MainLayout` `Outlet`, so sidebar + header persist.

### API service
- New `src/services/api/memory.api.js`. One thin wrapper per client method, each
  returning `{ data, status: 200 }`, mirroring [src/services/api/state.api.js](../../../src/services/api/state.api.js).

### State (Redux)
- New `src/services/store/slices/memory.slice.js` using `createAsyncThunk`.
- Add `MEMORY_STORE: "memoryStore"` to [src/lib/constants/redux.constant.js](../../../src/lib/constants/redux.constant.js)
  and register the reducer in [src/services/store/reducers.js](../../../src/services/store/reducers.js).
- **Excluded from redux-persist** so server-fetched memories are not cached stale across
  reloads. Implemented via a `createTransform` in [src/services/store/index.js](../../../src/services/store/index.js)
  that blanks the memory store on persist (same mechanism already used to strip
  non-serializable chat fields).
- Slice state (shape):
  ```
  {
    mode: "browse" | "search",
    scope: "all" | "thread",
    items: MemoryResult[],
    selectedId: string | null,
    search: { query, memory_type, category, retrieval_strategy, distance_metric, limit, score_threshold, filters },
    status: "idle" | "loading" | "succeeded" | "failed",
    error: string | null,
    mutationStatus: "idle" | "saving" | "deleting"
  }
  ```
- Thunks: `loadMemories` (browse), `searchMemories`, `createMemory`, `editMemory`,
  `removeMemory`, `forgetMemories`. Each builds `config` from scope (see below),
  calls the api service, and updates state; failures store `error` and surface a toast.

### Navigation changes
- In [src/components/layout/main-layout.jsx](../../../src/components/layout/main-layout.jsx):
  the "View Memory" dev-tools button (label → "Memory") calls `navigate(ct.route.MEMORY)`
  instead of `onSheetOpen("memory")`; it is active-highlighted when the current route is
  `/memory` (via `useLocation`/`useMatch`).
- Remove `view-memory-sheet.jsx`, its import, the `activeSheet === "memory"` rendering,
  and the `"memory"` sheet branch.

## UI / behavior

`MemoryPage` (master–detail) composed of small focused components:

- `MemoryToolbar` — Browse/Search segmented control; scope toggle (All / Current thread,
  the latter disabled with a tooltip when no thread is active); "Add Memory" button;
  "Forget" (bulk) button; "Back to chat" link.
- `MemorySearchControls` (Search mode only) — query input, `memory_type` select,
  `retrieval_strategy` select, `category` input, `limit`, `score_threshold`; an "Advanced"
  collapsible holds `distance_metric` and raw `filters` JSON.
- `MemoryList` — rows showing content snippet, `memory_type` badge, category, similarity
  score (Search mode), timestamp. Click selects a row.
- `MemoryDetail` — full content, type, category, metadata (formatted JSON), `user_id`,
  `thread_id`, `timestamp`, and the embedding `vector` collapsed by default (shows
  dimension count, expandable). Actions: Edit, Delete (with confirm).
- `MemoryForm` — used for Add and Edit: content (textarea), `memory_type` (select),
  category (text), metadata (JSON editor with validation). Add → `createMemory`
  (`storeMemory`). Edit → `editMemory` (`updateMemory(id, content, { metadata })`); in
  Edit mode `memory_type` and `category` are shown read-only, since `updateMemory` only
  accepts content + metadata.
- `ForgetDialog` — confirm bulk delete by `memory_type` / `category` / `filters`.

States: backend-not-configured guard (reuse the existing pattern used by other dev
tools / `isBackendConfigured`); loading skeleton; empty state; error toast via the
existing `useToast`.

## Scoping data flow

The scope toggle determines the `config` passed to every memory call:

- **All** → `config: {}` (store decides defaults; `user_id` resolved server-side from auth).
- **Current thread** → `config: { thread_id }` using the active thread id from `chatStore`.
  Disabled when no thread is selected.

Open question carried into implementation: if the memory store also keys on a `user_id`
that is not derived from auth, it must be threaded into `config`. Default assumption:
`user_id` comes from auth server-side and only `thread_id` is needed client-side.

## Error handling

- Thunks wrap api calls in try/catch, store a human-readable `error`, and dispatch a
  destructive toast.
- JSON editors (metadata, filters) validate before submit; invalid JSON blocks the action
  with an inline message.
- Backend/auth failures (e.g. 401) surface the client error message in the toast.

## Testing (vitest, existing patterns)

- `memory.api.test.js` — mock `@/lib/agentflow-client`; assert each wrapper maps to the
  correct client method with the expected arguments and returns `{ data, status }`.
- `memory.slice.test.js` — reducers + each thunk's fulfilled/rejected paths with a mocked
  api service; verify `config` is built correctly from scope.
- `memory-page.test.jsx` — render the page (mock the api service): list renders, switching
  Browse/Search triggers the right thunk, scope toggle disabled without a thread, add/edit
  form submits, delete confirms and calls `removeMemory`.

## Out of scope (YAGNI)

- Pagination beyond a `limit` control (no infinite scroll).
- Visualizing embedding vectors beyond raw expandable values.
- Editing `memory_type`/`category` on an existing memory (the update path covers content +
  metadata, matching the client's `updateMemory` signature).
