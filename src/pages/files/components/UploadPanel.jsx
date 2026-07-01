import { Info, Upload } from "lucide-react"

import { MULTIMODAL_CONFIG, fmtSize, mimeShort } from "../data"
import styles from "../files.module.css"

import FileTypeIcon from "./FileTypeIcon"

// Left column: upload dropzone, inspect-by-id, the client-remembered session
// list, the honest no-list-endpoint note, and the multimodal config card.
/**
 *
 */
export default function UploadPanel({
  files,
  activeId,
  idInput,
  onIdInput,
  onFetchById,
  onSelect,
  onUpload,
}) {
  return (
    <section className={styles.files}>
      <div className={styles.filesScroll}>
        <div className={styles.drop} onClick={onUpload}>
          <div className={styles.di}>
            <Upload size={20} strokeWidth={1.7} />
          </div>
          <div className={styles.dt}>Drop a file or click to upload</div>
          <div className={styles.ds}>POST /v1/files/upload · max 25 MB</div>
        </div>

        <div className={styles.secH}>Inspect by file_id</div>
        <form
          className={styles.inspect}
          onSubmit={(e) => {
            e.preventDefault()
            onFetchById()
          }}
        >
          <input
            value={idInput}
            onChange={(e) => onIdInput(e.target.value)}
            placeholder="file_… paste any id"
            spellCheck={false}
          />
          <button type="submit">Fetch</button>
        </form>

        <div className={styles.secH}>
          This session{" "}
          <span className={`mono ${styles.secHmeta}`}>{files.length}</span>
        </div>
        <div>
          {files.map((f) => (
            <div
              key={f.id}
              className={`${styles.frow} ${activeId === f.id ? styles.active : ""}`}
              onClick={() => onSelect(f.id)}
            >
              <div className={`${styles.ficon} ${styles[f.cls] || ""}`}>
                <FileTypeIcon cls={f.cls} size={16} />
              </div>
              <div className={styles.fmeta}>
                <div className={styles.fname}>{f.filename}</div>
                <div className={styles.fsub}>
                  {mimeShort(f.mime)} · {fmtSize(f.size)}
                </div>
              </div>
              <span
                className={`${styles.fx} ${f.extracted ? styles.on : styles.off}`}
                title={
                  f.extracted ? "extracted_text present" : "no extracted_text"
                }
              />
            </div>
          ))}
        </div>

        <div className={styles.note}>
          <Info size={13} strokeWidth={1.7} />
          <span>
            Files uploaded in this session (client-side). The API has no list
            endpoint — use <b>Inspect by file_id</b> to pull any other file.
          </span>
        </div>

        <div className={styles.secH}>
          Multimodal config{" "}
          <span className={`mono ${styles.secHmetaMuted}`}>
            GET /v1/config/multimodal
          </span>
        </div>
        <div className={styles.cfgCard}>
          {MULTIMODAL_CONFIG.map((row) => (
            <div key={row.k} className={styles.ck}>
              <span className={styles.k}>{row.k}</span>
              <span className={styles.v}>{row.v}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
