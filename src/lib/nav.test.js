import { describe, expect, it } from "vitest"

import { NAV_GROUPS } from "./nav"

describe("nav", () => {
  it("lists Run trace at /trace and no Observability entry", () => {
    const items = NAV_GROUPS.flatMap((g) => g.items)
    expect(items.find((i) => i.to === "/trace")?.label).toBe("Run trace")
    expect(items.some((i) => i.to === "/observability")).toBe(false)
  })
})
