import { useCallback, useState } from "react"

const getTheme = () =>
  document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark"

// Toggles data-theme on <html>; tokens.css swaps the palette off that attribute.
export function useTheme() {
  const [theme, setTheme] = useState(getTheme)
  const toggle = useCallback(() => {
    const next = getTheme() === "light" ? "dark" : "light"
    document.documentElement.setAttribute("data-theme", next)
    setTheme(next)
  }, [])
  return { theme, toggle }
}
