import { Check, Copy } from "lucide-react"
import PropTypes from "prop-types"
import { useEffect, useRef, useState } from "react"

import styles from "../threads.module.css"

/**
 * Pretty-printed raw JSON block with a copy button pinned to its corner.
 */
const RawJson = ({ value = null }) => {
  const [copied, setCopied] = useState(false)
  const timer = useRef(null)
  const text = JSON.stringify(value, null, 2)

  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className={styles.rawWrap}>
      <pre className={styles.rawState}>{text}</pre>
      <button
        type="button"
        className={styles.copyBtn}
        aria-label="Copy JSON"
        onClick={copy}
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  )
}

RawJson.propTypes = { value: PropTypes.any }

export default RawJson
