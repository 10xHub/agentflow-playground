import { describe, expect, it } from "vitest"

import reducer, {
  changeLocale,
  changeSidebar,
  changeTheme,
  toggleSidebar,
} from "./theme.slice"

describe("theme.slice", () => {
  it("updates theme preferences", () => {
    let state = reducer(undefined, changeTheme("dark"))
    state = reducer(state, changeLocale("hi"))
    state = reducer(state, changeSidebar(false))
    state = reducer(state, toggleSidebar("mobile"))

    expect(state).toEqual({
      theme: "dark",
      sidebar: false,
      local: "hi",
      isSidebarOpn: "mobile",
    })
  })
})
