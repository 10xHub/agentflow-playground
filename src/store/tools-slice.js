import { createSlice } from "@reduxjs/toolkit"

import {
  buildHandler,
  CLIENT_TOOLS_KEY,
  readStoredClientTools,
} from "@/lib/client-tool-handlers"
import { isDemoActive } from "@/lib/demo/demo-mode"
import { getTenxGraphClient } from "@/lib/tenxgraph-client"

// Tools state:
//   - `serverNodes`: real tool nodes + tools from GET /v1/graph/tools (local/mcp/remote).
//   - `clientTools`: browser-owned handlers persisted to localStorage. Matching trusted
//     schemas must already exist in the server's 10xgraph.json.

// The demo never reads or writes the visitor's own client tools.
const loadClientTools = () => {
  if (isDemoActive()) return []
  return readStoredClientTools()
}

const persistClientTools = (tools) => {
  if (isDemoActive()) return
  try {
    localStorage.setItem(CLIENT_TOOLS_KEY, JSON.stringify(tools))
  } catch {
    // storage full / disabled — non-fatal, tools just won't persist across reloads.
  }
}

// A function, so a demoSwitched reset re-reads storage for the current mode.
const initialState = () => ({
  serverNodes: [], // [{ node_name, tool_count, tools: [{name, description, source, parameters}] }]
  serverToolCount: 0,
  clientTools: loadClientTools(), // [{ id, name, description, parameters, code, mock, callMode, registered }]
  status: "idle", // "idle" | "loading" | "ready" | "error"
  error: null,
})

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
    client = getTenxGraphClient()
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

/**
 * Register the playground's client-side handlers. The server advertises only
 * remote-tool schemas declared in 10xgraph.json.
 */
export const registerClientTools =
  ({ only } = {}) =>
  async (dispatch, getState) => {
    const client = getTenxGraphClient()
    const { clientTools } = getState().tools

    const toRegister = only
      ? clientTools.filter((t) => t.id === only)
      : clientTools

    for (const t of toRegister) {
      client.registerToolHandler(t.name, buildHandler(t))
    }

    toRegister.forEach((t) =>
      dispatch(setClientToolRegistered({ id: t.id, registered: true }))
    )
  }

export default toolsSlice.reducer
