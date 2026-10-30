import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import Preview from "./preview"

const { client } = vi.hoisted(() => ({ client: { getFile: vi.fn() } }))
vi.mock("@/lib/tenxgraph-client", () => ({ getTenxGraphClient: () => client }))

beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn(() => "blob:x")
  URL.revokeObjectURL = vi.fn()
})

const blob = (text, type) => new Blob([text], { type })

describe("Preview", () => {
  it("renders an image", async () => {
    client.getFile.mockResolvedValue(blob("x", "image/png"))
    const { container } = render(<Preview fileId="f" mime="image/png" />)
    await waitFor(() => expect(container.querySelector("img")).toBeTruthy())
  })
  it("renders audio and video with controls", async () => {
    client.getFile.mockResolvedValue(blob("x", "audio/mpeg"))
    const a = render(<Preview fileId="f" mime="audio/mpeg" />)
    await waitFor(() =>
      expect(a.container.querySelector("audio[controls]")).toBeTruthy()
    )
    a.unmount()
    client.getFile.mockResolvedValue(blob("x", "video/mp4"))
    const v = render(<Preview fileId="f" mime="video/mp4" />)
    await waitFor(() =>
      expect(v.container.querySelector("video[controls]")).toBeTruthy()
    )
  })
  it("embeds a PDF", async () => {
    client.getFile.mockResolvedValue(blob("x", "application/pdf"))
    const { container } = render(<Preview fileId="f" mime="application/pdf" />)
    await waitFor(() => expect(container.querySelector("embed")).toBeTruthy())
  })
  it("shows text in a code block", async () => {
    client.getFile.mockResolvedValue(blob("hello world", "text/plain"))
    render(<Preview fileId="f" mime="text/plain" />)
    expect(await screen.findByText("hello world")).toBeTruthy()
  })
  it("shows metadata only for other types, without fetching", () => {
    render(<Preview fileId="f" mime="application/zip" />)
    expect(screen.getByText(/No preview for this file type/)).toBeTruthy()
    expect(client.getFile).not.toHaveBeenCalled()
  })
  it("shows an inline error when the download fails", async () => {
    client.getFile.mockRejectedValue(new Error("gone"))
    render(<Preview fileId="f" mime="image/png" />)
    expect(await screen.findByText("gone")).toBeTruthy()
  })
})
