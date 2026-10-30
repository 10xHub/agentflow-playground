import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import MemoryForm, { validateMemoryForm } from "./memory-form"

describe("validateMemoryForm", () => {
  const ok = {
    content: "x",
    memory_type: "semantic",
    category: "c",
    metadataText: "{}",
  }
  it("accepts a valid form and parses metadata", () => {
    expect(validateMemoryForm({ ...ok, metadataText: '{"a":1}' })).toEqual({
      errors: {},
      value: {
        content: "x",
        memory_type: "semantic",
        category: "c",
        metadata: { a: 1 },
      },
    })
  })
  it("treats blank metadata as empty", () => {
    expect(
      validateMemoryForm({ ...ok, metadataText: "  " }).value.metadata
    ).toEqual({})
  })
  it("requires content", () => {
    expect(
      validateMemoryForm({ ...ok, content: "  " }).errors.content
    ).toBeTruthy()
  })
  it("rejects invalid JSON and non-object JSON", () => {
    expect(
      validateMemoryForm({ ...ok, metadataText: "{bad" }).errors.metadata
    ).toBeTruthy()
    expect(
      validateMemoryForm({ ...ok, metadataText: "[1]" }).errors.metadata
    ).toBeTruthy()
  })
})

describe("MemoryForm", () => {
  it("blocks submit on invalid metadata with an inline message", () => {
    const onSubmit = vi.fn()
    render(<MemoryForm mode="create" onSubmit={onSubmit} onCancel={vi.fn()} />)
    fireEvent.change(screen.getByLabelText("Content"), {
      target: { value: "hi" },
    })
    fireEvent.change(screen.getByLabelText("Metadata (JSON)"), {
      target: { value: "{bad" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save memory" }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole("alert").textContent).toMatch(/valid JSON/i)
  })
  it("submits the parsed values", () => {
    const onSubmit = vi.fn().mockResolvedValue(true)
    render(<MemoryForm mode="create" onSubmit={onSubmit} onCancel={vi.fn()} />)
    fireEvent.change(screen.getByLabelText("Content"), {
      target: { value: "hi" },
    })
    fireEvent.change(screen.getByLabelText("Category"), {
      target: { value: "notes" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save memory" }))
    expect(onSubmit).toHaveBeenCalledWith({
      content: "hi",
      memory_type: "episodic",
      category: "notes",
      metadata: {},
    })
  })
  it("locks type and category when editing", () => {
    render(
      <MemoryForm
        mode="edit"
        initial={{
          content: "a",
          memory_type: "entity",
          category: "c",
          metadata: { k: 1 },
        }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByLabelText("Type").disabled).toBe(true)
    expect(screen.getByLabelText("Category").disabled).toBe(true)
    expect(screen.getByLabelText("Metadata (JSON)").value).toContain('"k": 1')
  })
})
