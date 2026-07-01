import { Copy, Download, ExternalLink, MessageSquare } from "lucide-react"

import { emptyExtractNote, fmtSize } from "../data"
import styles from "../files.module.css"

import FileTypeIcon from "./FileTypeIcon"

// Right column: preview + header badges + copyable id, actions, the info /
// access-url / extracted_text cards. Field shapes mirror the real backend.
/**
 *
 */
export default function DetailPane({ file }) {
  const hasX = !!file.extracted

  return (
    <section className={styles.detail}>
      <div className={styles.dBody}>
        <div className={styles.dInner}>
          <div className={styles.dTop}>
            <div className={`${styles.preview} ${styles[file.cls] || ""}`}>
              <FileTypeIcon cls={file.cls} size={34} strokeWidth={1.4} />
            </div>
            <div className={styles.dH}>
              <div className={styles.dName}>{file.filename}</div>
              <div className={styles.dBadges}>
                <span className={styles.nb}>{file.mime}</span>
                <span className={styles.nb}>{fmtSize(file.size)}</span>
                {hasX ? (
                  <span className={`${styles.nb} ${styles.ok}`}>
                    ● extracted_text
                  </span>
                ) : (
                  <span className={`${styles.nb} ${styles.muted}`}>
                    no extraction
                  </span>
                )}
              </div>
              <div className={styles.dId}>
                {file.file_id}
                <button
                  className={styles.copy}
                  title="Copy file_id"
                  type="button"
                >
                  <Copy size={12} strokeWidth={1.7} />
                </button>
              </div>
            </div>
          </div>

          <div className={styles.actions}>
            <button
              className={`${styles.abtn} ${styles.primary}`}
              type="button"
            >
              <MessageSquare size={14} strokeWidth={1.8} />
              Use in Chat
            </button>
            <button className={styles.abtn} type="button">
              <Download size={14} strokeWidth={1.7} />
              Download
            </button>
            <button className={styles.abtn} type="button">
              <ExternalLink size={14} strokeWidth={1.7} />
              Access URL
            </button>
          </div>

          <div className={styles.sh}>
            File info · GET /v1/files/&#123;id&#125;/info
          </div>
          <div className={styles.card}>
            <div className={styles.kv}>
              <span className={styles.k}>file_id</span>
              <span className={styles.v}>{file.file_id}</span>
            </div>
            <div className={styles.kv}>
              <span className={styles.k}>filename</span>
              <span className={styles.v}>{file.filename}</span>
            </div>
            <div className={styles.kv}>
              <span className={styles.k}>mime_type</span>
              <span className={styles.v}>{file.mime}</span>
            </div>
            <div className={styles.kv}>
              <span className={styles.k}>size_bytes</span>
              <span className={styles.v}>
                {file.size.toLocaleString()}{" "}
                <span className={styles.vSub}>({fmtSize(file.size)})</span>
              </span>
            </div>
            <div className={styles.kv}>
              <span className={styles.k}>direct_url</span>
              <span className={`${styles.v} ${styles.vBlue}`}>
                {file.direct_url}
              </span>
            </div>
            <div className={styles.kv}>
              <span className={styles.k}>direct_url_expires_at</span>
              <span
                className={`${styles.v} ${file.expires ? "" : styles.muted}`}
              >
                {file.expires || "null"}
              </span>
            </div>
          </div>

          <div className={styles.sh}>
            Access URL · GET /v1/files/&#123;id&#125;/url
          </div>
          <div className={styles.card}>
            <div className={styles.urlRow}>
              <span className={styles.u}>
                {file.direct_url}
                {file.expires ? "?sig=…" : ""}
              </span>
              <button className={styles.copy} title="Copy" type="button">
                <Copy size={12} strokeWidth={1.7} />
              </button>
              <button className={styles.copy} title="Open" type="button">
                <ExternalLink size={12} strokeWidth={1.7} />
              </button>
            </div>
            <div className={`${styles.kv} ${styles.kvSpaced}`}>
              <span className={styles.k}>expires_at</span>
              <span
                className={`${styles.v} ${file.expires ? "" : styles.muted}`}
              >
                {file.expires || "null (no signing / local)"}
              </span>
            </div>
          </div>

          <div className={styles.sh}>
            extracted_text{" "}
            {!hasX && (
              <span className={styles.shDim}>
                · document_handling: extract_text
              </span>
            )}
          </div>
          {hasX ? (
            <div className={styles.extract}>{file.extracted}</div>
          ) : (
            <div className={`${styles.extract} ${styles.empty}`}>
              {emptyExtractNote(file.mime)}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
