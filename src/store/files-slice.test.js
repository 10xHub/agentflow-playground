import { configureStore } from "@reduxjs/toolkit"
import { beforeEach, describe, expect, it, vi } from "vitest"

import filesReducer, {
  loadFilesConfig,
  openFile,
  removeFile,
  RECENT_KEY,
  uploadSelected,
} from "@/store/files-slice"

const { client, notifyError, notifySuccess, demo } = vi.hoisted(() => ({
  client: {
    getMultimodalConfig: vi.fn(),
    uploadFile: vi.fn(),
    getFileInfo: vi.fn(),
    getFileAccessUrl: vi.fn(),
    deleteFile: vi.fn(),
  },
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
  demo: { on: false },
}))
vi.mock("@/lib/tenxgraph-client", () => ({ getTenxGraphClient: () => client }))
vi.mock("@/lib/notify", () => ({ notifyError, notifySuccess }))
vi.mock("@/lib/demo/demo-mode", () => ({ isDemoActive: () => demo.on }))

const make = () => configureStore({ reducer: { files: filesReducer } })
const uploaded = {
  file_id: "f1",
  filename: "a.txt",
  mime_type: "text/plain",
  size_bytes: 5,
  extracted_text: "hello",
  url: "graph://media/f1",
  direct_url: "https://x/f1",
  direct_url_expires_at: 1,
}
const file = { name: "a.txt", size: 5 }
const statusErr = (statusCode) => Object.assign(new Error("x"), { statusCode })

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  demo.on = false
  client.getMultimodalConfig.mockResolvedValue({
    data: {
      media_storage_type: "local",
      media_max_size_mb: 25,
      document_handling: "extract_text",
    },
  })
  client.uploadFile.mockResolvedValue({ data: uploaded })
  client.getFileInfo.mockResolvedValue({ data: { ...uploaded } })
  client.getFileAccessUrl.mockResolvedValue({
    data: {
      file_id: "f1",
      url: "https://x/f1",
      expires_at: 99,
      mime_type: "text/plain",
    },
  })
  client.deleteFile.mockResolvedValue({
    data: { file_id: "f1", deleted: true },
  })
})

describe("loadFilesConfig", () => {
  it("stores storage type, max size and document handling", async () => {
    const store = make()
    await store.dispatch(loadFilesConfig())
    expect(store.getState().files.config).toMatchObject({
      status: "ready",
      storageType: "local",
      maxSizeMb: 25,
      documentHandling: "extract_text",
    })
  })
  it("records a failure for an inline note", async () => {
    client.getMultimodalConfig.mockRejectedValue(new Error("down"))
    const store = make()
    await store.dispatch(loadFilesConfig())
    expect(store.getState().files.config).toMatchObject({
      status: "error",
      error: "down",
    })
  })
})

describe("uploadSelected", () => {
  it("shows the result, adds to recent and persists it", async () => {
    const store = make()
    await store.dispatch(loadFilesConfig())
    await store.dispatch(uploadSelected(file))
    const s = store.getState().files
    expect(s.upload.status).toBe("idle")
    expect(s.current.file_id).toBe("f1")
    expect(s.recent.map((r) => r.file_id)).toEqual(["f1"])
    expect(JSON.parse(localStorage.getItem(RECENT_KEY))[0].file_id).toBe("f1")
  })
  it.each([
    [413, "File is larger than 25 MB"],
    [415, "This file type is not allowed"],
    [400, "Empty file or missing name"],
  ])("maps %s to plain text", async (code, text) => {
    client.uploadFile.mockRejectedValue(statusErr(code))
    const store = make()
    await store.dispatch(loadFilesConfig())
    await store.dispatch(uploadSelected(file))
    expect(store.getState().files.upload).toMatchObject({
      status: "error",
      error: text,
    })
    expect(store.getState().files.recent).toEqual([])
  })
  it("does not touch localStorage in demo mode", async () => {
    demo.on = true
    const store = make()
    await store.dispatch(uploadSelected(file))
    expect(localStorage.getItem(RECENT_KEY)).toBeNull()
  })
})

describe("recent list", () => {
  it("loads from localStorage outside the demo", () => {
    localStorage.setItem(RECENT_KEY, JSON.stringify([{ file_id: "old" }]))
    expect(make().getState().files.recent[0].file_id).toBe("old")
  })
  it("is skipped in the demo", () => {
    demo.on = true
    localStorage.setItem(RECENT_KEY, JSON.stringify([{ file_id: "old" }]))
    expect(make().getState().files.recent).toEqual([])
  })
})

describe("openFile", () => {
  it("loads info and a signed url", async () => {
    const store = make()
    await store.dispatch(openFile("f1"))
    const s = store.getState().files
    expect(s.current).toMatchObject({
      file_id: "f1",
      direct_url: "https://x/f1",
      direct_url_expires_at: 99,
    })
    expect(s.lookup.status).toBe("idle")
  })
  it("reports a missing file inline", async () => {
    client.getFileInfo.mockRejectedValue(statusErr(404))
    const store = make()
    await store.dispatch(openFile("nope"))
    expect(store.getState().files.lookup.status).toBe("error")
    expect(store.getState().files.current).toBeNull()
  })
})

describe("removeFile", () => {
  it("deletes, drops it from recent and toasts", async () => {
    const store = make()
    await store.dispatch(uploadSelected(file))
    await store.dispatch(removeFile("f1"))
    expect(client.deleteFile).toHaveBeenCalledWith("f1")
    expect(store.getState().files.recent).toEqual([])
    expect(store.getState().files.current).toBeNull()
    expect(notifySuccess).toHaveBeenCalled()
  })
  it("keeps the file and toasts when delete fails", async () => {
    const store = make()
    await store.dispatch(uploadSelected(file))
    client.deleteFile.mockRejectedValue(new Error("owner only"))
    await store.dispatch(removeFile("f1"))
    expect(store.getState().files.recent).toHaveLength(1)
    expect(notifyError).toHaveBeenCalledWith(
      "Could not delete file",
      expect.any(Error)
    )
  })
})
