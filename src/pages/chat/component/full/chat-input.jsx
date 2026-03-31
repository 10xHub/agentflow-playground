/* eslint-disable max-lines-per-function */
import PropTypes from "prop-types"
import { useState, useCallback, useRef } from "react"

import { useToast } from "@/components/ui/use-toast"

import ChatInputForm from "./chat-input-form"
import FileAttachmentsPreview from "./file-attachments-preview"

/**
 * Chat input component with file attachments
 */
const ChatInput = ({ onSendMessage, disabled, isLoading, onStop }) => {
  const [message, setMessage] = useState("")
  const [attachments, setAttachments] = useState([])
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputReference = useRef(null)
  const { toast } = useToast()

  const handleSubmit = useCallback(
    (event) => {
      event.preventDefault()
      if ((message.trim() || attachments.length > 0) && !disabled) {
        onSendMessage({
          content: message.trim(),
          attachments: attachments,
        })
        setMessage("")
        setAttachments([])
      }
    },
    [message, attachments, disabled, onSendMessage]
  )

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault()
        handleSubmit(event)
      }
    },
    [handleSubmit]
  )

  const handleFileSelect = useCallback(
    (files) => {
      const validFiles = [...files].filter((file) => {
        // Check file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: "File too large",
            description: `${file.name} is larger than 10MB`,
            variant: "destructive",
          })
          return false
        }
        return true
      })

      setAttachments((previous) => [...previous, ...validFiles])
    },
    [toast]
  )

  const handleDragOver = useCallback((event) => {
    event.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((event) => {
    event.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (event) => {
      event.preventDefault()
      setIsDragOver(false)
      if (event.dataTransfer.files) {
        handleFileSelect(event.dataTransfer.files)
      }
    },
    [handleFileSelect]
  )

  const handleRemoveAttachment = useCallback(
    (index) =>
      setAttachments((previous) =>
        previous.filter((_, index_) => index_ !== index)
      ),
    []
  )

  const handleFileButtonClick = useCallback(() => {
    fileInputReference.current?.click()
  }, [])

  const handleStopClick = useCallback(() => {
    onStop()
  }, [onStop])

  const hasContent = message.trim() || attachments.length > 0

  return (
    <div className="pl-10 pr-10">
      <FileAttachmentsPreview
        attachments={attachments}
        onRemove={handleRemoveAttachment}
      />

      <ChatInputForm
        message={message}
        onMessageChange={(event) => setMessage(event.target.value)}
        onKeyDown={handleKeyDown}
        onSubmit={handleSubmit}
        isDragOver={isDragOver}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onFileButtonClick={handleFileButtonClick}
        disabled={disabled}
        isLoading={isLoading}
        onStopClick={handleStopClick}
        hasContent={hasContent}
      />

      {/* Hidden file input */}
      <input
        ref={fileInputReference}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.txt,.csv,.json,.png,.jpg,.jpeg,.gif,.svg"
        onChange={(event) =>
          event.target.files && handleFileSelect(event.target.files)
        }
        className="hidden"
      />

      {/* Drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center pointer-events-none">
          <div className="text-primary font-medium">
            Drop files here to attach
          </div>
        </div>
      )}
    </div>
  )
}

ChatInput.propTypes = {
  onSendMessage: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  isLoading: PropTypes.bool,
  onStop: PropTypes.func,
}

ChatInput.defaultProps = {
  disabled: false,
  isLoading: false,
  onStop: () => {},
}

export default ChatInput
