import { createSlice } from "@reduxjs/toolkit"

import { getAgentFlowClient } from "@/lib/agentflow-client"

// Real graph structure + state schema from the backend, shared by the Graph page
// and the chat Inspector's Graph tab.

const initialState = {
  info: null, // { node_count, edge_count, checkpointer, ... , state_fields }
  nodes: [], // [{ id, name }]
  edges: [], // [{ id, source, target }]
  stateSchema: null, // JSON schema object
  status: "idle", // "idle" | "loading" | "ready" | "error"
  error: null,
}

const graphSlice = createSlice({
  name: "graph",
  initialState,
  reducers: {
    graphLoading: (state) => {
      state.status = "loading"
      state.error = null
    },
    graphLoaded: (state, action) => {
      const { info, nodes, edges, stateSchema } = action.payload
      state.info = info
      state.nodes = nodes
      state.edges = edges
      if (stateSchema !== undefined) state.stateSchema = stateSchema
      state.status = "ready"
    },
    graphError: (state, action) => {
      state.status = "error"
      state.error = action.payload
    },
  },
})

export const { graphLoading, graphLoaded, graphError } = graphSlice.actions

/**
 * Fetch the live graph structure (and, on first load, the state schema) from the
 * connected backend. Safe to call repeatedly — it refreshes in place.
 */
export const loadGraph =
  ({ withSchema = true } = {}) =>
  async (dispatch, getState) => {
    let client
    try {
      client = getAgentFlowClient()
    } catch (e) {
      dispatch(graphError(e?.message || "Not connected to a backend"))
      return
    }

    dispatch(graphLoading())
    try {
      const res = await client.graph()
      const data = res?.data || res || {}
      const info = data.info || {}

      let stateSchema
      // Only fetch the schema once (it's large and static) unless missing.
      const haveSchema = getState().graph.stateSchema
      if (
        withSchema &&
        !haveSchema &&
        typeof client.graphStateSchema === "function"
      ) {
        try {
          const schemaRes = await client.graphStateSchema()
          stateSchema = schemaRes?.data || schemaRes || null
        } catch {
          stateSchema = undefined // non-fatal; pane falls back
        }
      }

      dispatch(
        graphLoaded({
          info,
          nodes: data.nodes || info.nodes || [],
          edges: data.edges || info.edges || [],
          stateSchema,
        })
      )
    } catch (e) {
      dispatch(graphError(e?.message || "Failed to load graph"))
    }
  }

export default graphSlice.reducer
