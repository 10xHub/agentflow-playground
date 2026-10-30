import { Search } from "lucide-react"
import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"

import { isDemoActive } from "@/lib/demo/demo-mode"
import {
  loadFilesConfig,
  openFile,
  removeFile,
  uploadSelected,
} from "@/store/files-slice"

import ConfigHeader from "./components/config-header"
import FileCard from "./components/file-card"
import RecentList from "./components/recent-list"
import UploadZone from "./components/upload-zone"
import styles from "./files.module.css"
import useFileList from "./use-file-list"

const SERVER_NOTE = "Files you have uploaded, newest first."
const SESSION_NOTE =
  "The configured media store cannot list files, so this shows files uploaded in this browser session."
const ERROR_NOTE =
  "Could not list files from the server. Showing this browser session."
const SERVER_EMPTY = "No files uploaded yet."
const SESSION_EMPTY = "No files uploaded in this session yet."

const noteFor = (status, source) => {
  if (source === "server") return SERVER_NOTE
  return status === "error" ? ERROR_NOTE : SESSION_NOTE
}

/**
 * Upload, inspect, preview, look up and delete files.
 */
const FilesPage = () => {
  const dispatch = useDispatch()
  const demo = isDemoActive()
  const { config, upload, lookup, current } = useSelector((s) => s.files)
  const list = useFileList()
  const [lookupId, setLookupId] = useState("")

  useEffect(() => {
    if (!demo) dispatch(loadFilesConfig())
  }, [dispatch, demo])

  const submitLookup = (e) => {
    e.preventDefault()
    dispatch(openFile(lookupId))
  }

  return (
    <div className={styles.page}>
      <h2 className={styles.title}>Files</h2>
      <ConfigHeader config={config} demo={demo} />
      <UploadZone
        disabled={demo}
        busy={upload.status === "uploading"}
        error={upload.error}
        onFile={(file) => dispatch(uploadSelected(file))}
      />
      <form className={styles.lookup} onSubmit={submitLookup}>
        <Search size={14} />
        <input
          aria-label="Look up by file_id"
          placeholder="Look up by file_id"
          spellCheck={false}
          disabled={demo}
          value={lookupId}
          onChange={(e) => setLookupId(e.target.value)}
        />
        <button
          type="submit"
          className={styles.btn}
          disabled={demo || !lookupId.trim()}
        >
          Look up
        </button>
      </form>
      {lookup.error && (
        <p className={styles.inlineError} role="alert">
          {lookup.error}
        </p>
      )}
      <div className={styles.cols}>
        <RecentList
          files={list.files}
          activeId={current?.file_id}
          title={list.source === "server" ? "Your files" : "Recent"}
          note={noteFor(list.status, list.source)}
          empty={list.source === "server" ? SERVER_EMPTY : SESSION_EMPTY}
          hasMore={list.hasMore}
          loadingMore={list.loadingMore}
          onLoadMore={list.loadMore}
          onOpen={(id) => dispatch(openFile(id))}
        />
        {current && (
          <FileCard
            file={current}
            onDelete={(id) => dispatch(removeFile(id))}
          />
        )}
      </div>
    </div>
  )
}

export default FilesPage
