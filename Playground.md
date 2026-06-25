Confirmed, and it's more telling than the inventory suggested: the "View Memory" panel is hardcoded fake data (Used: 45.2 MB, Active Components: 12 — all static placeholders). It's a dead stub, and meanwhile the client exposes a full agent memory store API that a developer testing memory-backed agents has no way to see.

Here's my review. The playground is solid for the core loop (chat, streaming, threads, state editor, graph viz, events log, auth). The gaps are all agent capabilities the backend/client support but the developer can't exercise or inspect from the UI. Prioritized:

Top gaps (real testing value)

1. Agent Memory inspector — replace the fake "View Memory" panel
   This is the biggest miss. The client has the full memory store: searchMemory, listMemories, storeMemory, updateMemory, deleteMemory, forgetMemories — with memory types (episodic/semantic/procedural/entity/…) and retrieval strategies (similarity/temporal/hybrid/graph). A developer building a memory-backed agent currently has zero visibility into what it remembered. Turn that panel into a real browser: list/search memories, filter by type+category, show content + similarity score + metadata, and manually add/edit/delete to test retrieval. High value, the current panel is literally fake.

2. Realtime voice (the audio feature you asked about) — yes, add it
   The mic button already says "coming soon" and handleVoiceInput() is empty. The client's realtime() returns a RealtimeSession doing audio-to-audio over WebSocket (PCM16 in @16kHz, out @24kHz), with live input/output transcripts, VAD, and tool-call events. My recommendation: build it as a dedicated "Live" / voice mode in the chat rather than retrofitting the text input, because it needs mic capture + speaker playback plumbing and a session lifecycle (it's the heaviest item here). It's also the most impressive for demoing a live agent. Worth doing — just scope it as its own mode.

Medium (debugging convenience) 3. WebSocket streaming toggle — you currently only use HTTP stream(). The client also has wsStream() (identical API, persistent connection, no HTTP roundtrip per tool call). A per-thread toggle lets devs test/compare latency for tool-heavy agents.

4. "Fix thread" button — expose fixGraph(threadId) (cleans up dangling/empty tool calls that wedge a thread). Pairs naturally with the existing stop button; one-click recovery from a broken state during testing.

5. Client-side tool testing — registerTool() lets the browser own a tool the agent calls (geolocation, clipboard, a JS sandbox). Niche, but it's the one way to test agents that depend on client-executed tools, and nothing in the UI exercises it today.

Lower (polish) 6. Dynamic multimodal config — drive allowed file types/size from getMultimodalConfig() instead of the hardcoded 10MB list, so the UI matches the server. 7. Message search/pagination — threadMessages supports search + offset/limit; long threads currently load flat. 8. Per-run token/cost readout — invoke/stream already return meta; surface tokens/cost/iterations per run.

My recommendation: #1 (memory inspector) and #2 (voice mode) are the standout additions — one fixes a fake feature, the other is the audio capability you mentioned. #3 and #4 are cheap, high-leverage debugging wins.

Want me to spec out and build any of these? If so I'd start with the memory inspector (most value, replaces dead code) and treat the voice mode as a separate larger piece

biswassubrata803@gmail.com
