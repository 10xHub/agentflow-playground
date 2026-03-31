import PropTypes from "prop-types"
import { createContext, useContext, useEffect, useMemo } from "react"
import { useDispatch, useSelector } from "react-redux"

import ct from "@constants/"
import { changeTheme } from "@store/slices/theme.slice"

const initialState = {
  theme: "system",
  setTheme: () => null,
}

const ThemeProviderContext = createContext(initialState)

export const ThemeProvider = ({ children }) => {
  const store = useSelector((st) => st[ct.store.THEME_STORE])
  const dispatch = useDispatch()

  useEffect(() => {
    const root = window.document.documentElement

    root.classList.remove("light", "dark")

    if (store.theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light"

      root.classList.add(systemTheme)
      return
    }

    root.classList.add(store.theme)
  }, [store.theme])

  // const value = {
  //   theme,
  //   setTheme: (theme) => {
  //     localStorage.setItem(storageKey, theme);
  //     setTheme(theme);
  //   },
  // };

  const value = useMemo(
    () => ({
      theme: store.theme,
      setTheme: (newTheme) => {
        dispatch(changeTheme(newTheme))
      },
    }),
    [store, dispatch]
  )

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

ThemeProvider.propTypes = {
  children: PropTypes.node.isRequired,
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }

  return context
}
