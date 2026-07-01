// Dummy live-session data mirroring docs/mockups/live.html.
// UI-only pass: no audio, no websocket. Swapped for live API data later.

export const SESSION = {
  agent: "graph.voice:app",
  status: "connected",
  timer: "02:14",
  rate: "16 kHz in · 24 kHz out",
}

// Agent-output waveform. Static bar descriptors: `h` (0..1) drives height +
// opacity; per-bar animation duration/delay derived below, animated via CSS.
const WAVE_LEVELS = [
  0.3, 0.55, 0.4, 0.7, 0.5, 0.85, 0.6, 1, 0.7, 0.5, 0.65, 0.9, 0.55, 0.75, 0.45,
  0.8, 0.6, 0.95, 0.5, 0.7, 0.4, 0.6, 0.85, 0.55, 0.7, 0.5, 0.9, 0.6, 0.45, 0.75,
  0.55, 0.8, 0.5, 0.65, 0.4, 0.7, 0.55, 0.85, 0.5, 0.6, 0.45, 0.7, 0.5, 0.8, 0.55,
  0.4, 0.6, 0.35,
]

export const WAVE_BARS = WAVE_LEVELS.map((h, i) => ({
  height: 22 + h * 62,
  opacity: Number((0.55 + h * 0.45).toFixed(2)),
  duration: Number((0.7 + ((i * 37) % 50) / 100).toFixed(2)),
  delay: Number((-((i * 53) % 90) / 100).toFixed(2)),
}))

// Symmetric VU meters. `level` (0..1) marks how many of the 14 bars are lit.
const VU_COUNT = 14
function makeVU(level) {
  return Array.from({ length: VU_COUNT }, (_, i) => ({
    height: 6 + i,
    on: i / VU_COUNT < level,
  }))
}

export const VU_IN = { label: "mic · you", db: "-18 dB", bars: makeVU(0.35) }
export const VU_OUT = { label: "agent · out", db: "-6 dB", bars: makeVU(0.72) }

export const TRANSCRIPT = [
  {
    kind: "turn",
    id: "t1",
    role: "you",
    who: "You",
    tag: "input_transcript",
    time: "02:02",
    text: "Hey, can you book me a table for two tonight and check if it's going to rain?",
  },
  {
    kind: "turn",
    id: "t2",
    role: "agent",
    who: "graph.voice",
    tag: "output_transcript",
    time: "02:05",
    text: "Sure — let me check the weather and find a table for you.",
    tools: [
      { name: "get_weather", result: "→ 62% rain" },
      { name: "book_table", result: "→ 8:00 PM confirmed" },
    ],
  },
  { kind: "interrupt", id: "i1", label: "you interrupted", time: "02:11" },
  {
    kind: "turn",
    id: "t3",
    role: "you",
    who: "You",
    tag: "input_transcript",
    time: "02:11",
    text: "Actually make it three people.",
  },
  {
    kind: "turn",
    id: "t4",
    role: "agent",
    who: "graph.voice",
    tag: "output_transcript",
    time: "02:13",
    text: "Got it, updating the reservation to three — and yes, bring an umbrella,",
    partial: true,
  },
]

export const MODELS = ["gemini-2.0-flash-live", "gpt-4o-realtime"]
export const VOICES = ["Aoede", "Charon", "Kore", "Puck"]
export const MODALITIES = [
  { name: "audio", on: true },
  { name: "text", on: true },
  { name: "video", on: false },
]
export const VAD_MODES = ["auto (server VAD)", "manual / push"]
export const VAD_SILENCE = ["silence 500ms", "silence 800ms", "silence 1200ms"]
export const THREADS = ["new thread", "th_9f2a…c17 (resume)"]
export const SYSTEM_PROMPT =
  "You are a concise voice concierge. Confirm actions out loud before executing tools."

export const TIMELINE = [
  { type: "interrupted", time: "02:11", detail: "user barge-in · output truncated", tone: "warn" },
  { type: "tool_result", time: "02:06", detail: "book_table → 8:00 PM confirmed", tone: "blue" },
  { type: "tool_call", time: "02:05", detail: "get_weather · book_table", tone: "blue" },
  { type: "turn_complete", time: "02:04", detail: "input_transcript finalized", tone: "accent" },
  { type: "agent_changed", time: "02:03", detail: "handoff → concierge sub-agent", tone: "" },
  { type: "open", time: "02:00", detail: "WS /v1/graph/live · session established", tone: "accent" },
]
