import { ChevronsLeft, Settings } from "lucide-react"
import { useSelector } from "react-redux"
import { NavLink } from "react-router-dom"

import { NAV_GROUPS } from "@/lib/nav"

import styles from "./Sidebar.module.css"

/**
 * Grouped left rail (Interact / Inspect / Build) + footer (Settings, Collapse).
 * Collapsed mode is icon-only with tooltips; state is owned by AppShell.
 */
export default function Sidebar({ collapsed, onToggleCollapse }) {
  // Live local count for the Thread Inspector badge; empty until the list loads.
  const threadCount = useSelector((s) => s.threads.list.length)

  return (
    <aside className={`${styles.side} ${collapsed ? styles.collapsed : ""}`}>
      <div className={styles.scroll}>
        {NAV_GROUPS.map((group) => (
          <div className={styles.group} key={group.heading}>
            <div className={styles.groupH}>{group.heading}</div>
            {group.items.map(({ to, label, icon: Icon, badge, disabled }) => {
              const liveBadge =
                to === "/threads" && threadCount ? String(threadCount) : badge
              return (
                <NavLink
                  key={to}
                  to={to}
                  title={collapsed ? label : undefined}
                  className={({ isActive }) =>
                    `${styles.item} ${isActive ? styles.active : ""} ${disabled ? styles.disabled : ""}`
                  }
                  onClick={disabled ? (e) => e.preventDefault() : undefined}
                >
                  <Icon size={16} className={styles.ic} />
                  <span className={styles.label}>{label}</span>
                  {liveBadge ? (
                    <span className={styles.badge}>{liveBadge}</span>
                  ) : null}
                </NavLink>
              )
            })}
          </div>
        ))}
      </div>

      <div className={styles.foot}>
        <NavLink
          to="/settings"
          title={collapsed ? "Settings" : undefined}
          className={({ isActive }) =>
            `${styles.item} ${isActive ? styles.active : ""}`
          }
        >
          <Settings size={16} className={styles.ic} />
          <span className={styles.label}>Settings</span>
        </NavLink>
        <button
          type="button"
          className={`${styles.item} ${styles.collapseBtn}`}
          onClick={onToggleCollapse}
          title={collapsed ? "Expand" : "Collapse"}
        >
          <ChevronsLeft
            size={16}
            className={`${styles.ic} ${styles.chevIcon}`}
          />
          <span className={styles.label}>Collapse</span>
        </button>
      </div>
    </aside>
  )
}
