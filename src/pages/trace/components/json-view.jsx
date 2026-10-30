import { Check, ChevronDown, ChevronRight, Copy } from "lucide-react"
import PropTypes from "prop-types"
import { useState } from "react"

import styles from "../trace-detail.module.css"

const isContainer = (v) => v !== null && typeof v === "object"

const scalarText = (v) => (typeof v === "string" ? `"${v}"` : String(v))

const summaryOf = (v) =>
  Array.isArray(v) ? `[${v.length}]` : `{${Object.keys(v).length}}`

/**
 * One node of the JSON tree. Containers collapse; the top two levels start open.
 */
const JsonNode = ({ name = null, value = null, depth = 0 }) => {
  const [open, setOpen] = useState(depth < 2)
  const label = name !== null && <span className={styles.jKey}>{name}: </span>
  if (!isContainer(value)) {
    return (
      <div className={styles.jRow}>
        {label}
        <span className={styles[typeof value === "string" ? "jStr" : "jLit"]}>
          {scalarText(value)}
        </span>
      </div>
    )
  }
  const entries = Object.entries(value)
  return (
    <div>
      <button
        type="button"
        className={styles.jToggle}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {label}
        {!open && <span className={styles.jSummary}>{summaryOf(value)}</span>}
      </button>
      {open && (
        <div className={styles.jChildren}>
          {entries.map(([k, v]) => (
            <JsonNode key={k} name={k} value={v} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

JsonNode.propTypes = {
  name: PropTypes.string,
  value: PropTypes.any,
  depth: PropTypes.number,
}

/**
 * Pretty, collapsible JSON with a copy button.
 */
const JsonView = ({ value = null }) => {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(value, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }
  return (
    <div className={styles.json}>
      <button
        type="button"
        className={styles.copyBtn}
        aria-label="Copy JSON"
        onClick={copy}
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
        {copied ? "Copied" : "Copy"}
      </button>
      <JsonNode value={value} />
    </div>
  )
}

JsonView.propTypes = { value: PropTypes.any }

export default JsonView
