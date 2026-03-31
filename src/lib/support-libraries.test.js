import React from "react"
import { describe, expect, it } from "vitest"

import { ReactQueryDevtools } from "@/lib/devtools"
import { getMenuList } from "@/lib/menu-list"
import { asyncStoragePersister, queryClient } from "@/lib/query-client"

describe("support libraries", () => {
  it("returns menu groups with active states", () => {
    const menuList = getMenuList("/posts/new")

    expect(menuList).toHaveLength(3)
    expect(menuList[0].menus[0].active).toBe(false)
    expect(menuList[1].menus[0].active).toBe(true)
    expect(menuList[1].menus[0].submenus[1].active).toBe(true)
    expect(menuList[2].menus[0].label).toBe("Users")
  })

  it("creates the query client and async persister", () => {
    expect(queryClient.getDefaultOptions().queries.gcTime).toBe(
      1000 * 60 * 60 * 24
    )
    expect(asyncStoragePersister).toBeTruthy()
  })

  it("exposes the lazy devtools component in test mode", () => {
    expect(ReactQueryDevtools.$$typeof).toBe(Symbol.for("react.lazy"))
    expect(React.isValidElement(React.createElement(ReactQueryDevtools))).toBe(
      true
    )
  })
})
