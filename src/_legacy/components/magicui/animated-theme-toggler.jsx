"use client"
import { Moon, SunDim } from "lucide-react"
import PropTypes from "prop-types"
import { useRef } from "react"
import { flushSync } from "react-dom"

import { useTheme } from "@/lib/context/theme-provider"
import { cn } from "@/lib/utils"

export const AnimatedThemeToggler = ({ className }) => {
  const { theme, setTheme } = useTheme()
  const buttonReference = useRef(null)

  // Determine if current theme is dark
  const isDarkMode =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)

  const handleThemeChange = async () => {
    if (!buttonReference.current) return

    // Check if browser supports View Transitions
    if (typeof document === "undefined" || !document.startViewTransition) {
      // Fallback for browsers without View Transitions support
      setTheme(isDarkMode ? "light" : "dark")
      return
    }

    await document.startViewTransition(() => {
      flushSync(() => {
        setTheme(isDarkMode ? "light" : "dark")
      })
    }).ready

    const { top, left, width, height } =
      buttonReference.current.getBoundingClientRect()
    const y = top + height / 2
    const x = left + width / 2

    const right = window.innerWidth - left
    const bottom = window.innerHeight - top
    const maxRad = Math.hypot(Math.max(left, right), Math.max(top, bottom))

    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${maxRad}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration: 700,
        easing: "ease-in-out",
        pseudoElement: "::view-transition-new(root)",
      }
    )
  }

  return (
    <button
      ref={buttonReference}
      onClick={handleThemeChange}
      className={cn(className)}
      type="button"
      aria-label="Toggle theme"
    >
      {isDarkMode ? <SunDim /> : <Moon />}
    </button>
  )
}

AnimatedThemeToggler.propTypes = {
  className: PropTypes.string,
}

AnimatedThemeToggler.defaultProps = {
  className: "",
}
