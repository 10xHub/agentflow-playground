import { renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ConnectionContext } from "./connection-store-context"
import { can } from "./me"
import { useCan } from "./use-can"

const withMe = (me) => {
  const value = { can: (permission) => can(me, permission) }
  // eslint-disable-next-line react/prop-types
  return ({ children }) => (
    <ConnectionContext.Provider value={value}>
      {children}
    </ConnectionContext.Provider>
  )
}

describe("useCan", () => {
  it("allows everything without a provider", () => {
    const { result } = renderHook(() => useCan())
    expect(result.current("threads:delete")).toBe(true)
  })

  it("follows the caller's permissions", () => {
    const wrapper = withMe({ permissions: ["threads:read", "graph:*"] })
    const { result } = renderHook(() => useCan(), { wrapper })
    expect(result.current("threads:delete")).toBe(false)
    expect(result.current("graph:stop")).toBe(true)
  })

  it("allows everything when /v1/me is unknown", () => {
    const { result } = renderHook(() => useCan(), { wrapper: withMe(null) })
    expect(result.current("files:delete")).toBe(true)
  })
})
