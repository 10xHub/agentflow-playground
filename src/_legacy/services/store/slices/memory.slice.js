import {
  listMemories as apiListMemories,
  searchMemories as apiSearchMemories,
  storeMemory as apiStoreMemory,
  updateMemory as apiUpdateMemory,
  deleteMemory as apiDeleteMemory,
  forgetMemories as apiForgetMemories,
} from "@api/memory.api"
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"

import ct from "@constants/"

const FAILED_TO_LOAD = "Failed to load memories"
const FAILED_TO_SEARCH = "Failed to search memories"
const FAILED_TO_STORE = "Failed to store memory"
const FAILED_TO_UPDATE = "Failed to update memory"
const FAILED_TO_DELETE = "Failed to delete memory"
const FAILED_TO_FORGET = "Failed to forget memories"

const initialSearch = {
  query: "",
  memory_type: "",
  category: "",
  retrieval_strategy: "",
  distance_metric: "",
  limit: 10,
  score_threshold: 0,
  filters: {},
}

const initialState = {
  mode: "browse", // "browse" | "search"
  scope: "all", // "all" | "thread"
  items: [],
  selectedId: null,
  search: { ...initialSearch },
  browseLimit: 100,
  status: "idle", // "idle" | "loading" | "succeeded" | "failed"
  error: null,
  mutationStatus: "idle", // "idle" | "saving" | "deleting"
}

/**
 * Build the memory-store `config` from the current scope. "thread" scope keys
 * the query to the active conversation so it matches what the agent stored.
 */
const buildScopedConfig = (getState) => {
  const memory = getState()[ct.store.MEMORY_STORE]
  if (memory.scope !== "thread") {
    return {}
  }
  const threadId = getState()[ct.store.CHAT_STORE]?.activeThreadId
  return threadId ? { thread_id: threadId } : {}
}

const dropEmpty = (object) =>
  Object.fromEntries(
    Object.entries(object).filter(([, value]) => {
      if (value === "" || value === null || value === undefined) {
        return false
      }
      if (typeof value === "object" && !Array.isArray(value)) {
        return Object.keys(value).length > 0
      }
      return true
    })
  )

export const loadMemories = createAsyncThunk(
  "memory/loadMemories",
  async (_, { getState, rejectWithValue }) => {
    try {
      const memory = getState()[ct.store.MEMORY_STORE]
      const result = await apiListMemories({
        config: buildScopedConfig(getState),
        limit: memory.browseLimit,
      })
      return result.data?.memories || []
    } catch (error) {
      return rejectWithValue(error.message || FAILED_TO_LOAD)
    }
  }
)

export const searchMemories = createAsyncThunk(
  "memory/searchMemories",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { search } = getState()[ct.store.MEMORY_STORE]
      const request = dropEmpty({
        query: search.query,
        memory_type: search.memory_type,
        category: search.category,
        retrieval_strategy: search.retrieval_strategy,
        distance_metric: search.distance_metric,
        limit: search.limit,
        score_threshold: search.score_threshold,
        filters: search.filters,
      })
      const result = await apiSearchMemories({
        ...request,
        config: buildScopedConfig(getState),
      })
      return result.data?.results || []
    } catch (error) {
      return rejectWithValue(error.message || FAILED_TO_SEARCH)
    }
  }
)

const refreshCurrentView = (dispatch, getState) => {
  const { mode } = getState()[ct.store.MEMORY_STORE]
  return dispatch(mode === "search" ? searchMemories() : loadMemories())
}

export const createMemory = createAsyncThunk(
  "memory/createMemory",
  async (payload, { dispatch, getState, rejectWithValue }) => {
    try {
      await apiStoreMemory({
        content: payload.content,
        memory_type: payload.memory_type,
        category: payload.category,
        metadata: payload.metadata,
        config: buildScopedConfig(getState),
      })
      await refreshCurrentView(dispatch, getState)
      return true
    } catch (error) {
      return rejectWithValue(error.message || FAILED_TO_STORE)
    }
  }
)

export const editMemory = createAsyncThunk(
  "memory/editMemory",
  async (
    { memoryId, content, metadata },
    { dispatch, getState, rejectWithValue }
  ) => {
    try {
      await apiUpdateMemory(memoryId, content, {
        metadata,
        config: buildScopedConfig(getState),
      })
      await refreshCurrentView(dispatch, getState)
      return true
    } catch (error) {
      return rejectWithValue(error.message || FAILED_TO_UPDATE)
    }
  }
)

export const removeMemory = createAsyncThunk(
  "memory/removeMemory",
  async (memoryId, { dispatch, getState, rejectWithValue }) => {
    try {
      await apiDeleteMemory(memoryId, { config: buildScopedConfig(getState) })
      await refreshCurrentView(dispatch, getState)
      return memoryId
    } catch (error) {
      return rejectWithValue(error.message || FAILED_TO_DELETE)
    }
  }
)

export const forgetMemories = createAsyncThunk(
  "memory/forgetMemories",
  async (payload, { dispatch, getState, rejectWithValue }) => {
    const criteria = payload || {}
    try {
      await apiForgetMemories({
        ...dropEmpty({
          memory_type: criteria.memory_type,
          category: criteria.category,
          filters: criteria.filters,
        }),
        config: buildScopedConfig(getState),
      })
      await refreshCurrentView(dispatch, getState)
      return true
    } catch (error) {
      return rejectWithValue(error.message || FAILED_TO_FORGET)
    }
  }
)

const memorySlice = createSlice({
  name: ct.store.MEMORY_STORE,
  initialState,
  reducers: {
    setMode: (state, action) => {
      state.mode = action.payload
    },
    setScope: (state, action) => {
      state.scope = action.payload
    },
    setSelected: (state, action) => {
      state.selectedId = action.payload
    },
    setSearchField: (state, action) => {
      const { field, value } = action.payload
      state.search[field] = value
    },
    resetSearch: (state) => {
      state.search = { ...initialSearch }
    },
    setBrowseLimit: (state, action) => {
      state.browseLimit = action.payload
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    const onListPending = (state) => {
      state.status = "loading"
      state.error = null
    }
    const onListFulfilled = (state, action) => {
      state.status = "succeeded"
      state.items = action.payload
      if (!action.payload.some((item) => item.id === state.selectedId)) {
        state.selectedId = null
      }
    }
    const onListRejected = (fallback) => (state, action) => {
      state.status = "failed"
      state.error = action.payload || fallback
    }

    builder
      .addCase(loadMemories.pending, onListPending)
      .addCase(loadMemories.fulfilled, onListFulfilled)
      .addCase(loadMemories.rejected, onListRejected(FAILED_TO_LOAD))
      .addCase(searchMemories.pending, onListPending)
      .addCase(searchMemories.fulfilled, onListFulfilled)
      .addCase(searchMemories.rejected, onListRejected(FAILED_TO_SEARCH))

    const mutations = [
      { thunk: createMemory, kind: "saving" },
      { thunk: editMemory, kind: "saving" },
      { thunk: removeMemory, kind: "deleting" },
      { thunk: forgetMemories, kind: "deleting" },
    ]
    mutations.forEach(({ thunk, kind }) => {
      builder
        .addCase(thunk.pending, (state) => {
          state.mutationStatus = kind
          state.error = null
        })
        .addCase(thunk.fulfilled, (state) => {
          state.mutationStatus = "idle"
        })
        .addCase(thunk.rejected, (state, action) => {
          state.mutationStatus = "idle"
          state.error = action.payload || "Memory operation failed"
        })
    })
  },
})

export const {
  setMode,
  setScope,
  setSelected,
  setSearchField,
  resetSearch,
  setBrowseLimit,
  clearError,
} = memorySlice.actions

export default memorySlice.reducer
