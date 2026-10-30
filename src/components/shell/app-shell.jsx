import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react"
import { Outlet } from "react-router-dom"

import { Toaster } from "@/components/ui/toaster"

import styles from "./AppShell.module.css"
import ConnectionBar from "./connection-bar"
import DemoBanner from "./demo-banner"
import Sidebar from "./sidebar"

// Lets a page inject content into the shared connection bar (e.g. Chat's
// inspector toggle) without the shell knowing about page internals.
const BarSlotContext = createContext(null)

/**
 *
 */
export const useConnectionBarSlot = () => useContext(BarSlotContext)

const COLLAPSED_STORAGE_KEY = "10xgraph.sidebarCollapsed"

const readCollapsed = () => {
  try {
    return localStorage.getItem(COLLAPSED_STORAGE_KEY) === "1"
  } catch {
    return false
  }
}

const writeCollapsed = (collapsed) => {
  try {
    localStorage.setItem(COLLAPSED_STORAGE_KEY, collapsed ? "1" : "0")
  } catch {
    /* ignore write failures (private mode); the flag still holds this session */
  }
}

/**
 * Persistent chrome for every app route: connection bar + collapsible left rail.
 * The routed page renders into the flexible content region and owns its own
 * inner layout (main + optional right panel).
 */
const AppShell = () => {
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [barRight, setBarRight] = useState(null)

  const toggleCollapse = useCallback(() => {
    setCollapsed((c) => {
      const next = !c
      writeCollapsed(next)
      return next
    })
  }, [])
  const slot = useMemo(() => ({ setBarRight }), [])

  return (
    <div className={styles.app}>
      <ConnectionBar right={barRight} />
      <Toaster />
      <div className={styles.shell}>
        <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} />
        <div className={styles.column}>
          <DemoBanner />
          <main className={styles.content}>
            <BarSlotContext.Provider value={slot}>
              <Outlet />
            </BarSlotContext.Provider>
          </main>
        </div>
      </div>
    </div>
  )
}

export default AppShell
