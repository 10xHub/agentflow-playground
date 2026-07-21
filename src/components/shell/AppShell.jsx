import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react"
import { Outlet } from "react-router-dom"

import styles from "./AppShell.module.css"
import ConnectionBar from "./ConnectionBar"
import Sidebar from "./Sidebar"

// Lets a page inject content into the shared connection bar (e.g. Chat's
// inspector toggle) without the shell knowing about page internals.
const BarSlotContext = createContext(null)

/**
 *
 */
export const useConnectionBarSlot = () => useContext(BarSlotContext)

/**
 * Persistent chrome for every app route: connection bar + collapsible left rail.
 * The routed page renders into the flexible content region and owns its own
 * inner layout (main + optional right panel).
 */
export default function AppShell() {
  const [collapsed, setCollapsed] = useState(false)
  const [barRight, setBarRight] = useState(null)

  const toggleCollapse = useCallback(() => setCollapsed((c) => !c), [])
  const slot = useMemo(() => ({ setBarRight }), [])

  return (
    <div className={styles.app}>
      <ConnectionBar right={barRight} />
      <div className={styles.shell}>
        <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} />
        <main className={styles.content}>
          <BarSlotContext.Provider value={slot}>
            <Outlet />
          </BarSlotContext.Provider>
        </main>
      </div>
    </div>
  )
}
