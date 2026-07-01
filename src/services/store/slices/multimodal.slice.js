import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"

import {
  DEFAULT_MAX_SIZE_MB,
  DEFAULT_DOCUMENT_HANDLING,
} from "@/lib/multimodal"
import { getMultimodalConfig as apiGetMultimodalConfig } from "@api/config.api"

const FAILED_TO_LOAD = "Failed to load multimodal config"

const initialState = {
  maxSizeMb: DEFAULT_MAX_SIZE_MB,
  documentHandling: DEFAULT_DOCUMENT_HANDLING,
  status: "idle", // "idle" | "loading" | "succeeded" | "failed"
  error: null,
}

export const loadMultimodalConfig = createAsyncThunk(
  "multimodal/loadConfig",
  async (_, { rejectWithValue }) => {
    try {
      const result = await apiGetMultimodalConfig()
      return result.data || {}
    } catch (error) {
      return rejectWithValue(error.message || FAILED_TO_LOAD)
    }
  }
)

const multimodalSlice = createSlice({
  name: "multimodal",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadMultimodalConfig.pending, (state) => {
        state.status = "loading"
        state.error = null
      })
      .addCase(loadMultimodalConfig.fulfilled, (state, action) => {
        state.status = "succeeded"
        // Keep existing defaults when a field is missing from the response.
        if (typeof action.payload.media_max_size_mb === "number") {
          state.maxSizeMb = action.payload.media_max_size_mb
        }
        if (action.payload.document_handling) {
          state.documentHandling = action.payload.document_handling
        }
      })
      .addCase(loadMultimodalConfig.rejected, (state, action) => {
        state.status = "failed"
        state.error = action.payload || FAILED_TO_LOAD
      })
  },
})

export const { clearError } = multimodalSlice.actions

export default multimodalSlice.reducer
