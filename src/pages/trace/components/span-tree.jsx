import {
  AlertCircle,
  Box,
  Check,
  ChevronDown,
  ChevronRight,
  Loader,
  Network,
  Sparkles,
  Wrench,
} from "lucide-react"
import PropTypes from "prop-types"

import styles from "../trace-tree.module.css"
import { rulerFor } from "../tree"

const KIND_ICON = { root: Network, node: Box, llm: Sparkles, tool: Wrench }

const STATUS_ICON = {
  ok: { Icon: Check, label: "ok" },
  error: { Icon: AlertCircle, label: "error" },
  running: { Icon: Loader, label: "running" },
}

const StatusMark = ({ status = null }) => {
  const entry = STATUS_ICON[status]
  if (!entry) return <span className={styles.statusSlot} />
  const { Icon, label } = entry
  return (
    <span
      className={`${styles.statusSlot} ${styles[`st_${status}`]}`}
      title={label}
      role="img"
      aria-label={`status ${label}`}
    >
      <Icon size={12} />
    </span>
  )
}

StatusMark.propTypes = { status: PropTypes.string }

const Row = ({ row, selected, collapsed, onSelect, onToggle }) => {
  const Kind = KIND_ICON[row.kind] ?? Box
  return (
    <div
      className={`${styles.row} ${selected ? styles.sel : ""}`}
      role="treeitem"
      aria-selected={selected}
      aria-level={row.depth + 1}
      aria-expanded={row.hasChildren ? !collapsed : undefined}
      tabIndex={0}
      onClick={() => onSelect(row.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onSelect(row.id)
        }
      }}
    >
      <div
        className={styles.name}
        style={{ paddingLeft: `${row.depth * 16}px` }}
      >
        {row.hasChildren ? (
          <button
            type="button"
            className={styles.twisty}
            aria-label={collapsed ? "Expand" : "Collapse"}
            onClick={(e) => {
              e.stopPropagation()
              onToggle(row.id)
            }}
          >
            {collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
          </button>
        ) : (
          <span className={styles.twisty} />
        )}
        <Kind size={13} className={`${styles.kindIcon} ${styles[row.kind]}`} />
        <span className={styles.label}>{row.label}</span>
        <StatusMark status={row.status} />
      </div>
      <div className={styles.track}>
        <div
          className={`${styles.bar} ${styles[row.kind]} ${
            row.status === "error" ? styles.barError : ""
          }`}
          style={{ left: `${row.left}%`, width: `${row.width}%` }}
        />
      </div>
      <span className={styles.dur}>{row.dur}</span>
      <span className={styles.tok}>
        {row.tokens == null ? "" : `${row.tokens.toLocaleString("en-US")} tok`}
      </span>
    </div>
  )
}

Row.propTypes = {
  row: PropTypes.object.isRequired,
  selected: PropTypes.bool.isRequired,
  collapsed: PropTypes.bool.isRequired,
  onSelect: PropTypes.func.isRequired,
  onToggle: PropTypes.func.isRequired,
}

/**
 * The run tree: indented rows with name, type icon, status, a waterfall bar on
 * the run's time axis, duration and tokens.
 */
const SpanTree = ({
  rows,
  total,
  selectedId = null,
  collapsed,
  onSelect,
  onToggle,
  onExpandAll,
  onCollapseAll,
}) => (
  <div className={styles.tree}>
    <div className={styles.treeTools}>
      <button type="button" className={styles.linkBtn} onClick={onExpandAll}>
        Expand all
      </button>
      <button type="button" className={styles.linkBtn} onClick={onCollapseAll}>
        Collapse all
      </button>
    </div>
    <div className={`${styles.row} ${styles.rulerRow}`}>
      <div className={styles.name}>Name</div>
      <div className={styles.ruler}>
        {rulerFor(total).map((r) => (
          <span key={r.id}>{r.label}</span>
        ))}
      </div>
      <span className={styles.dur}>Time</span>
      <span className={styles.tok}>Tokens</span>
    </div>
    <div role="tree" aria-label="Run tree">
      {rows.map((row) => (
        <Row
          key={row.id}
          row={row}
          selected={selectedId === row.id}
          collapsed={collapsed.has(row.id)}
          onSelect={onSelect}
          onToggle={onToggle}
        />
      ))}
    </div>
  </div>
)

SpanTree.propTypes = {
  rows: PropTypes.array.isRequired,
  total: PropTypes.number.isRequired,
  selectedId: PropTypes.string,
  collapsed: PropTypes.instanceOf(Set).isRequired,
  onSelect: PropTypes.func.isRequired,
  onToggle: PropTypes.func.isRequired,
  onExpandAll: PropTypes.func.isRequired,
  onCollapseAll: PropTypes.func.isRequired,
}

export default SpanTree
