import { Copy, Download, Trash2 } from "lucide-react"
import PropTypes from "prop-types"
import { useState } from "react"

import { formatBytes } from "@/lib/files/preview-kind"
import { notifyError, notifySuccess } from "@/lib/notify"

import styles from "../files.module.css"

import Preview from "./preview"

const expiry = (ts) =>
  ts
    ? `${new Date(ts * 1000).toISOString().replace("T", " ").slice(0, 19)} UTC`
    : "no expiry"

const copy = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    notifySuccess("File id copied")
  } catch (e) {
    notifyError("Could not copy", e)
  }
}

const Row = ({ k, children }) => (
  <div className={styles.kv}>
    <span className={styles.k}>{k}</span>
    <span className={styles.v}>{children}</span>
  </div>
)
Row.propTypes = {
  k: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
}

/**
 * Info, signed link, preview and delete for one file.
 */
const FileCard = ({ file, onDelete }) => {
  const [armed, setArmed] = useState(false)
  const [armedFor, setArmedFor] = useState(file.file_id)
  if (armedFor !== file.file_id) {
    setArmedFor(file.file_id)
    setArmed(false)
  }
  return (
    <article className={styles.card}>
      <header className={styles.cardHead}>
        <strong>{file.filename || file.file_id}</strong>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.btn}
            onClick={() => copy(file.file_id)}
          >
            <Copy size={13} /> Copy file_id
          </button>
          {file.direct_url && (
            <a
              className={styles.btn}
              href={file.direct_url}
              download={file.filename || true}
            >
              <Download size={13} /> Download
            </a>
          )}
          <button
            type="button"
            className={`${styles.btn} ${armed ? styles.btnDanger : ""}`}
            onClick={() => (armed ? onDelete(file.file_id) : setArmed(true))}
          >
            <Trash2 size={13} /> {armed ? "Confirm delete?" : "Delete"}
          </button>
        </div>
      </header>
      <Row k="file_id">{file.file_id}</Row>
      <Row k="mime_type">{file.mime_type}</Row>
      <Row k="size">{formatBytes(file.size_bytes)}</Row>
      {file.direct_url && (
        <Row k="direct url">
          <a href={file.direct_url} target="_blank" rel="noreferrer">
            {file.direct_url}
          </a>{" "}
          <span className={styles.muted}>
            expires {expiry(file.direct_url_expires_at)}
          </span>
        </Row>
      )}
      {file.extracted_text && (
        <>
          <h4 className={styles.h3}>Extracted text</h4>
          <pre className={styles.previewText}>
            {file.extracted_text.slice(0, 2000)}
          </pre>
        </>
      )}
      <h4 className={styles.h3}>Preview</h4>
      <Preview fileId={file.file_id} mime={file.mime_type} />
    </article>
  )
}

FileCard.propTypes = {
  file: PropTypes.shape({
    file_id: PropTypes.string.isRequired,
    filename: PropTypes.string,
    mime_type: PropTypes.string,
    size_bytes: PropTypes.number,
    extracted_text: PropTypes.string,
    direct_url: PropTypes.string,
    direct_url_expires_at: PropTypes.number,
  }).isRequired,
  onDelete: PropTypes.func.isRequired,
}

export default FileCard
