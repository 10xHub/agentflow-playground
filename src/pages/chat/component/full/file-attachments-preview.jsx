import PropTypes from "prop-types"

import { Button } from "@/components/ui/button"

/**
 * File attachments preview component
 */
const FileAttachmentsPreview = ({ attachments, onRemove }) => {
  if (attachments.length === 0) return null

  return (
    <div className="mb-4 space-y-2">
      {attachments.map((file, index) => (
        <div
          key={file.name}
          className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
        >
          <div className="w-8 h-8 rounded bg-background flex items-center justify-center">
            <div className="w-4 h-4 bg-slate-400 rounded" />
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
      ))}
    </div>
  )
}

FileAttachmentsPreview.propTypes = {
  attachments: PropTypes.arrayOf(PropTypes.object).isRequired,
  onRemove: PropTypes.func.isRequired,
}

export default FileAttachmentsPreview
