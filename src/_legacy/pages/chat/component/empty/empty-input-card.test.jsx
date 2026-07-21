import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import EmptyInputCard from "./empty-input-card"

describe("EmptyInputCard", () => {
  const defaultProps = {
    onHandleSubmit: vi.fn(),
    message: "",
    setMessage: vi.fn(),
    onHandleFileChange: vi.fn(),
    attachedFiles: [],
    handleRemove: vi.fn(),
    fileInputReference: { current: null },
    disabled: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders textarea and send button", () => {
    render(<EmptyInputCard {...defaultProps} />)

    expect(
      screen.getByPlaceholderText(/type your message/i)
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /send/i })).toBeInTheDocument()
  })

  it("disables send button when message is empty and no files attached", () => {
    render(<EmptyInputCard {...defaultProps} />)

    expect(screen.getByRole("button", { name: /send/i })).toBeDisabled()
  })

  it("enables send button when message has content", () => {
    render(<EmptyInputCard {...defaultProps} message="Hello world" />)

    expect(screen.getByRole("button", { name: /send/i })).toBeEnabled()
  })

  it("enables send button when files are attached", () => {
    const mockFile = new File(["data"], "test.png", { type: "image/png" })
    render(<EmptyInputCard {...defaultProps} attachedFiles={[mockFile]} />)

    expect(screen.getByRole("button", { name: /send/i })).toBeEnabled()
  })

  it("disables all inputs when disabled prop is true", () => {
    render(<EmptyInputCard {...defaultProps} disabled />)

    expect(
      screen.getByPlaceholderText(/backend url not verified/i)
    ).toBeDisabled()
    expect(screen.getByRole("button", { name: /send/i })).toBeDisabled()
  })

  it("calls onHandleSubmit when form is submitted with message", () => {
    const handleSubmit = vi.fn()
    render(
      <EmptyInputCard
        {...defaultProps}
        message="Test message"
        onHandleSubmit={handleSubmit}
      />
    )

    const form = screen.getByRole("textbox").closest("form")
    fireEvent.submit(form)

    expect(handleSubmit).toHaveBeenCalled()
  })

  it("calls setMessage when textarea value changes", () => {
    const setMessage = vi.fn()
    render(<EmptyInputCard {...defaultProps} setMessage={setMessage} />)

    const textarea = screen.getByRole("textbox")
    fireEvent.change(textarea, { target: { value: "New message" } })

    expect(setMessage).toHaveBeenCalledWith("New message")
  })

  it("displays file previews when files are attached", () => {
    const mockFile = new File(["data"], "photo.png", { type: "image/png" })
    render(<EmptyInputCard {...defaultProps} attachedFiles={[mockFile]} />)

    expect(screen.getByText("photo.png")).toBeInTheDocument()
  })

  it("displays multiple file previews", () => {
    const mockFiles = [
      new File(["data"], "photo.png", { type: "image/png" }),
      new File(["data"], "doc.pdf", { type: "application/pdf" }),
    ]
    render(<EmptyInputCard {...defaultProps} attachedFiles={mockFiles} />)

    expect(screen.getByText("photo.png")).toBeInTheDocument()
    expect(screen.getByText("doc.pdf")).toBeInTheDocument()
  })

  it("calls onRemoveFile when file remove button is clicked", () => {
    const onRemoveFile = vi.fn()
    const mockFile = new File(["data"], "photo.png", { type: "image/png" })
    render(
      <EmptyInputCard
        {...defaultProps}
        attachedFiles={[mockFile]}
        onRemoveFile={onRemoveFile}
      />
    )

    const removeButton = screen.getByRole("button", { name: "" })
    fireEvent.click(removeButton)

    expect(onRemoveFile).toHaveBeenCalledWith(mockFile)
  })

  it("shows file size in KB", () => {
    const mockFile = new File(["a".repeat(2048)], "test.txt", {
      type: "text/plain",
    })
    render(<EmptyInputCard {...defaultProps} attachedFiles={[mockFile]} />)

    expect(screen.getByText("2 KB")).toBeInTheDocument()
  })

  it("shows attach button with paperclip icon", () => {
    render(<EmptyInputCard {...defaultProps} />)

    const attachLabel = screen.getByText(/attach/i)
    expect(attachLabel).toBeInTheDocument()
  })

  it("submits on Enter key press without Shift", () => {
    const handleSubmit = vi.fn()
    render(
      <EmptyInputCard
        {...defaultProps}
        message="Test"
        onHandleSubmit={handleSubmit}
      />
    )

    const textarea = screen.getByRole("textbox")
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false })

    expect(handleSubmit).toHaveBeenCalled()
  })

  it("does not submit on Shift+Enter", () => {
    const handleSubmit = vi.fn()
    render(
      <EmptyInputCard
        {...defaultProps}
        message="Test"
        onHandleSubmit={handleSubmit}
      />
    )

    const textarea = screen.getByRole("textbox")
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true })

    expect(handleSubmit).not.toHaveBeenCalled()
  })
})
