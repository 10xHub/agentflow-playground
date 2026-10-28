import { configureStore } from "@reduxjs/toolkit"
import { render, screen } from "@testing-library/react"
import { Provider } from "react-redux"
import { describe, expect, it, vi } from "vitest"

import Composer from "@/pages/chat/components/composer"
import chatReducer from "@/store/chat-slice"

const { conn } = vi.hoisted(() => ({
  conn: { isConnected: true, isDemo: false },
}))
vi.mock("@/lib/connection/connection-context", () => ({
  useConnection: () => conn,
}))
const { uploadMedia, sendClient } = vi.hoisted(() => ({
  uploadMedia: vi.fn(),
  sendClient: {},
}))
vi.mock("@/lib/files/upload", () => ({ uploadMedia }))
vi.mock("@/lib/tenxgraph-client", () => ({
  getTenxGraphClient: () => sendClient,
}))

const renderComposer = () => {
  const store = configureStore({ reducer: { chat: chatReducer } })
  render(
    <Provider store={store}>
      <Composer />
    </Provider>
  )
}

describe("Composer", () => {
  it("accepts free text on a live server", () => {
    conn.isDemo = false
    renderComposer()
    expect(screen.getByRole("textbox")).not.toBeDisabled()
  })

  it("locks free text in the recorded demo", () => {
    conn.isDemo = true
    renderComposer()
    const box = screen.getByRole("textbox")
    expect(box).toBeDisabled()
    expect(box).toHaveAttribute(
      "placeholder",
      "Recorded demo: pick a prompt above"
    )
  })
})

describe("Composer attachments", () => {
  const file = new File(["abc"], "pic.png", { type: "image/png" })

  const setup = async (demo = false) => {
    conn.isDemo = demo
    const { configureStore: cs } = await import("@reduxjs/toolkit")
    const store = cs({
      reducer: { chat: chatReducer },
      middleware: (gdm) => gdm({ serializableCheck: false }),
    })
    const { fireEvent, waitFor } = await import("@testing-library/react")
    render(
      <Provider store={store}>
        <Composer />
      </Provider>
    )
    return { store, fireEvent, waitFor }
  }

  it("uploads a picked file, shows a chip, and sends it as a file_id block", async () => {
    uploadMedia.mockResolvedValueOnce({
      file_id: "f1",
      mime_type: "image/png",
      filename: "pic.png",
      size_bytes: 3,
    })
    sendClient.stream = vi.fn(() =>
      (async function* () {
        yield {
          event: "message",
          thread_id: "t",
          message: { role: "assistant", content: "ok" },
        }
      })()
    )
    const { store, fireEvent, waitFor } = await setup()
    fireEvent.change(screen.getByLabelText("Attach file"), {
      target: { files: [file] },
    })
    await screen.findByText("pic.png")
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Send" })).not.toBeDisabled()
    )
    fireEvent.click(screen.getByRole("button", { name: "Send" }))
    await waitFor(() => expect(sendClient.stream).toHaveBeenCalled())
    const [messages] = sendClient.stream.mock.calls[0]
    expect(messages[0].content[0]).toMatchObject({
      type: "image",
      media: { file_id: "f1" },
    })
    expect(store.getState().chat.messages[0].attachments[0].file_id).toBe("f1")
    await waitFor(() => expect(screen.queryByText("pic.png")).toBeNull())
  })

  it("shows the mapped error for a failed upload and does not allow sending it", async () => {
    uploadMedia.mockRejectedValueOnce(new Error("File is larger than 10 MB"))
    const { fireEvent } = await setup()
    fireEvent.change(screen.getByLabelText("Attach file"), {
      target: { files: [file] },
    })
    expect(await screen.findByText("File is larger than 10 MB")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled()
  })

  it("is not offered in the recorded demo", async () => {
    await setup(true)
    expect(screen.queryByLabelText("Attach file")).toBeNull()
  })

  it("removing a chip drops it", async () => {
    uploadMedia.mockResolvedValueOnce({
      file_id: "f1",
      mime_type: "image/png",
      filename: "pic.png",
      size_bytes: 3,
    })
    const { fireEvent } = await setup()
    fireEvent.change(screen.getByLabelText("Attach file"), {
      target: { files: [file] },
    })
    await screen.findByText("pic.png")
    fireEvent.click(screen.getByRole("button", { name: "Remove pic.png" }))
    expect(screen.queryByText("pic.png")).toBeNull()
  })
})
