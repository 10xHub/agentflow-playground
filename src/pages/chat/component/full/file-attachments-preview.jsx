import { FileText, Image } from "lucide-react"
import PropTypes from "prop-types"
import { useState, useEffect } from "react"

import { Button } from "@/components/ui/button"

/**
 * Single file attachment preview with image thumbnail support
 */
const FilePreviewItem = ({ file, index, onRemove }) => {
  const isImage = file.type?.startsWith("image/")
  const [thumbnailUrl, setThumbnailUrl] = useState(null)

  useEffect(() => {
    if (isImage && file instanceof Blob) {
      const url = URL.createObjectURL(file)
      setThumbnailUrl(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [file, isImage])

  return (
    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
      <div className="w-8 h-8 rounded bg-background flex items-center justify-center overflow-hidden">
        {isImage && thumbnailUrl ? (
          <img src={thumbnailUrl} alt={file.name} className="w-8 h-8 object-cover rounded" />
        ) : isImage ? (
          <Image className="w-4 h-4 text-slate-500" />
        ) : (
          <FileText className="w-4 h-4 text-slate-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{file.name}</p>
        <p className="text-xs text-muted-foreground">
          {Math.round(file.size / 1024)} KB
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onRemove(index)}
        className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
      >
        ×
      </Button>
    </div>
  )
}

FilePreviewItem.propTypes = {
  file: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  onRemove: PropTypes.func.isRequired,
}

/**
 * File attachments preview component with image thumbnails
 */
const FileAttachmentsPreview = ({ attachments, onRemove }) => {
  if (attachments.length === 0) return null

  return (
    <div className="mb-4 space-y-2">
      {attachments.map((file, index) => (
        <FilePreviewItem
          key={file.name}
          file={file}
          index={index}
          onRemove={onRemove}
        />
      ))}
    </div>
  )
}

FileAttachmentsPreview.propTypes = {
  attachments: PropTypes.arrayOf(PropTypes.object).isRequired,
  onRemove: PropTypes.func.isRequired,
}

export default FileAttachmentsPreview
