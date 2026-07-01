import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import useFormData from "./useFormData"

describe("useFormData", () => {
  it("hydrates form data from state and schema defaults", () => {
    const { result } = renderHook(() =>
      useFormData(
        {
          context: ["existing"],
          context_summary: "Summary",
          execution_meta: { status: "running", step: 3 },
          retries: 2,
        },
        {
          retries: { type: "number" },
          enabled: { type: "boolean" },
          name: { type: "string", default: "agent" },
        }
      )
    )

    expect(result.current.formData).toEqual({
      context: ["existing"],
      context_summary: "Summary",
      execution_meta: expect.objectContaining({
        status: "running",
        step: 3,
        current_node: "",
      }),
      retries: 2,
      enabled: false,
      name: "agent",
    })
  })

  it("supports field and nested updates", () => {
    const stateData = {}
    const stateSchema = {}
    const { result } = renderHook(() => useFormData(stateData, stateSchema))

    act(() => {
      result.current.updateField("execution_meta.current_node", "planner")
      result.current.updateNumberField("execution_meta.step", "12")
      result.current.updateNumberField("execution_meta.failed", "not-a-number")
    })

    expect(result.current.formData.execution_meta.current_node).toBe("planner")
    expect(result.current.formData.execution_meta.step).toBe(12)
    expect(result.current.formData.execution_meta.failed).toBe(0)
  })

  it("supports array operations", () => {
    const stateData = { items: ["first", "second"] }
    const stateSchema = { items: { type: "array" } }
    const { result } = renderHook(() => useFormData(stateData, stateSchema))

    act(() => {
      result.current.addArrayItem("items", "third")
      result.current.updateArrayItem("items", 1, "updated")
      result.current.removeArrayItem("items", 0)
    })

    expect(result.current.formData.items).toEqual(["updated", "third"])
  })

  it("updates when upstream state changes", () => {
    const { result, rerender } = renderHook(
      ({ stateData }) => useFormData(stateData, { count: { type: "number" } }),
      {
        initialProps: {
          stateData: { count: 1, context: [], execution_meta: {} },
        },
      }
    )

    rerender({
      stateData: {
        count: 5,
        context: ["next"],
        context_summary: "Updated",
        execution_meta: { status: "done" },
      },
    })

    expect(result.current.formData.count).toBe(5)
    expect(result.current.formData.context).toEqual(["next"])
    expect(result.current.formData.context_summary).toBe("Updated")
    expect(result.current.formData.execution_meta.status).toBe("done")
  })

  it("preserves runtime-only fields that are missing from the schema", () => {
    const { result } = renderHook(() =>
      useFormData(
        {
          context: [],
          context_summary: "",
          execution_meta: {},
          preferred_occasions: ["date night"],
          company_name: "Fashionista Inc.",
          user_preferences: { fit: "relaxed" },
        },
        {}
      )
    )

    expect(result.current.formData.preferred_occasions).toEqual(["date night"])
    expect(result.current.formData.company_name).toBe("Fashionista Inc.")
    expect(result.current.formData.user_preferences).toEqual({ fit: "relaxed" })
  })
})
