import { configureStore } from "@reduxjs/toolkit"
import { fireEvent, render, screen } from "@testing-library/react"
import { Provider } from "react-redux"
import { describe, expect, it, vi } from "vitest"

import Composer from "@/pages/chat/components/composer"
import { InterruptCard } from "@/pages/chat/components/interrupt-card"
import chatReducer from "@/store/chat-slice"

const { conn } = vi.hoisted(() => ({
  conn: { isConnected: true, isDemo: false },
}))
vi.mock("@/lib/connection/connection-context", () => ({
  useConnection: () => conn,
}))

const base = { id: "i1", node: "gate", message: "Send the email?" }

const card = (interrupt, props = {}) => {
  const onResume = vi.fn()
  render(
    <InterruptCard
      interrupt={interrupt}
      actionable
      onResume={onResume}
      {...props}
    />
  )
  return onResume
}

describe("InterruptCard", () => {
  it("shows the message and sends a schema-valid approval", () => {
    const onResume = card({
      ...base,
      response_schema: {
        type: "object",
        properties: { approved: { type: "boolean" } },
      },
    })
    expect(screen.getByText("Send the email?")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Approve" }))
    expect(onResume).toHaveBeenCalledWith({ approved: true })
  })

  it("rejects with null", () => {
    const onResume = card({ ...base, response_schema: { type: "boolean" } })
    fireEvent.click(screen.getByRole("button", { name: "Reject" }))
    expect(onResume).toHaveBeenCalledWith(null)
  })

  it("shows a Respond field when the interrupt expects input", () => {
    const onResume = card({ ...base, response_schema: { type: "string" } })
    expect(screen.queryByRole("button", { name: "Approve" })).toBeNull()
    const send = screen.getByRole("button", { name: "Respond" })
    expect(send).toBeDisabled()
    fireEvent.change(screen.getByLabelText("Response"), {
      target: { value: "use the short version" },
    })
    fireEvent.click(send)
    expect(onResume).toHaveBeenCalledWith("use the short version")
  })

  it("uses the Respond field when there is no schema", () => {
    card(base)
    expect(screen.getByLabelText("Response")).toBeInTheDocument()
  })

  it("keeps the card open and shows a server error", () => {
    card(base, { error: "interrupt_id does not match" })
    expect(screen.getByRole("alert")).toHaveTextContent("does not match")
    expect(screen.getByLabelText("Response")).toBeInTheDocument()
  })

  it("is read-only in invoke mode", () => {
    card(
      { ...base, response_schema: { type: "boolean" } },
      { actionable: false }
    )
    expect(screen.queryByRole("button", { name: "Approve" })).toBeNull()
    expect(screen.getByText(/needs streaming mode/)).toBeInTheDocument()
  })
})

describe("Composer while an interrupt is pending", () => {
  const renderWith = (mode) => {
    const store = configureStore({
      reducer: { chat: chatReducer },
      preloadedState: undefined,
    })
    store.dispatch({ type: "chat/setMode", payload: mode })
    store.dispatch({
      type: "chat/setPendingInterrupt",
      payload: { interrupt: base },
    })
    render(
      <Provider store={store}>
        <Composer />
      </Provider>
    )
  }

  it("locks free text in stream mode", () => {
    renderWith("stream")
    expect(screen.getByRole("textbox")).toBeDisabled()
  })

  it("leaves it open in invoke mode, where the card is read-only", () => {
    renderWith("invoke")
    expect(screen.getByRole("textbox")).not.toBeDisabled()
  })
})

describe("InterruptCard pauses", () => {
  it("before and after name the node and Continue resumes", () => {
    const onResume = card({ kind: "before", node: "WORK" })
    expect(screen.getByText("Paused before WORK")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Continue" }))
    expect(onResume).toHaveBeenCalledTimes(1)
  })

  it("after reads the same way", () => {
    card({ kind: "after", node: "WORK" })
    expect(screen.getByText("Paused after WORK")).toBeInTheDocument()
  })

  it("is read-only outside streaming mode", () => {
    card({ kind: "after", node: "WORK" }, { actionable: false })
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull()
  })

  it("a client tool wait is a note without buttons", () => {
    card({ kind: "remote_tool", node: "TOOL", tool: "pick_color" })
    expect(
      screen.getByText("Waiting for client tool pick_color")
    ).toBeInTheDocument()
    expect(screen.queryByRole("button")).toBeNull()
  })
})
