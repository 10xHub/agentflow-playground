// Browser-owned tools: their records live in localStorage, and their handlers
// must be (re)registered on every client instance, because a rebuilt client
// starts with none.

export const CLIENT_TOOLS_KEY = "10xgraph.client-tools"

/** Persisted client tool records; [] when storage is empty, blocked or corrupt. */
export const readStoredClientTools = () => {
  try {
    const raw = localStorage.getItem(CLIENT_TOOLS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// Build a browser handler for a client tool. In "mock" mode it returns the
// parsed mock JSON; in "handler" mode it runs the user's function body.
export const buildHandler = (tool) => {
  if (tool.callMode === "handler" && tool.code) {
    return async (arguments_) => {
      // The code defines a function; evaluate it and call it with args.

      const function_ = new Function(`${tool.code}\nreturn ${tool.name};`)()
      return function_(arguments_)
    }
  }
  return async () => {
    try {
      return tool.mock ? JSON.parse(tool.mock) : { ok: true }
    } catch {
      return { ok: true }
    }
  }
}

/** Register every persisted tool marked `registered` on a fresh client. */
export const registerStoredTools = (client) => {
  readStoredClientTools()
    .filter((tool) => tool?.registered && tool.name)
    .forEach((tool) =>
      client.registerToolHandler(tool.name, buildHandler(tool))
    )
}

/** Whether a client tool of this name has a handler registered in this browser. */
export const isClientToolHandled = (name) =>
  readStoredClientTools().some((tool) => tool?.registered && tool.name === name)
