# Audit: Threads, Live, Chat, Settings, Shell (read-only)
Paths relative to /home/shudiptot/projects/Agentflow/agentflow-playground/src unless prefixed (API = agentflow-api/tenxgraph_api/src/app/routers, SDK = agentflow-client/src).
All data on these pages is REAL (server) except where noted; demo mode swaps in a recorded fixture client (lib/tenxgraph-client.js:84-89).

## 0. Source of truth (verified)
Checkpointer (API/checkpointer/router.py):
- GET /v1/threads ?search&offset&limit (default 100, max 1000; router.py:34-42,455) -> {threads:[{thread_id,thread_name,user_id,updated_at,run_id,metadata}]}
- GET /v1/threads/{id} (thread info); DELETE /v1/threads/{id}
- GET /v1/threads/{id}/state; PUT (state patch; `context` appends via add_messages); DELETE (clear)
- GET /v1/threads/{id}/messages ?search&offset&limit; POST (admin import); GET/PUT(feedback only)/DELETE /messages/{message_id}
- No thread rename/PUT-thread and no checkpoint-history/time-travel/fork endpoint exists. Not gaps.
Graph (API/graph/router.py): POST /v1/graph/invoke, /stream (fields: messages, resume, interrupt_id, initial_state, config, recursion_limit, on_busy wait|cancel, response_granularity; graph_schemas.py:22-76), POST /v1/graph/stop {thread_id}, POST /v1/graph/fix, GET /v1/graph, /graph/tools, /graph:StateSchema, /observability/{thread_id}, WS /v1/graph/ws (invoke_type fresh|resume+tool_result), WS /v1/graph/live (router.py:900). AG-UI: POST /v1/ag-ui (ag_ui/router.py:34). Initial_state.current_node honoured, tool nodes refused (graph_service.py:606-619).
Interrupts: core utils/interrupt.py. Pause = stream UPDATES with status="interrupted" / execution_meta.interrupt_data.interrupt{id,node,...,response_schema}; resume = same thread + `resume` value (+ optional `interrupt_id`; 409 on mismatch, 422 on schema fail); `None` = cancel.
SDK (client.ts): threads(search,offset,limit) 435, threadMessages(+paging) 456, threadState/updateThreadState/clearThreadState 378-411, threadDetails 422, singleMessage 508, deleteMessage 529, updateThreadMessageFeedback 553, deleteThread 575, invoke/stream/wsStream accept resume/interrupt_id/on_busy (client.ts:595-750), stopGraph 323, fixGraph 346, realtime() 770. Neither invoke nor stream accepts an AbortSignal (signal is created internally, stream.ts:312, invoke.ts:94).
Realtime events (SDK/endpoints/realtime.ts:35-47): input_transcript, output_transcript, tool_call, tool_result, turn_complete, interrupted, session_update(resumption_handle), go_away, agent_changed, error{fatal}. Session API: sendAudio, sendText, activityStart/End, close. Init: model, thread_id, voice, modalities, vad, system_prompt, tools_tags.

## 1. What each page does today
### Threads inspector (pages/threads/)
- Left: server thread list (client.threads() with NO params -> first 100 only), client-side filter on id/name/user, refresh, count "N readable". Auto-selects first thread on load (store/threads-slice.js:107-109). Row shows name/short id/user/relative updated.
- Right: header (name, id, user, message count, updated), Refresh, two-step Delete thread, tabs Messages | State & checkpoint | Raw JSON.
- Messages: role, short message_id, time, per-message delete; blocks rendered with the same Trace/ReasoningStep/ToolStep as Chat; unknown block types shown as `[type]` (messages-pane.jsx:24-44).
- State: execution_meta scalars + context count/summary as KV cards, full raw state JSON, "Clear state" button (state-pane.jsx).
- Empty: "Select a thread...", "No threads yet - start a chat", "No messages", "No state". List error text shown (thread-list.jsx:79-81).
### Live (pages/live/)
- Gate states: not connected, demo ("needs a live server"), agent not live (capabilities `live`), else <LiveSession/> (live-page.jsx:58-101). Real WS /v1/graph/live via client.realtime({modalities:"AUDIO"}, {reconnect:{enabled:false}}) (live-session.jsx:227).
- Start/Restart/End, status dot, tap-to-talk mic (activityStart -> mic PCM16@16k via ScriptProcessor -> activityEnd), PCM16@24k playback, coalesced user/agent transcript bubbles, error banner. Usage events only. Transcript is in-memory (lost on leave).
### Chat (pages/chat/)
- Header: thread picker, mode invoke|stream|ws, response_granularity, Stop (while generating), Fix thread. Body: message scroller, empty-state note, demo prompt chips, composer (Enter send; `initial_state` and `config` popups + recursion limit; Stop button). Inspector side panel: events, state (view+edit), graph, frames, cURL.
- Messages show reasoning/tool_call/tool_result blocks, answer text, token usage, run status.
- Realtime agents: Chat replaced by a gate pointing to /live (chat-page.jsx:150-156).
### Settings (pages/settings/)
- Active connection card + re-verify/disconnect/edit, saved connections list (switch/delete), appearance (theme). Local-only, 29-line page. Fine for scope.
### Shell
- Sidebar groups Interact(Chat, Live) / Inspect(Threads badge=count, Observability, Evals, Memory) / Build(Graph, Tools, Files "Soon") + Settings; connection bar with slot used by Chat's Inspector toggle (lib/nav.js, shell/sidebar.jsx).

## 2. Gaps (capability exists, UI does not surface it)
1. Interrupt approve/reject/respond: NO resume UI. grep for resume/interrupt_id in playground finds only read-only display of interrupted_node/reason/data (chat/components/inspector.jsx:367-421). sendMessage never passes resume/interrupt_id (store/chat-thunks.js:574-618; buildClientOptions 405-410). A paused run ends as "done" and likely "(no text returned)" (chat-thunks.js:512-516). Inference on the exact visible text; absence of resume path is verified. HIGHEST impact.
2. Server threads not browsable from Chat: Chat picker is a localStorage cache only (chat-header.jsx:36-137, store/threads-cache); never calls threads()/threadMessages(). Server history, threads created elsewhere, Live sessions, or edited via Threads page never appear; "Remove from cache" (chat-header.jsx:122) does not delete server-side. No "Open in Chat / continue" from Threads page (threads-page.jsx has none).
3. Thread list pagination/search server-side: threads() called without args (threads-slice.js:103); >100 threads silently truncated while header says "N readable" (thread-list.jsx:56). Messages likewise unpaginated (threads-slice.js:129). Search is client-side only.
4. State editing in Threads page: read-only + Clear. Editing exists only in Chat inspector (state-slice.js saveThreadState, PUT patch; context/execution_meta excluded by design, state-slice.js:154). `updateThreadState` not in threads page.
5. Message feedback (PUT /messages/{id}) and single-message GET: not used anywhere (grep updateThreadMessageFeedback: none). Message edit does not exist in API (only feedback) - not a gap.
6. Checkpoint history / time travel / fork: not offered by API or SDK. Not a gap; note as possible core feature.
7. `current_node` start-at-node: no UI. Only possible by typing it into the `initial_state` JSON popup. Feature is documented as intentional user-facing (CLAUDE.md) but undiscoverable; no node dropdown though graph nodes are already loaded (loadGraphInfo).
8. `on_busy` (wait|cancel) never sent (chat-thunks.js:405-410).
9. Attachments: none in Composer (composer.jsx). lib/multimodal.js (limits helper) is not imported by any page (grep: only its test + constant); SDK uploadFile/getMultimodalConfig unused; Files route is a "Soon" stub (lib/nav.js:38). Messages are always plain `Message.text_message` (chat-thunks.js:589).
10. Client tools: handlers registered only when user clicks Register in Tools editor (tools/components/client-editor.jsx:236); registerClientTools has no other caller. After reload, or when getTenxGraphClient() builds a new client (config change, lib/tenxgraph-client.js:94-101), handlers are gone though tool records persist with `registered:true` (tools-slice.js:161). Chat also has no render for `remote_tool_call` blocks (BLOCK_BUILDERS has only reasoning/tool_call/tool_result, chat-thunks.js:156-160), so client-tool calls are invisible in the transcript. (Inspector events pane maps remote_tool_call text only, inspector.jsx:229.)
11. ws transport: implemented in thunk (chat-thunks.js:487-494) but hard-gated "coming soon" (chat-header.jsx:18-24) and setMode rejects it (chat-slice.js:129). Header comment says it works with client>=0.6.0/api>=0.7.0, which are already released per CLAUDE.md. Stale gate.
12. Live: unhandled events: `interrupted` (barge-in), `turn_complete`, `tool_call`/`tool_result`, `go_away`, `agent_changed`, `session_update`. No sendText (typed input), no voice/vad/system_prompt/thread_id (resume) init options, no reconnect, no link to the resulting thread in Threads. Only open/audio/input_transcript/output_transcript/error/close are bound (live-session.jsx:239-254).
13. Observability per-thread trace not linked from Threads/Chat (separate page; out of scope but discoverability gap).
14. Stop: UI never passes a signal to the SDK (not supported); relies on breaking the for-await and on server /graph/stop. See bug B3.

## 3. Bugs / broken or stubbed behaviour
B1 (High conf) Threads: deleting the selected thread leaves a blank pane. threadRemoved selects list[0] and nulls detail but nothing loads it (threads-slice.js:60-67); detailStatus stays "ready", so Messages/State show "No messages"/"No state" for a thread that has data. Fix: dispatch loadThread(next) after removal.
B2 (High) Threads: errors swallowed. loadThread uses `.catch(() => null)` for both calls (threads-slice.js:128-129), so 401/403/500 on state or messages renders as "No messages/No state"; detailError is stored but never rendered (grep: not used in pages/threads). removeThread/clearThread/removeMessage have try/finally with no catch (threads-slice.js:138-171) -> unhandled promise rejection, no toast, button just re-enables. Message delete has no confirm, unlike thread delete (messages-pane.jsx:93-100).
B3 (Med-High) Chat Stop is partly cosmetic. `signal` is only polled between chunks (chat-thunks.js:325) and never passed to client.stream/invoke (SDK has no signal option). In invoke mode the awaited promise (chat-thunks.js:459) can't be aborted: UI sets generating=false (385) but the request and turn stay pending, and a new send can start concurrently on the same thread (on_busy default "wait"). In stream mode the loop only exits on the next chunk. Server stop only fires if threadId is already known (chat-thunks.js:373-383), so Stop on the first turn before a chunk with thread_id arrives does not stop the server. Also stopGraph errors are swallowed.
B4 (Med) Chat/Server thread divergence: switching threads (chat-header.jsx:59-62) restores cached UI messages; if the server thread was cleared/deleted in Threads page, Chat continues with a dead/changed thread_id with stale transcript. Inference on observed effect; mechanism verified (cache only).
B5 (Med) Chat: interrupted run shown as finished "done" (chat-thunks.js:509-516); status "interrupted" from stream UPDATES chunks is only logged in events pane (summarizeExecutionMeta, 105-107), no banner or action.
B6 (Med) Fix thread uses `typeof client.fixGraph !== "function"` guard with a message about "newer client build" (chat-thunks.js:393-396); fixGraph exists in current SDK, dead branch, but also success gives no feedback (setError(null) only, removed_count discarded, 397-398). Same stale guard on stopGraph (377) and wsStream (488).
B7 (Med, inference on server behaviour) Live: any `error` event, including non-fatal, flips status to "error" (live-session.jsx:247-250) which makes `stopped` true (309) and re-enables "Restart" while the socket may still be open; start() then overwrites sessionReference/player without closing the old one (207-237) -> leaked socket/audio. SDK emits error channel for every error event incl. non-fatal (realtime.ts handleMessage, `error` with fatal flag).
B8 (Med) Live barge-in: `interrupted` not handled, so queued PCM keeps playing after the user interrupts (createPcmPlayer has no flush; realtime-audio.js:24-60). Verified absent; user-visible effect is inference.
B9 (Low-Med) Live: tap-to-talk uses deprecated ScriptProcessorNode (realtime-audio.js:79). `toggleMic` on mic failure calls activityEnd but leaves no recording state; fine. After `close`, `appendTranscript` closure state OK.
B10 (Low) Live: hard-coded "Gemini Live" badge using class `mockTag` (live-session.jsx:44) although the model is server-configured (comment at 11-15 admits so); stale reference path "agentflow-api/graph/live.py" in comment (line 14) from old naming.
B11 (Low) Threads: "N readable" label and truncation (see gap 3); `ago()` duplicated in threads-page.jsx:20 and thread-list.jsx:11; ThreadMeta shows `id` slice+"..." even for short ids (threads-page.jsx:50). Header title shows thread_name or full id; no copy-id button.
B12 (Low) Threads raw tab dumps `thread`, `state`, `messages` as one blob; no copy/download.
B13 (Low) Chat: ThreadPicker "Remove from cache" label ok but the Threads page "Delete thread" and Chat cache removal both use `thread_deleted` track event (chat-header.jsx:124 vs threads-page.jsx:171), conflating analytics.
B14 (Low) Sidebar `disabled` items (Files "Soon") remain NavLinks with preventDefault; routes /files still exist. The nav badge for Threads shows count only after the Threads page has loaded the list (sidebar.jsx:16: reads store, which is empty until /threads mounted), so it is misleading/hidden on first load. Inference from store flow; loadThreadList is only dispatched in threads-page.jsx:154-156.

Live "in progress" status: functional core (connect, mic, audio out, transcripts, end). Unfinished: barge-in, tool/agent events, text input, config (voice/vad/prompt), resume/reconnect, persistence/link to thread, non-fatal error handling, no AudioWorklet, no mic level indicator, no permission pre-check UX beyond error text.

## 4. Recommendations
P0
- Add interrupt resume UI in Chat: detect status "interrupted" (stream UPDATES / execution_meta.interrupt_data.interrupt), show prompt + response_schema form with Approve / Reject (resume=null cancel) / custom JSON, send via stream/invoke `resume` + `interrupt_id`. Core HITL feature currently dead-ends.
- Fix Threads delete-selected blank pane (B1) and stop swallowing detail/mutation errors; render detailError and toast mutation failures (B2).
- Make Stop reliable: call stopGraph even before threadId is known (use pre-supplied thread id or on first chunk), and add AbortSignal support to SDK stream/invoke (B3).
P1
- Chat thread picker backed by server: list threads() with search/pagination, load history via threadMessages on switch, "Open in Chat" from Threads page (gap 2, B4).
- Server-side pagination ("Load more") and search for threads and messages (gap 3).
- Show client-tool calls (remote_tool_call) in transcript and auto-register persisted client tools on connect/client rebuild (gap 10).
- Live: handle `interrupted` (flush playback), `turn_complete`, `tool_call`/`tool_result`, `go_away`; treat only fatal errors as terminal and close old session before restart (B7, B8).
- Un-gate ws mode (or document why still gated) and drop stale `typeof client.x === "function"` guards (gap 11, B6).
- Fix-thread feedback: toast with removed_count (B6).
P2
- Live: text input (sendText), voice/vad/system_prompt options, thread_id resume, link to Threads, drop hard-coded "Gemini Live" badge (B10).
- Attachments in Composer via uploadFile + multimodal limits (gap 9) once Files page ships.
- `current_node` agent/node picker and `on_busy` toggle in run-options popup (gaps 7-8).
- Threads: editable state (reuse state-slice), message feedback, copy id / download raw JSON, confirm for message delete, pagination of messages (B11, B12).
- Load thread list at app start so sidebar badge is correct (B14); separate analytics event names (B13).
