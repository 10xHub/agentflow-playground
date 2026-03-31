import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"

import { fetchStateSchema, fetchState, putState } from "@api/state.api"
import ct from "@constants/"

const THREAD_ID_REQUIRED_ERROR = "Thread ID is required"
const FAILED_TO_FETCH_THREAD_STATE_ERROR = "Failed to fetch thread state"
const FAILED_TO_UPDATE_THREAD_STATE_ERROR = "Failed to update thread state"

const initialExecutionMeta = {
  current_node: "",
  step: 0,
  status: "idle",
  interrupted_node: [],
  interrupt_reason: "",
  interrupt_data: [],
  thread_id: "",
  internal_data: {},
}

const initialRuntimeState = {
  context: [],
  context_summary: "",
  execution_meta: initialExecutionMeta,
}

const mergeStateData = (currentState, nextState = {}) => ({
  ...currentState,
  ...nextState,
  context: Array.isArray(nextState.context)
    ? nextState.context
    : currentState.context,
  context_summary: nextState.context_summary ?? currentState.context_summary,
  execution_meta: {
    ...currentState.execution_meta,
    ...(nextState.execution_meta || {}),
  },
})

// list of messages
// message example
// { message_id: 1, content: "Hello, world!", role: "user"}
const initialState = {
  isLoading: false,
  isSaving: false,
  error: null,
  schema: {},
  state: initialRuntimeState,
}

export const fetchStateScheme = createAsyncThunk(
  "state/fetchStateScheme",
  async (_, { rejectWithValue }) => {
    try {
      const result = await fetchStateSchema()
      return result
    } catch (error) {
      return rejectWithValue(error.message)
    }
  }
)

export const fetchThreadState = createAsyncThunk(
  "state/fetchThreadState",
  async (threadId, { rejectWithValue }) => {
    try {
      if (!threadId) {
        throw new Error(THREAD_ID_REQUIRED_ERROR)
      }
      const result = await fetchState(threadId)
      return result
    } catch (error) {
      return rejectWithValue(
        error.message || FAILED_TO_FETCH_THREAD_STATE_ERROR
      )
    }
  }
)

export const updateThreadState = createAsyncThunk(
  "state/updateThreadState",
  async ({ threadId, state, config }, { rejectWithValue }) => {
    try {
      if (!threadId) {
        throw new Error(THREAD_ID_REQUIRED_ERROR)
      }
      const result = await putState(threadId, { state, config })
      return result
    } catch (error) {
      return rejectWithValue(
        error.message || FAILED_TO_UPDATE_THREAD_STATE_ERROR
      )
    }
  }
)

const stateSlice = createSlice({
  name: ct.store.STATE_STORE,
  initialState,
  reducers: {
    updateState: (state, action) => {
      const { context, contextSummary, execution_meta } = action.payload
      state.state = mergeStateData(state.state, {
        context,
        context_summary: contextSummary,
        execution_meta,
      })
    },
    updateFullState: (state, action) => {
      state.state = mergeStateData(state.state, action.payload)
    },
    clearSettings: (state) => {
      state.state = initialRuntimeState
      state.schema = {}
    },
    addNewMessage: (state, action) => {
      const { message } = action.payload
      state.state.context.push(message)
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch state schema
      .addCase(fetchStateScheme.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchStateScheme.fulfilled, (state, action) => {
        // this api will return current state schema, which we can use to update our state
        const { data } = action.payload.data
        const properties = data.properties || {}

        state.schema = properties

        Object.keys(properties).forEach((key) => {
          if (!["context", "context_summary", "execution_meta"].includes(key)) {
            if (state.state[key] === undefined) {
              state.state[key] = properties[key]?.default
            }
          }
        })
        state.isLoading = false
      })
      .addCase(fetchStateScheme.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload || "Fetch failed"
      })
      // Fetch thread state
      .addCase(fetchThreadState.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchThreadState.fulfilled, (state, action) => {
        const { data } = action.payload
        if (data && typeof data === "object") {
          state.state = mergeStateData(state.state, data)
        }
        state.isLoading = false
      })
      .addCase(fetchThreadState.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload || FAILED_TO_FETCH_THREAD_STATE_ERROR
      })
      // Update thread state
      .addCase(updateThreadState.pending, (state) => {
        state.isSaving = true
        state.error = null
      })
      .addCase(updateThreadState.fulfilled, (state, action) => {
        state.isSaving = false
        const { data } = action.payload
        if (data && typeof data === "object") {
          state.state = mergeStateData(state.state, data)
        }
      })
      .addCase(updateThreadState.rejected, (state, action) => {
        state.isSaving = false
        state.error = action.payload || FAILED_TO_UPDATE_THREAD_STATE_ERROR
      })
  },
})

export const { updateState, updateFullState, clearSettings, addNewMessage } =
  stateSlice.actions
export default stateSlice.reducer
