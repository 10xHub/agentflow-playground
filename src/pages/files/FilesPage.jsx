import { useState } from "react"

import DetailPane from "./components/DetailPane"
import UploadPanel from "./components/UploadPanel"
import { SESSION_FILES } from "./data"
import styles from "./files.module.css"

// UI-only Files utility. Session list is client-remembered (the API has no
// list endpoint); selecting a row or fetching by id updates the detail pane;
// the fake upload appends to the session list. No API, no real upload.
/**
 *
 */
export default function FilesPage() {
  const [files, setFiles] = useState(SESSION_FILES)
  const [activeId, setActiveId] = useState(SESSION_FILES[0].id)
  // detail holds the currently shown file — either a session row or an
  // ad-hoc "fetched by id" result that never joins the session list.
  const [detail, setDetail] = useState(SESSION_FILES[0])
  const [idInput, setIdInput] = useState("")

  /**
   *
   */
  const selectFile = (id) => {
    const f = files.find((x) => x.id === id)
    if (!f) return
    setActiveId(id)
    setDetail(f)
  }

  /**
   *
   */
  const fetchById = () => {
    const id = idInput.trim()
    if (!id) return
    // Ad-hoc lookup: clears session selection, renders a synthetic record.
    setActiveId(null)
    setDetail({
      id: `fetch_${id}`,
      cls: "file",
      filename: `${id.replace(/^file_/, "")}.bin`,
      file_id: id,
      mime: "application/octet-stream",
      size: 0,
      extracted: null,
      direct_url: `/v1/files/${id}`,
      expires: null,
    })
  }

  /**
   *
   */
  const fakeUpload = () => {
    const n = files.length
    const newFile = {
      id: `f${n + 1}`,
      cls: "img",
      filename: `upload-${n}.png`,
      file_id: `file_new${n}…`,
      mime: "image/png",
      size: 131072,
      extracted: null,
      direct_url: "/v1/files/file_new…",
      expires: null,
    }
    setFiles((previous) => [...previous, newFile])
    setActiveId(newFile.id)
    setDetail(newFile)
  }

  return (
    <div className={styles.page}>
      <UploadPanel
        files={files}
        activeId={activeId}
        idInput={idInput}
        onIdInput={setIdInput}
        onFetchById={fetchById}
        onSelect={selectFile}
        onUpload={fakeUpload}
      />
      <DetailPane file={detail} />
    </div>
  )
}
