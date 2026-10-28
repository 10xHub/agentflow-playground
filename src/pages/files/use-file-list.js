import { useEffect } from "react"
import { useDispatch, useSelector } from "react-redux"

import { loadFileList, loadMoreFiles } from "@/store/files-slice"

/**
 * The one data hook behind the file list. It reads the server list (GET /v1/files);
 * when the store cannot list files (501) it falls back to the files uploaded in this
 * browser session.
 * @returns {object} files, status, source ("server" or "session"), error, hasMore,
 * loadingMore, loadMore and reload
 */
const useFileList = () => {
  const dispatch = useDispatch()
  const { list, recent } = useSelector((s) => s.files)

  useEffect(() => {
    dispatch(loadFileList())
  }, [dispatch])

  const server = list.status === "ready"
  const settled =
    server || list.status === "unsupported" || list.status === "error"
  const files = server ? list.items : settled ? recent : []
  return {
    files,
    status: list.status,
    source: server ? "server" : "session",
    error: list.error,
    hasMore: server && list.hasMore,
    loadingMore: list.loadingMore,
    loadMore: () => dispatch(loadMoreFiles()),
    reload: () => dispatch(loadFileList()),
  }
}

export default useFileList
