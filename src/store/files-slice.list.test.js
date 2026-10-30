import { configureStore } from "@reduxjs/toolkit"
import { beforeEach, describe, expect, it, vi } from "vitest"

import filesReducer, {
  loadFileList,
  loadMoreFiles,
  removeFile,
  RECENT_KEY,
} from "@/store/files-slice"

const { client } = vi.hoisted(() => ({
  client: { listFiles: vi.fn(), deleteFile: vi.fn() },
}))
vi.mock("@/lib/tenxgraph-client", () => ({ getTenxGraphClient: () => client }))
vi.mock("@/lib/notify", () => ({
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}))
vi.mock("@/lib/demo/demo-mode", () => ({ isDemoActive: () => false }))

const make = () => configureStore({ reducer: { files: filesReducer } })
const row = (id) => ({
  file_id: id,
  filename: `${id}.txt`,
  mime_type: "text/plain",
  size_bytes: 1,
  created_at: 1,
})
const page = (ids, has_more) => ({ data: { files: ids.map(row), has_more } })

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

describe("server file list", () => {
  it("loads the first page and keeps has_more", async () => {
    client.listFiles.mockResolvedValue(page(["a", "b"], true))
    const store = make()
    await store.dispatch(loadFileList())
    expect(client.listFiles).toHaveBeenCalledWith({ limit: 50, offset: 0 })
    const { list } = store.getState().files
    expect(list.status).toBe("ready")
    expect(list.items.map((f) => f.file_id)).toEqual(["a", "b"])
    expect(list.hasMore).toBe(true)
  })

  it("Load more appends the next page at the current offset", async () => {
    client.listFiles.mockResolvedValueOnce(page(["a", "b"], true))
    const store = make()
    await store.dispatch(loadFileList())
    client.listFiles.mockResolvedValueOnce(page(["c"], false))
    await store.dispatch(loadMoreFiles())
    expect(client.listFiles).toHaveBeenLastCalledWith({ limit: 50, offset: 2 })
    const { list } = store.getState().files
    expect(list.items.map((f) => f.file_id)).toEqual(["a", "b", "c"])
    expect(list.hasMore).toBe(false)
  })

  it("a 501 falls back to the session list", async () => {
    client.listFiles.mockRejectedValue(
      Object.assign(new Error("cannot list"), { statusCode: 501 })
    )
    const store = make()
    await store.dispatch(loadFileList())
    expect(store.getState().files.list.status).toBe("unsupported")
  })

  it("other failures keep the message", async () => {
    client.listFiles.mockRejectedValue(new Error("boom"))
    const store = make()
    await store.dispatch(loadFileList())
    const { list } = store.getState().files
    expect(list.status).toBe("error")
    expect(list.error).toBe("boom")
  })

  it("deleting a file removes it from the server list", async () => {
    client.listFiles.mockResolvedValue(page(["a", "b"], false))
    client.deleteFile.mockResolvedValue({})
    const store = make()
    await store.dispatch(loadFileList())
    await store.dispatch(removeFile("a"))
    expect(store.getState().files.list.items.map((f) => f.file_id)).toEqual([
      "b",
    ])
    expect(localStorage.getItem(RECENT_KEY)).toBe("[]")
  })
})
