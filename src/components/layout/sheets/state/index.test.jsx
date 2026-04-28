import { describe, expect, it } from "vitest"

import { getSchemaFields } from "./index"

describe("getSchemaFields", () => {
  it("includes runtime-only state keys in the dynamic field list", () => {
    const { dynamicFields, getFieldInfo } = getSchemaFields(
      {
        user_preferences: {
          title: "User Preferences",
          description: "Profile level preference data",
          type: "object",
        },
      },
      {
        context: [],
        context_summary: "",
        execution_meta: {},
        preferred_colors: ["navy"],
        company_name: "Fashionista Inc.",
      }
    )

    expect(dynamicFields).toEqual([
      "user_preferences",
      "preferred_colors",
      "company_name",
    ])
    expect(getFieldInfo("user_preferences")).toEqual({
      title: "User Preferences",
      description: "Profile level preference data",
      type: "object",
      default: undefined,
    })
    expect(getFieldInfo("company_name")).toEqual({
      title: "company_name",
      description: "Additional state data field",
      type: "string",
    })
  })
})
