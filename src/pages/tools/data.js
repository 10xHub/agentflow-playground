// Dummy tool + MCP registry mirroring docs/mockups/tools.html.
// UI-only: no API, no real tool registration. Swapped for live data later.

// Grouped list rendered in the left column. `kind` picks the detail view:
// client → editable editor, server/mcp → read-only schema view.
export const GROUPS = [
  {
    id: "client",
    label: "Client tools",
    dot: "client",
    count: "2",
    tools: ["cli_location", "cli_clipboard"],
  },
  {
    id: "server",
    label: "Server tools",
    dot: "server",
    count: "node: tools",
    tools: ["srv_weather", "srv_report", "srv_email"],
  },
  {
    id: "mcp",
    label: "MCP · filesystem",
    dot: "mcp",
    count: "stdio",
    tools: ["mcp_read", "mcp_write"],
  },
]

export const TOOLS = {
  cli_location: {
    kind: "client",
    name: "get_location",
    registered: true,
    desc: "Reads the browser geolocation. Registered in the client SDK via registerTool() + setup(); returns a mock so you can test the agent loop without granting real location access.",
    code: `// runs in the browser via registerTool()
async function get_location({ high_accuracy = true }) {
  // quick-test mock — no real geolocation call
  return { lat: 23.8103, lng: 90.4125, accuracy_m: 30, source: "mock" };
}`,
    params: [{ n: "high_accuracy", t: "boolean", r: false, d: "Request a high-accuracy fix" }],
    mock: `{ "lat": 23.8103, "lng": 90.4125, "accuracy_m": 30, "source": "mock" }`,
  },
  cli_clipboard: {
    kind: "client",
    name: "read_clipboard",
    registered: true,
    desc: "Reads clipboard text in the browser. Returns a mock response for quick testing.",
    code: `async function read_clipboard() {
  // quick-test mock
  return { text: "mock clipboard contents" };
}`,
    params: [],
    mock: `{ "text": "mock clipboard contents" }`,
  },
  srv_weather: {
    kind: "server",
    name: "get_weather",
    node: "tools",
    src: "local",
    desc: "Returns current weather for a location. Defined server-side on the tools node.",
    params: [
      { n: "location", t: "string", r: true, d: 'City, country (e.g. "Dhaka, BD")' },
      { n: "units", t: "string", r: false, d: "metric | imperial" },
    ],
  },
  srv_report: {
    kind: "server",
    name: "get_report",
    node: "tools",
    src: "local",
    desc: "Fetches a quarterly report by period.",
    params: [{ n: "quarter", t: "string", r: true, d: 'Reporting period, e.g. "Q2"' }],
  },
  srv_email: {
    kind: "server",
    name: "send_email",
    node: "tools",
    src: "remote",
    desc: "Sends an email. Attached to the tools node as a remote tool via POST /v1/graph/setup.",
    params: [
      { n: "to", t: "string", r: true, d: "Recipient address" },
      { n: "subject", t: "string", r: true, d: "Subject line" },
      { n: "body", t: "string", r: true, d: "Message body" },
    ],
  },
  mcp_read: {
    kind: "mcp",
    name: "fs.read",
    server: "filesystem",
    transport: "stdio",
    desc: "Reads a file from the workspace. Exposed by the filesystem MCP server.",
    params: [{ n: "path", t: "string", r: true, d: "Absolute path to read" }],
  },
  mcp_write: {
    kind: "mcp",
    name: "fs.write",
    server: "filesystem",
    transport: "stdio",
    desc: "Writes content to a file. Exposed by the filesystem MCP server.",
    params: [
      { n: "path", t: "string", r: true, d: "Absolute path to write" },
      { n: "content", t: "string", r: true, d: "File content" },
    ],
  },
}

// Builds the { type:"object", properties, required } object shown in the
// client editor's Parameters textarea.
export function paramSchemaObj(params = []) {
  const o = { type: "object", properties: {}, required: [] }
  params.forEach((p) => {
    o.properties[p.n] = { type: p.t }
    if (p.d) o.properties[p.n].description = p.d
    if (p.r) o.required.push(p.n)
  })
  return o
}
