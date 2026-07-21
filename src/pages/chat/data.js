// Dummy conversation + inspector data mirroring docs/mockups/playground.html.
// Swapped for live API data in a later pass.

export const THREAD = { id: "th_9f2a…c17", label: "Current thread", live: true }

export const CONVERSATION = [
  {
    id: "m1",
    role: "user",
    who: "You",
    time: "14:22:07",
    text: "What's the weather in Dhaka right now, and should I carry an umbrella this afternoon?",
  },
  {
    id: "m2",
    role: "agent",
    who: "graph.react",
    node: "agent",
    blocks: [
      {
        kind: "reasoning",
        summary: "Model thought for 2 steps",
        collapsed: true,
        text: "The user asks for current weather and an umbrella recommendation. I should call the weather tool for Dhaka, then reason about precipitation probability for the afternoon window before answering.",
      },
      {
        kind: "tool_call",
        name: "get_weather",
        collapsed: false,
        code: `{
  "location": "Dhaka, BD",
  "units": "metric",
  "window": "afternoon"
}`,
      },
      {
        kind: "tool_result",
        name: "get_weather",
        meta: "· 214ms",
        collapsed: true,
        code: `{
  "temp_c": 31.4, "condition": "Partly cloudy",
  "precip_prob_pct": 62, "wind_kph": 11
}`,
      },
    ],
    answer: [
      "It's **31.4°C** and partly cloudy in Dhaka right now. There's a **62% chance of rain** this afternoon, with light winds around 11 km/h.",
      "Yes — I'd carry the umbrella. The precipitation probability is high enough that an afternoon shower is likely",
    ],
    streaming: true,
    runMeta: {
      tokens: "1,204 in · 186 out · 92 reason",
      iterations: 2,
      tools: 1,
      path: "agent→tools→agent",
      status: "streaming…",
    },
  },
]

export const EVENTS = [
  {
    type: "message",
    node: "agent",
    time: "+2.31s",
    detail: 'delta: "…an afternoon shower is likely"',
  },
  {
    type: "state",
    node: "execution_meta",
    time: "+1.98s",
    detail: "current_node: agent · step 4 · is_running: true",
  },
  {
    type: "updates",
    node: "tools → agent",
    time: "+1.74s",
    detail: "tool_result get_weather · 214ms · 62% precip",
  },
  {
    type: "updates",
    node: "agent → tools",
    time: "+0.51s",
    detail: 'tool_call get_weather({location:"Dhaka, BD"})',
  },
  {
    type: "message",
    node: "agent",
    time: "+0.12s",
    detail: "reasoning start · 2 steps",
  },
]

export const TRAJECTORY = [
  { name: "START", meta: "step 0 · entry", state: "done" },
  { name: "agent", meta: "step 1 · reasoning", state: "done" },
  { name: "tools", meta: "step 2 · get_weather → result", state: "done" },
  { name: "agent", meta: "step 3 · running…", state: "current" },
]

export const FRAMES = [
  { dir: "out", label: "POST /v1/graph/stream", time: "14:22:07" },
  { dir: "in", label: "event: updates", time: "+0.51s" },
  { dir: "in", label: "event: message", time: "+2.31s" },
]

export const CURL = `curl -N -X POST 'http://localhost:8000/v1/graph/stream' \\
  -H 'Authorization: Bearer •••' \\
  -H 'Content-Type: application/json' \\
  -d '{"messages":[…],"config":{"thread_id":"th_9f2a…c17"}}'`
