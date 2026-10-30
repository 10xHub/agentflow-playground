import { createSlice } from "@reduxjs/toolkit"

import { isDemoActive } from "@/lib/demo/demo-mode"
import { uploadMedia } from "@/lib/files/upload"
import { notifyError, notifySuccess } from "@/lib/notify"
import { getTenxGraphClient } from "@/lib/tenxgraph-client"

// Files lab state. The file list comes from the server (GET /v1/files). The recent
// list is session-local (localStorage, never in demo mode) and is the fallback when
// the store cannot list files (501). Pages read both through use-file-list.js.

export const RECENT_KEY = "10xgraph.files.recent"
const RECENT_MAX = 50
export const FILE_PAGE = 50

const readRecent = () => {
  if (isDemoActive()) return []
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]")
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const writeRecent = (recent) => {
  if (isDemoActive()) return
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent))
  } catch {
    /* storage blocked: the list still works for this page load */
  }
}

const makeInitial = () => ({
  config: {
    status: "idle", // idle | loading | ready | error
    storageType: null,
    maxSizeMb: null,
    documentHandling: null,
    error: null,
  },
  upload: { status: "idle", error: null }, // idle | uploading | error
  lookup: { status: "idle", error: null }, // idle | loading | error
  list: {
    status: "idle", // idle | loading | ready | unsupported (501) | error
    items: [], // server rows, newest first
    hasMore: false,
    loadingMore: false,
    error: null,
  },
  current: null, // file shown in the detail card
  recent: readRecent(),
})

const toRecent = (d) => ({
  file_id: d.file_id,
  filename: d.filename || null,
  mime_type: d.mime_type,
  size_bytes: d.size_bytes,
  ts: Date.now(),
})

const slice = createSlice({
  name: "files",
  initialState: makeInitial,
  reducers: {
    configLoading: (s) => {
      s.config.status = "loading"
      s.config.error = null
    },
    configLoaded: (s, a) => {
      s.config = { status: "ready", error: null, ...a.payload }
    },
    configFailed: (s, a) => {
      s.config.status = "error"
      s.config.error = a.payload
    },
    uploadStarted: (s) => {
      s.upload = { status: "uploading", error: null }
    },
    uploadFailed: (s, a) => {
      s.upload = { status: "error", error: a.payload }
    },
    uploadDone: (s, a) => {
      s.upload = { status: "idle", error: null }
      s.current = a.payload
      s.recent = [
        toRecent(a.payload),
        ...s.recent.filter((r) => r.file_id !== a.payload.file_id),
      ].slice(0, RECENT_MAX)
    },
    lookupStarted: (s) => {
      s.lookup = { status: "loading", error: null }
    },
    lookupFailed: (s, a) => {
      s.lookup = { status: "error", error: a.payload }
      s.current = null
    },
    lookupDone: (s, a) => {
      s.lookup = { status: "idle", error: null }
      s.current = a.payload
    },
    listLoading: (s) => {
      s.list.status = "loading"
      s.list.error = null
    },
    listLoaded: (s, a) => {
      s.list = {
        ...s.list,
        status: "ready",
        error: null,
        loadingMore: false,
        ...a.payload,
      }
    },
    listUnsupported: (s) => {
      s.list = { ...s.list, status: "unsupported", items: [], hasMore: false }
    },
    listFailed: (s, a) => {
      s.list.status = "error"
      s.list.error = a.payload
      s.list.loadingMore = false
    },
    moreLoading: (s) => {
      s.list.loadingMore = true
    },
    morePageLoaded: (s, a) => {
      const seen = new Set(s.list.items.map((f) => f.file_id))
      s.list.items.push(...a.payload.items.filter((f) => !seen.has(f.file_id)))
      s.list.hasMore = a.payload.hasMore
      s.list.loadingMore = false
    },
    fileRemoved: (s, a) => {
      s.list.items = s.list.items.filter((f) => f.file_id !== a.payload)
      s.recent = s.recent.filter((r) => r.file_id !== a.payload)
      if (s.current?.file_id === a.payload) s.current = null
    },
    currentCleared: (s) => {
      s.current = null
    },
  },
})

export const {
  configLoading,
  configLoaded,
  configFailed,
  uploadStarted,
  uploadFailed,
  uploadDone,
  lookupStarted,
  lookupFailed,
  lookupDone,
  fileRemoved,
  currentCleared,
  listLoading,
  listLoaded,
  listUnsupported,
  listFailed,
  moreLoading,
  morePageLoaded,
} = slice.actions

const unwrap = (res) => res?.data ?? res ?? {}

// Persist the list after any action that changed it.
const persist = (getState) => writeRecent(getState().files.recent)

const NOT_IMPLEMENTED = 501

/** First page of the caller's files from the server. */
export const loadFileList = () => async (dispatch) => {
  dispatch(listLoading())
  try {
    const d = unwrap(
      await getTenxGraphClient().listFiles({ limit: FILE_PAGE, offset: 0 })
    )
    dispatch(listLoaded({ items: d.files || [], hasMore: d.has_more === true }))
  } catch (e) {
    if ((e?.statusCode ?? e?.status) === NOT_IMPLEMENTED) {
      dispatch(listUnsupported())
    } else {
      dispatch(listFailed(e?.message || "Could not list files"))
    }
  }
}

/** Append the next page of the server list. */
export const loadMoreFiles = () => async (dispatch, getState) => {
  const { items, hasMore, loadingMore } = getState().files.list
  if (!hasMore || loadingMore) return
  dispatch(moreLoading())
  try {
    const d = unwrap(
      await getTenxGraphClient().listFiles({
        limit: FILE_PAGE,
        offset: items.length,
      })
    )
    dispatch(
      morePageLoaded({ items: d.files || [], hasMore: d.has_more === true })
    )
  } catch (e) {
    dispatch(listFailed(e?.message || "Could not load more files"))
  }
}

/** Read the multimodal config shown in the page header. */
export const loadFilesConfig = () => async (dispatch) => {
  dispatch(configLoading())
  try {
    const d = unwrap(await getTenxGraphClient().getMultimodalConfig())
    dispatch(
      configLoaded({
        storageType: d.media_storage_type,
        maxSizeMb: d.media_max_size_mb,
        documentHandling: d.document_handling,
      })
    )
  } catch (e) {
    dispatch(configFailed(e?.message || "Could not load the media config"))
  }
}

// Upload response carries the signed URL already; fall back to the info shape.
const uploadView = (d) => ({
  file_id: d.file_id,
  filename: d.filename,
  mime_type: d.mime_type,
  size_bytes: d.size_bytes,
  extracted_text: d.extracted_text ?? null,
  direct_url: d.direct_url ?? null,
  direct_url_expires_at: d.direct_url_expires_at ?? null,
})

/** Upload one picked or dropped file. */
export const uploadSelected = (file) => async (dispatch, getState) => {
  dispatch(uploadStarted())
  try {
    const d = await uploadMedia(getTenxGraphClient(), file, {
      maxSizeMb: getState().files.config.maxSizeMb,
    })
    dispatch(uploadDone(uploadView(d)))
    persist(getState)
    if (getState().files.list.status === "ready") dispatch(loadFileList())
  } catch (e) {
    dispatch(uploadFailed(e.message))
  }
}

// Info plus a fresh signed URL; a missing URL only hides the link.
const fetchFileView = async (client, id) => {
  const info = unwrap(await client.getFileInfo(id))
  let access = {}
  try {
    access = unwrap(await client.getFileAccessUrl(id))
  } catch {
    // The info already loaded.
  }
  return {
    ...uploadView(info),
    file_id: info.file_id || id,
    direct_url: access.url ?? info.direct_url ?? null,
    direct_url_expires_at:
      access.expires_at ?? info.direct_url_expires_at ?? null,
  }
}

const lookupMessage = (e) =>
  (e?.statusCode ?? e?.status) === 404 ? "No file with that id" : e?.message

/** Look a file up by id: info plus a fresh signed URL. */
export const openFile = (fileId) => async (dispatch) => {
  const id = (fileId || "").trim()
  if (!id) return
  dispatch(lookupStarted())
  try {
    dispatch(lookupDone(await fetchFileView(getTenxGraphClient(), id)))
  } catch (e) {
    dispatch(lookupFailed(lookupMessage(e)))
  }
}

/** Delete a file on the server, then forget it locally. */
export const removeFile = (fileId) => async (dispatch, getState) => {
  try {
    await getTenxGraphClient().deleteFile(fileId)
  } catch (e) {
    notifyError("Could not delete file", e)
    return false
  }
  dispatch(fileRemoved(fileId))
  persist(getState)
  notifySuccess("File deleted")
  return true
}

export default slice.reducer
