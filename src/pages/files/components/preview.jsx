import PropTypes from "prop-types"
import { useEffect, useState } from "react"

import { previewKind } from "@/lib/files/preview-kind"
import { getTenxGraphClient } from "@/lib/tenxgraph-client"

import styles from "../files.module.css"

const TEXT_LIMIT = 20000

const readBlob = async (blob, kind) =>
  kind === "text"
    ? { text: (await blob.text()).slice(0, TEXT_LIMIT) }
    : { url: URL.createObjectURL(blob) }

// Download the file once per id and turn it into something renderable.
const useFileBody = (fileId, kind) => {
  const [body, setBody] = useState({ id: null })
  useEffect(() => {
    if (kind === "none") return undefined
    let alive = true
    let objectUrl = null
    getTenxGraphClient()
      .getFile(fileId)
      .then((blob) => readBlob(blob, kind))
      .then((next) => {
        objectUrl = next.url || null
        if (alive) setBody({ id: fileId, ...next })
        else if (objectUrl) URL.revokeObjectURL(objectUrl)
        return next
      })
      .catch((e) => alive && setBody({ id: fileId, error: e.message }))
    return () => {
      alive = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [fileId, kind])
  return body.id === fileId ? body : { id: null }
}

const MEDIA = {
  image: (url) => <img className={styles.previewImg} src={url} alt="Preview" />,
  audio: (url) => (
    // eslint-disable-next-line jsx-a11y/media-has-caption -- user-uploaded files have no caption track
    <audio className={styles.previewMedia} src={url} controls />
  ),
  video: (url) => (
    // eslint-disable-next-line jsx-a11y/media-has-caption -- user-uploaded files have no caption track
    <video className={styles.previewMedia} src={url} controls />
  ),
  pdf: (url) => (
    <embed className={styles.previewPdf} src={url} type="application/pdf" />
  ),
}

/**
 * Preview a stored file by MIME class.
 */
const Preview = ({ fileId, mime = undefined }) => {
  const kind = previewKind(mime)
  const body = useFileBody(fileId, kind)
  if (kind === "none") {
    return (
      <p className={styles.muted}>
        No preview for this file type. Metadata only.
      </p>
    )
  }
  if (body.error) return <p className={styles.inlineError}>{body.error}</p>
  if (body.id === null) return <p className={styles.muted}>Loading preview…</p>
  if (kind === "text") {
    return <pre className={styles.previewText}>{body.text}</pre>
  }
  return MEDIA[kind](body.url)
}

Preview.propTypes = {
  fileId: PropTypes.string.isRequired,
  mime: PropTypes.string,
}

export default Preview
