import { configureStore } from "@reduxjs/toolkit"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { Provider } from "react-redux"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

import filesReducer from "@/store/files-slice"

import FilesPage from "./files-page"

const { client, demo } = vi.hoisted(() => ({
  client: { getMultimodalConfig: vi.fn(), listFiles: vi.fn() },
  demo: { on: false },
}))
vi.mock("@/lib/tenxgraph-client", () => ({ getTenxGraphClient: () => client }))
vi.mock("@/lib/demo/demo-mode", () => ({ isDemoActive: () => demo.on }))

const renderPage = () =>
  render(
    <Provider store={configureStore({ reducer: { files: filesReducer } })}>
      <MemoryRouter>
        <FilesPage />
      </MemoryRouter>
    </Provider>
  )

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  demo.on = false
  client.listFiles.mockResolvedValue({
    data: { files: [], has_more: false, offset: 0, limit: 50 },
  })
  client.getMultimodalConfig.mockResolvedValue({
    data: {
      media_storage_type: "local",
      media_max_size_mb: 25,
      document_handling: "extract_text",
    },
  })
})

describe("FilesPage", () => {
  it("shows the multimodal config header", async () => {
    renderPage()
    expect(await screen.findByText("local")).toBeTruthy()
    expect(screen.getByText("25 MB")).toBeTruthy()
    expect(screen.getByText("extract_text")).toBeTruthy()
  })
  it("shows an empty recent list", async () => {
    renderPage()
    expect(await screen.findByText(/No files uploaded yet/)).toBeTruthy()
  })
  it("lists server files and pages with Load more", async () => {
    const row = (id) => ({
      file_id: id,
      filename: `${id}.pdf`,
      mime_type: "application/pdf",
      size_bytes: 10,
      created_at: null,
    })
    client.listFiles.mockResolvedValueOnce({
      data: { files: [row("a")], has_more: true },
    })
    renderPage()
    expect(await screen.findByText("a.pdf")).toBeTruthy()
    client.listFiles.mockResolvedValueOnce({
      data: { files: [row("b")], has_more: false },
    })
    fireEvent.click(screen.getByRole("button", { name: "Load more" }))
    expect(await screen.findByText("b.pdf")).toBeTruthy()
    expect(client.listFiles).toHaveBeenLastCalledWith({ limit: 50, offset: 1 })
    expect(screen.queryByRole("button", { name: "Load more" })).toBeNull()
  })
  it("falls back to the session list with a note on a 501", async () => {
    client.listFiles.mockRejectedValue(
      Object.assign(new Error("no list"), { statusCode: 501 })
    )
    renderPage()
    expect(await screen.findByText(/cannot list files/)).toBeTruthy()
    expect(screen.getByText(/No files uploaded in this session/)).toBeTruthy()
  })
  it("turns uploads off in the demo", async () => {
    demo.on = true
    renderPage()
    expect(await screen.findByText(/uploads are off in the demo/i)).toBeTruthy()
    expect(client.getMultimodalConfig).not.toHaveBeenCalled()
    await waitFor(() =>
      expect(screen.getByLabelText("Choose a file").disabled).toBe(true)
    )
  })
})
