// Converts backend tool shapes into the flat view-model the Tools components use.

// OpenAI JSON-schema params ({ type, properties, required }) -> [{ n, t, r, d }].
/**
 *
 */
export const paramsFromSchema = (parameters = {}) => {
  const properties = parameters?.properties || {}
  const required = new Set(parameters?.required || [])
  return Object.entries(properties).map(([name, spec]) => ({
    n: name,
    t: Array.isArray(spec?.type) ? spec.type.join(" | ") : spec?.type || "any",
    r: required.has(name),
    d: spec?.description || "",
  }))
}

// Build the { n, t, r, d } list back into an OpenAI params object (for the
// client-tool editor + JSON preview + registration).
/**
 *
 */
export const schemaFromParams = (parameters = []) => {
  const o = { type: "object", properties: {}, required: [] }
  parameters.forEach((p) => {
    o.properties[p.n] = { type: p.t }
    if (p.d) o.properties[p.n].description = p.d
    if (p.r) o.required.push(p.n)
  })
  return o
}

// A server/mcp/remote tool from GET /v1/graph/tools -> view model.
/**
 *
 */
export const serverToolVM = (tool, nodeName) => ({
  key: `srv:${nodeName}:${tool.name}`,
  kind: tool.source === "mcp" ? "mcp" : "server",
  src: tool.source, // local | mcp | remote
  name: tool.name,
  desc: tool.description || "",
  node: nodeName,
  params: paramsFromSchema(tool.parameters),
  parameters: tool.parameters || {},
})

// A client tool from the store -> view model (editable).
/**
 *
 */
export const clientToolVM = (tool) => ({
  key: `cli:${tool.id}`,
  id: tool.id,
  kind: "client",
  name: tool.name,
  desc: tool.description || "",
  code: tool.code || "",
  mock: tool.mock || "",
  callMode: tool.callMode || "mock",
  registered: !!tool.registered,
  params: paramsFromSchema(tool.parameters),
  parameters: tool.parameters || {
    type: "object",
    properties: {},
    required: [],
  },
})
