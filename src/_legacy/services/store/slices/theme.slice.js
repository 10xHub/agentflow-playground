import { createSlice } from "@reduxjs/toolkit"

import stores from "@constants/"

export const themeSlice = createSlice({
  name: stores.store.THEME_STORE,
  initialState: {
    theme: "system",
    sidebar: true,
    local: "en",
    isSidebarOpn: "",
  },
  reducers: {
    changeLocale: (state, action) => {
      state.local = action.payload
    },
    changeSidebar: (state, action) => {
      state.sidebar = action.payload
    },
    changeTheme: (state, action) => {
      state.theme = action.payload
    },
    toggleSidebar: (state, action) => {
      state.isSidebarOpn = action.payload
    },
  },
})

export const { changeLocale, changeSidebar, changeTheme, toggleSidebar } =
  themeSlice.actions

export default themeSlice.reducer
