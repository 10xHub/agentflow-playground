# Audit: Memory inspector and Files page (read-only)

Paths relative to /home/shudiptot/projects/Agentflow. PG = agentflow-playground/src, API = agentflow-api/tenxgraph_api/src/app/routers.

## 1. Memory page today
- Real data. pages/memory/data.js holds only option lists (collection name, strategies, metrics); no sample memories. Rows come from store/memory-slice.js via TenxGraphClient: browse = listMemories({config:{collection}, limit:100}) (slice:145), search = searchMemory({query, limit:25, retrieval_strategy, distance_metric}) (slice:168-177). Fetch on mount and when collection changes (memory-page.jsx:46).
- Mock data only in demo mode (sessionStorage flag, lib/demo/demo-mode.js): DemoClient serves recorded fixtures (demo-client.js:110-125). Unknown queries fall back to a client-side keyword search with keyword:true and a KeywordNote; delete mutates the in-memory fixture. Demo getFileAccessUrl throws "Files not found" (demo-client.js:19,82).
- UI: 3 columns. Left: collection text input, type checkboxes and category facets (client-side over loaded rows), Reload. Middle: Browse/Search tabs, content filter (browse), semantic query + strategy + metric selects (search), "Forget visible" (arm-then-confirm). Right: detail with content, "why matched" (query/strategy/metric/score), record fields, Delete (arm-then-confirm).
- No store configured: API raises 503 "Store is not configured" (store_service.py:26-30,65-68). Slice maps 503 or /not configured/ to status "unconfigured" (slice:118-126); page shows "Memory not configured" panel with Retry (memory-page.jsx:79-107). Works as designed. Other errors show raw message in list.

## 2. Gaps (API/SDK capability not surfaced)
- Create memory: POST /v1/store/memories (API store/router.py:34-50; SDK client.ts:792 storeMemory). No UI. Needs content, memory_type, category, metadata.
- Update memory: PUT /v1/store/memories/{id} (router.py:106-125; SDK client.ts:870 updateMemory). No edit UI.
- Get single memory: POST /v1/store/memories/{id} (router.py:176-199; SDK client.ts:839). Unused; detail uses list row only.
- Server-side filters on search: SearchMemorySchema has memory_type, category, score_threshold, filters, max_tokens (store_schemas.py:75-112). Playground sends none; type/category facets are client-side only and are not applied in search mode (memory-page.jsx:67-72), and search limit fixed at 25 (slice:171).
- Forget by filter: POST /v1/store/memories/forget with memory_type/category/filters (router.py:155-173; SDK client.ts:974 forgetMemories). Playground's "Forget visible" instead fires N single DELETEs on the loaded rows (slice:206-219), so it cannot forget beyond the 100 loaded and fires N requests.
- Pagination: list only takes limit (max 1000, store_schemas.py ListMemoriesSchema); no offset/cursor exists in API or SDK. Playground hard-codes 100 (slice:145); header shows "loaded 100 / 100" (memory-page.jsx:117), no total or "more available" hint.
- Threads link: MemorySearchResult has thread_id, user_id, timestamp (core store_schema.py:62-73); detail shows thread_id as plain text (memory-detail.jsx), not linked to /threads.
- Vector: MemorySearchResult.vector exists but API list/search does not populate it per UI note (memory-detail.jsx:151). Inference only on why.
- Namespaces: no namespace concept in the store API; scoping is user_id + (developer-set) collection. Nothing to surface.
- Memory type filter list is hard-coded (memory-page.jsx:15-23) to the 7 MemoryType values (core store_schema.py:50-59): matches.

## 3. Bugs / broken behavior
- HIGH confidence: collection input is a no-op against a live API. client_config strips "collection" as a server-owned key (request_config.py:20-22,76-77; store_service.py:70-76 applies it to every call). The playground still sends config.collection (slice:128-131, facets-column.jsx:47-52 title "Passed as config.collection") and its helper text claims it works (facets-column.jsx:73-79). Result: users type another collection, see the same data. Also the default "agentflow_memories" (data.js:6) is only cosmetic. Demo mode hides this.
- HIGH: ModeTabs/search facets: type/category facet counts and checkboxes are ignored in search mode, but still rendered, so toggling does nothing (memory-page.jsx:67-72).
- MEDIUM: "loaded N / N" always equal (memory-page.jsx:117) so it conveys nothing; meant to show total vs loaded.
- MEDIUM: switching to Search tab with no query leaves the browse list displayed with score bars at 0.00 (setMode just flips mode; rows rendered with search=true show score; slice normalize gives score 0 for list rows). Inference from code, not run.
- MEDIUM: deleteMemory/forgetVisible have no catch: deleteMemory (slice:194-203) uses try/finally only, so a 403/404 rejects unhandled and shows no toast/error. forgetVisible swallows per-item errors (catch -> null, slice:213) and reports no failure count.
- LOW: forget count label uses shown.length (client-filtered) but forgetVisible deletes ALL items in state, not the filtered/shown subset (slice:208 vs memory-list.jsx:266,303). Type/category/text filters make "Forget visible" delete more than shown. Verified in code; HIGH confidence, data-loss risk, so arguably P0.
- LOW: timestamps formatted with toISOString (UTC) labelled without zone (slice:33).
- LOW: invalid timestamp string would throw RangeError in normalize (slice:33). Inference.

## 4. Files page
Exists in API (API media/router.py): POST /v1/files/upload multipart (130-182; perm files:upload; MIME allowlist, size cap, content sniffing), GET /v1/files/{id} binary (188-216), GET /v1/files/{id}/info (219-238), GET /v1/files/{id}/url (241-272; signed direct URL + expires_at), DELETE /v1/files/{id} owner-only (275-299), GET /v1/config/multimodal (305-320: media_storage_type, media_max_size_mb, document_handling). Responses in media/schemas.py (file_id, mime_type, size_bytes, filename, extracted_text, url, direct_url, direct_url_expires_at).
SDK (client.ts): uploadFile 1011, getFile 1021 (Blob), getFileInfo 1029, getFileAccessUrl 1039, deleteFile 1052, getMultimodalConfig 1060.
Playground today: route is Placeholder (App.jsx:53-58); nav badge "Soon" (lib/nav.js:36-38). Only file usage: lib/media-resolver.js resolves file_id to URL for chat message blocks (HEAD on /v1/files/{id}, fallback getFileAccessUrl). No uploadFile/FormData/file input anywhere in PG (grep), so chat has no attachment upload; Files page would be the first upload surface. Demo client throws on getFileAccessUrl.
Missing in API/SDK (verified absent): NO list-files endpoint, no files-by-thread/message index, no search. Files are addressable only by file_id. So a classic file browser is not buildable without a new endpoint (e.g. GET /v1/files?cursor, owner-filtered) and a MediaStore list/owner index. Inference: the media service stores owner metadata (ensure_can_access uses user_id), so listing by owner is likely feasible server-side; not verified.
What can be built today (no API change): "File lab" page: show multimodal config (storage type, max MB, document handling) as a header; drag-drop upload with progress/error mapping (413, 415, 400); result card (file_id, mime, size, extracted_text preview, direct_url + expiry); preview by MIME (image/audio/pdf via getFile Blob or getFileAccessUrl); copy file_id / "use in chat" (message content block media kind file_id, see media-resolver.js); delete (confirm); lookup box by file_id; session-local recent uploads list (localStorage) to compensate for no list endpoint. Thread/message links: only possible by scanning message content blocks with media.kind=="file_id" client-side from threads data (inference), no server relation.

## 5. Recommendations
- P0: Fix "Forget visible" to delete only the shown (filtered) ids, or switch to forgetMemories with type/category (data-loss mismatch, slice:208).
- P0: Remove or disable the collection input (or label it read-only/"set in code"); server drops it (request_config.py:76).
- P1: Pass memory_type/category/score_threshold to search server-side and apply facets in search mode; add limit control.
- P1: Add create and edit memory (storeMemory/updateMemory exist, no UI): lets users seed and test agents.
- P1: Build Files "lab" page from existing endpoints (config header, upload, preview, delete, lookup, recent list); remove "Soon" badge.
- P1: Add error toasts for delete/forget failures; surface partial-failure counts.
- P2: Link thread_id to /threads; show true total/"limit reached" hint; local timezone timestamps.
- P2: Add GET /v1/files list endpoint (+SDK listFiles) for a real browser; add chat attachment upload using uploadFile.
- P2: Hide score bars when in search mode with no query.
