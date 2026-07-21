import { useEffect } from "react"
import { useLocation } from "react-router-dom"

import { trackPageView } from "@/lib/analytics"

// Route -> human-readable title, mirroring the routes declared in App.jsx.
const TITLES = {
  "/": "Connection",
  "/chat": "Chat",
  "/live": "Live",
  "/threads": "Threads",
  "/observability": "Observability",
  "/evals": "Evals",
  "/memory": "Memory",
  "/graph": "Graph",
  "/tools": "Tools",
  "/files": "Files",
  "/settings": "Settings",
}

/**
 * Logs a page_view on every route change. React Router does not do this on
 * client-side navigation, so it must be manual.
 */
export const useAnalyticsPageViews = () => {
  const { pathname } = useLocation()

  useEffect(() => {
    trackPageView(pathname, TITLES[pathname])
  }, [pathname])
}

/**
 * Renders nothing; exists so the hook can run inside the router.
 */
const AnalyticsTracker = () => {
  useAnalyticsPageViews()
  return null
}

export default AnalyticsTracker
