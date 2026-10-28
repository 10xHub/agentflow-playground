# Threads paging, Files list, Live options (API contract, X8 / X3 / X10)

Status: FINAL, implemented in agentflow-api (2026-10-28). Covered by tests/unit_tests/test_threads_files_live_contract.py. All additions are
backwards compatible: existing fields stay, new fields are added. Responses keep the usual
envelope `{ "data": ..., "metadata": {...} }`; the shapes below are the `data` part.

## X8: paging info on thread lists

Decision: `has_more`, not `total`. No checkpointer backend (in-memory, SQLite, Postgres) exposes a
count, and a COUNT per list call is not honest to add everywhere. `has_more` is computed
exactly: when a page comes back full, the server asks the backend for one more row at
`offset + limit`.

`GET /v1/threads?search=&offset=0&limit=100`

```json
{ "threads": [ { "thread_id": "...", "thread_name": "..." } ],
  "has_more": true, "offset": 0, "limit": 100 }
```

`GET /v1/threads/{thread_id}/messages?search=&offset=0&limit=100`

```json
{ "messages": [ ... ], "has_more": false, "offset": 0, "limit": 100 }
```

`offset` / `limit` echo the values applied (limit after the server default 100 / max 1000 clamp).
Next page: `offset + threads.length`.

## X3: GET /v1/files

`GET /v1/files?limit=50&offset=0` (permission `files:read`). Only files whose recorded
`owner_id` equals the caller are returned. Files without an owner are never listed (even in dev
mode where direct access is allowed). With authentication off there is no user id, so, like
`GET /v1/files/{id}`, every file is listed. Sorted newest first by `created_at` (files uploaded
before this change have `created_at: null` and sort last, by file id). Default `limit` 50, max
200 (422 above), `offset` >= 0. The server reads each file's metadata per call, so cost grows
with the number of stored files.

```json
{ "files": [ { "file_id": "ab12...", "filename": "cv.pdf", "mime_type": "application/pdf",
               "size_bytes": 12345, "url": "/v1/files/ab12...", "created_at": 1761600000 } ],
  "has_more": false, "offset": 0, "limit": 50 }
```

`created_at` is unix seconds recorded at upload, or `null` for older files. A store that cannot
enumerate its files answers `501` (`The configured media store cannot list files`): today the
cloud store, and any core older than the `BaseMediaStore.list_keys()` addition (10xgraph 1.0).
Memory and local stores work. Core change: `list_keys()` added to `BaseMediaStore`,
`InMemoryMediaStore`, `LocalFileMediaStore` (the running dev server uses the installed core
copy, so it answers 501 until core is reinstalled).

## X10: Live options the server honors

`GET /v1/graph` -> `data.info.realtime_options` (null when the graph is not a realtime agent):

```json
{ "client_overrides": ["voice", "modalities", "vad"],
  "models": ["gemini-2.5-flash-live"],
  "model_selectable": true,
  "tools_tags": true }
```

- `client_overrides`: init-frame keys applied from the client (subset of voice, modalities, vad,
  system_prompt). Keys not listed are ignored by the server.
- `models`: values of the init `model` the server accepts; empty means the client cannot choose
  the model (`model_selectable` false).
- `tools_tags`: client may narrow (never widen) the agent's tool tags (always true).

Not a realtime agent: `realtime_options` is `null`. `is_realtime` is unchanged.

## Continuing a static pause (interrupt_before / interrupt_after)

`POST /v1/graph/invoke`, `POST /v1/graph/stream` and `/v1/graph/ws` accept `{"resume": null}` with no `messages` to continue a thread paused by `interrupt_before` or `interrupt_after`. The server sees the pause in the checkpoint (`execution_meta.status` is `interrupted_before` or `interrupted_after`, no open `interrupt()`) and continues from the paused node without adding a message to the thread. The Continue button sends this. `resume` on a thread that is not paused still answers "Nothing to resume" (409 when `interrupt_id` is sent), the `interrupt()` resume with a value and `interrupt_id` is unchanged, and a pause waiting on a client tool still needs the tool result.
