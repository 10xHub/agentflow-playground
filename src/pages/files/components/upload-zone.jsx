import { Upload } from "lucide-react"
import PropTypes from "prop-types"
import { useRef, useState } from "react"

import styles from "../files.module.css"

/**
 * Drop target plus a file picker. Reports one file at a time.
 */
const UploadZone = ({
  disabled = false,
  busy = false,
  error = null,
  onFile,
}) => {
  const input = useRef(null)
  const [over, setOver] = useState(false)

  const pick = (file) => {
    if (file && !disabled) onFile(file)
  }

  return (
    <div
      className={`${styles.zone} ${over ? styles.zoneOver : ""}`}
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled) setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        pick(e.dataTransfer.files?.[0])
      }}
    >
      <Upload size={20} strokeWidth={1.6} />
      <span>{busy ? "Uploading…" : "Drop a file here, or"}</span>
      <input
        ref={input}
        type="file"
        aria-label="Choose a file"
        className={styles.fileInput}
        disabled={disabled || busy}
        onChange={(e) => {
          pick(e.target.files?.[0])
          e.target.value = ""
        }}
      />
      {error && (
        <p className={styles.inlineError} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

UploadZone.propTypes = {
  disabled: PropTypes.bool,
  busy: PropTypes.bool,
  error: PropTypes.string,
  onFile: PropTypes.func.isRequired,
}

export default UploadZone
