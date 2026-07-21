import { createSlice } from "@reduxjs/toolkit"

import { getAgentFlowClient } from "@/lib/agentflow-client"

// Tools state:
//   - `serverNodes`: real tool nodes + tools from GET /v1/graph/tools (local/mcp/remote).
//   - `clientTools`: browser-owned tools the playground registers via the SDK. These
//     live only on the client (persisted to localStorage) until pushed to the server
//     via /v1/graph/setup.

const CLIENT_TOOLS_KEY = "agentflow-client-tools"

const loadClientTools = () => {
  try {
    const raw = localStorage.getItem(CLIENT_TOOLS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

const persistClientTools = (tools) => {
  try {
    localStorage.setItem(CLIENT_TOOLS_KEY, JSON.stringify(tools))
  } catch {
    // storage full / disabled — non-fatal, tools just won't persist across reloads.
  }
}

const initialState = {
  serverNodes: [], // [{ node_name, tool_count, tools: [{name, description, source, parameters}] }]
  serverToolCount: 0,
  clientTools: loadClientTools(), // [{ id, name, description, parameters, code, mock, callMode, registered }]
  status: "idle", // "idle" | "loading" | "ready" | "error"
  error: null,
}

const toolsSlice = createSlice({
  name: "tools",
  initialState,
  reducers: {
    toolsLoading: (state) => {
      state.status = "loading"
      state.error = null
    },
    toolsLoaded: (state, action) => {
      const { nodes, tool_count } = action.payload
      state.serverNodes = nodes || []
      state.serverToolCount = tool_count || 0
      state.status = "ready"
    },
    toolsError: (state, action) => {
      state.status = "error"
      state.error = action.payload
    },
    // ---- client tool CRUD (browser-owned) ----
    upsertClientTool: (state, action) => {
      const tool = action.payload
      const index = state.clientTools.findIndex((t) => t.id === tool.id)
      if (index >= 0) state.clientTools[index] = tool
      else state.clientTools.push(tool)
      persistClientTools(state.clientTools)
    },
    removeClientTool: (state, action) => {
      state.clientTools = state.clientTools.filter(
        (t) => t.id !== action.payload
      )
      persistClientTools(state.clientTools)
    },
    setClientToolRegistered: (state, action) => {
      const { id, registered } = action.payload
      const tool = state.clientTools.find((t) => t.id === id)
      if (tool) {
        tool.registered = registered
        persistClientTools(state.clientTools)
      }
    },
  },
})

export const {
  toolsLoading,
  toolsLoaded,
  toolsError,
  upsertClientTool,
  removeClientTool,
  setClientToolRegistered,
} = toolsSlice.actions

// Node/tool-count payload, whichever envelope shape the response uses.
const toolsPayload = (res) => {
  const data = res?.data || res || {}
  return { nodes: data.nodes || [], tool_count: data.tool_count || 0 }
}

/**
 * Load the real server-side tools (local + MCP + remote), grouped by tool node,
 * from the connected backend. Safe to call repeatedly.
 */
export const loadTools = () => async (dispatch) => {
  let client
  try {
    client = getAgentFlowClient()
  } catch (e) {
    dispatch(toolsError(e?.message || "Not connected to a backend"))
    return
  }

  dispatch(toolsLoading())
  try {
    const res = await client.graphTools()
    dispatch(toolsLoaded(toolsPayload(res)))
  } catch (e) {
    dispatch(toolsError(e?.message || "Failed to load tools"))
  }
}

// Build a browser handler for a client tool. In "mock" mode it returns the
// parsed mock JSON; in "handler" mode it runs the user's function body.
const buildHandler = (tool) => {
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

/**
 * Register the playground's client tools with the SDK (registerTool) and push
 * them to the server (setup) so the agent can call them. Each tool is attached to
 * a real tool node so the server routes remote_tool_calls back to the browser.
 */
export const registerClientTools =
  ({ nodeName, only } = {}) =>
  async (dispatch, getState) => {
    const client = getAgentFlowClient()
    const { clientTools, serverNodes } = getState().tools

    // Default to the first tool node if the caller didn't specify one.
    const targetNode = nodeName || serverNodes[0]?.node_name || "TOOL"
    const toRegister = only
      ? clientTools.filter((t) => t.id === only)
      : clientTools

    for (const t of toRegister) {
      client.registerTool({
        node: targetNode,
        name: t.name,
        description: t.description || "",
        parameters: t.parameters || {
          type: "object",
          properties: {},
          required: [],
        },
        handler: buildHandler(t),
      })
    }

    // setup() sends all registered tool definitions to the server.
    await client.setup()

    toRegister.forEach((t) =>
      dispatch(setClientToolRegistered({ id: t.id, registered: true }))
    )
  }

export default toolsSlice.reducer
