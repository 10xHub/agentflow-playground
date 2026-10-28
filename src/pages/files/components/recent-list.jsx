import PropTypes from "prop-types"

import { formatBytes } from "@/lib/files/preview-kind"

import styles from "../files.module.css"

const uploadedOn = (seconds) =>
  seconds ? ` · ${new Date(seconds * 1000).toLocaleDateString()}` : ""

/**
 * Rows from the file list hook; click opens the file.
 */
const RecentList = ({
  files,
  activeId = null,
  onOpen,
  note,
  title = "Recent",
  empty,
  hasMore = false,
  loadingMore = false,
  onLoadMore = undefined,
}) => (
  <section>
    <h3 className={styles.h3}>{title}</h3>
    <p className={styles.muted}>{note}</p>
    {files.length === 0 ? (
      <p className={styles.muted}>{empty}</p>
    ) : (
      <ul className={styles.recent}>
        {files.map((f) => (
          <li key={f.file_id}>
            <button
              type="button"
              className={`${styles.recentRow} ${f.file_id === activeId ? styles.recentOn : ""}`}
              onClick={() => onOpen(f.file_id)}
            >
              <span className={styles.recentName}>
                {f.filename || f.file_id}
              </span>
              <span className={styles.muted}>
                {f.mime_type} · {formatBytes(f.size_bytes)}
                {uploadedOn(f.created_at)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    )}
    {hasMore && (
      <button
        type="button"
        className={styles.btn}
        disabled={loadingMore}
        onClick={onLoadMore}
      >
        {loadingMore ? "Loading…" : "Load more"}
      </button>
    )}
  </section>
)

RecentList.propTypes = {
  files: PropTypes.arrayOf(PropTypes.object).isRequired,
  activeId: PropTypes.string,
  onOpen: PropTypes.func.isRequired,
  note: PropTypes.string.isRequired,
  title: PropTypes.string,
  empty: PropTypes.string.isRequired,
  hasMore: PropTypes.bool,
  loadingMore: PropTypes.bool,
  onLoadMore: PropTypes.func,
}

export default RecentList
