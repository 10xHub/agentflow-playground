/* eslint-disable */
import {
  Bot,
  Send,
  User,
  Paperclip,
  Mic,
  Video,
  Square,
  Image,
  FileText,
  Copy,
  Code,
} from "lucide-react"
import PropTypes from "prop-types"
import { useState, useRef, useEffect, useCallback } from "react"
import { useDispatch, useSelector } from "react-redux"
import ReactMarkdown from "react-markdown"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import {
  oneDark,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism"
import remarkGfm from "remark-gfm"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent } from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { sendMessage as sendMessageThunk, stopStreaming } from "@/services/store/slices/chat.slice"

/**
 * Message component renders individual chat messages with modern design
 */
const Message = ({ message }) => {
  const isUser = message.role === "user"

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
  }

  // Custom components for markdown rendering
  const MarkdownComponents = {
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || "")
      const language = match ? match[1] : ""

      if (!inline && language) {
        return (
          <SyntaxHighlighter
            style={oneDark}
            language={language}
            PreTag="div"
            className="rounded-md !my-4 !bg-slate-900 dark:!bg-slate-950"
            customStyle={{
              margin: "1rem 0",
              borderRadius: "0.375rem",
              fontSize: "0.875rem",
              lineHeight: "1.25rem",
            }}
            {...props}
          >
            {String(children).replace(/\n$/, "")}
          </SyntaxHighlighter>
        )
      }

      return (
        <code
          className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-sm font-mono text-slate-800 dark:text-slate-200"
          {...props}
        >
          {children}
        </code>
      )
    },
    pre({ children }) {
      return <>{children}</>
    },
    p({ children }) {
      return <p className="mb-2 last:mb-0">{children}</p>
    },
    h1({ children }) {
      return (
        <h1 className="text-lg font-bold mb-2 text-slate-900 dark:text-slate-100">
          {children}
        </h1>
      )
    },
    h2({ children }) {
      return (
        <h2 className="text-base font-bold mb-2 text-slate-900 dark:text-slate-100">
          {children}
        </h2>
      )
    },
    h3({ children }) {
      return (
        <h3 className="text-sm font-bold mb-1 text-slate-900 dark:text-slate-100">
          {children}
        </h3>
      )
    },
    ul({ children }) {
      return (
        <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
      )
    },
    ol({ children }) {
      return (
        <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
      )
    },
    li({ children }) {
      return <li className="text-sm">{children}</li>
    },
    blockquote({ children }) {
      return (
        <blockquote className="border-l-4 border-slate-300 dark:border-slate-600 pl-4 italic text-slate-600 dark:text-slate-400 my-2">
          {children}
        </blockquote>
      )
    },
    table({ children }) {
      return (
        <div className="overflow-x-auto my-4">
          <table className="min-w-full border border-slate-300 dark:border-slate-600">
            {children}
          </table>
        </div>
      )
    },
    thead({ children }) {
      return <thead className="bg-slate-50 dark:bg-slate-800">{children}</thead>
    },
    tbody({ children }) {
      return <tbody>{children}</tbody>
    },
    tr({ children }) {
      return (
        <tr className="border-b border-slate-200 dark:border-slate-700">
          {children}
        </tr>
      )
    },
    th({ children }) {
      return (
        <th className="px-3 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          {children}
        </th>
      )
    },
    td({ children }) {
      return (
        <td className="px-3 py-2 text-sm text-slate-900 dark:text-slate-100">
          {children}
        </td>
      )
    },
  }

  return (
    <div
      className={`flex gap-4 p-6 ${isUser ? "justify-end" : ""} group hover:bg-muted/30 transition-colors`}
    >
      {!isUser && (
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-sm">
          <Bot className="w-5 h-5 text-white" />
        </div>
      )}
      <div className={`flex flex-col max-w-[75%] ${isUser ? "items-end" : ""}`}>
        <div className="relative">
          <div
            className={`rounded-2xl px-5 py-3 shadow-sm ${
              isUser
                ? "bg-blue-600 text-white ml-8"
                : "bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700"
            }`}
          >
            <div className="text-sm leading-relaxed">
              {isUser ? (
                <p className="whitespace-pre-wrap">{message.content}</p>
              ) : (
                <div className="prose prose-sm max-w-none dark:prose-invert prose-slate">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={MarkdownComponents}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-2 px-2">
          <span className="text-xs text-muted-foreground">
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>

          {/* Action buttons for AI messages - below timestamp */}
          {!isUser && (
            <div className="flex gap-1 ml-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopy}
                      className="h-6 w-6 p-0 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Copy message</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <Sheet>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SheetTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          <Code className="w-3 h-3" />
                        </Button>
                      </SheetTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Show raw data</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <SheetContent side="right" className="w-[400px] sm:w-[540px]">
                  <SheetHeader>
                    <SheetTitle>Raw Message Data</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <ScrollArea className="h-[calc(100vh-120px)]">
                      <pre className="text-xs bg-muted/50 p-4 rounded-lg overflow-auto">
                        <code>{JSON.stringify(message, null, 2)}</code>
                      </pre>
                    </ScrollArea>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          )}

          {isUser && (
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
              <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
            </div>
          )}
        </div>
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center shadow-sm">
          <User className="w-5 h-5 text-white" />
        </div>
      )}
    </div>
  )
}

/**
 * Modern typing indicator component
 */
const TypingIndicator = () => {
  return (
    <div className="flex gap-4 p-6">
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-sm">
        <Bot className="w-5 h-5 text-white" />
      </div>
      <div className="flex flex-col max-w-[75%]">
        <div className="rounded-2xl px-5 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex space-x-2 items-center">
            <div className="flex space-x-1">
              <div
                className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <div
                className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <div
                className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </div>
            <span className="text-xs text-muted-foreground ml-2">
              AI is thinking...
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * File attachment preview component
 */
const AttachmentPreview = ({ file, onRemove }) => {
  const isImage = file.type.startsWith("image/")
  const isPDF = file.type === "application/pdf"

  return (
    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
      <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
        {isImage ? (
          <Image className="w-5 h-5 text-slate-600" />
        ) : (
          <FileText className="w-5 h-5 text-slate-600" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{file.name}</p>
        <p className="text-xs text-muted-foreground">
          {Math.round(file.size / 1024)} KB
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onRemove(file)}
        className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
      >
        ×
      </Button>
    </div>
  )
}

/**
 * Modern message input component with all features
 */
const MessageInput = ({
  onSendMessage,
  disabled,
  isGenerating,
  onStopGeneration,
}) => {
  const [message, setMessage] = useState("")
  const [attachedFiles, setAttachedFiles] = useState([])
  const [isDragOver, setIsDragOver] = useState(false)
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)

  const handleSubmit = useCallback(
    (event) => {
      event.preventDefault()
      if ((message.trim() || attachedFiles.length > 0) && !disabled) {
        let finalMessage = message.trim()

        // Add file information to message if files are attached
        if (attachedFiles.length > 0) {
          const fileList = attachedFiles.map((f) => f.name).join(", ")
          finalMessage += `\n\n📎 Files attached: ${fileList}`
        }

        onSendMessage(finalMessage)
        setMessage("")
        setAttachedFiles([])
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto"
        }
      }
    },
    [message, attachedFiles, disabled, onSendMessage]
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

  const handleTextareaChange = (event) => {
    setMessage(event.target.value)

    // Auto-resize textarea
    const textarea = event.target
    textarea.style.height = "auto"
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
  }

  const handleFileSelect = (files) => {
    const newFiles = Array.from(files).filter(
      (file) => file.size <= 10 * 1024 * 1024 // 10MB limit
    )
    setAttachedFiles((prev) => [...prev, ...newFiles])
  }

  const handleFileInputChange = (event) => {
    if (event.target.files) {
      handleFileSelect(event.target.files)
    }
  }

  const handleDragOver = (event) => {
    event.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (event) => {
    event.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setIsDragOver(false)
    if (event.dataTransfer.files) {
      handleFileSelect(event.dataTransfer.files)
    }
  }

  const removeFile = (fileToRemove) => {
    setAttachedFiles((prev) => prev.filter((f) => f !== fileToRemove))
  }

  const handleVoiceInput = () => {
    // Placeholder for voice input functionality
    console.log("Voice input clicked - to be implemented")
  }

  const handleVideoInput = () => {
    // Placeholder for video input functionality
    console.log("Video input clicked - to be implemented")
  }

  return (
    <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2">
      {/* File previews */}
      {attachedFiles.length > 0 && (
        <div className="mb-4 space-y-2">
          {attachedFiles.map((file, index) => (
            <AttachmentPreview key={index} file={file} onRemove={removeFile} />
          ))}
        </div>
      )}

      {/* Main input area */}
      <Card
        className={`relative transition-all duration-200 ${
          isDragOver
            ? "border-blue-400 bg-blue-50 dark:bg-blue-950/20"
            : "border-slate-200 dark:border-slate-700"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="p-0">
          <form onSubmit={handleSubmit} className="flex items-end gap-2 p-3">
            {/* Attachment controls */}
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                className="h-9 w-9 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Attach files"
              >
                <Paperclip className="w-4 h-4" />
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleVoiceInput}
                className="h-9 w-9 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Voice input (coming soon)"
              >
                <Mic className="w-4 h-4" />
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleVideoInput}
                className="h-9 w-9 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Video input (coming soon)"
              >
                <Video className="w-4 h-4" />
              </Button>
            </div>

            {/* Text input */}
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder={
                  isDragOver
                    ? "Drop files here..."
                    : "Type your message here..."
                }
                disabled={disabled}
                className="w-full resize-none border-0 bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 min-h-[36px] max-h-[120px]"
                rows={1}
              />
            </div>

            {/* Send/Stop button */}
            {isGenerating ? (
              <Button
                type="button"
                onClick={onStopGeneration}
                size="icon"
                className="h-9 w-9 bg-red-500 hover:bg-red-600 text-white shadow-sm"
                title="Stop generation"
              >
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                disabled={
                  (!message.trim() && attachedFiles.length === 0) || disabled
                }
                className="h-9 w-9 bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:bg-slate-300 dark:disabled:bg-slate-700"
                title="Send message"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.txt,.csv,.json,.png,.jpg,.jpeg,.gif,.svg"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {isDragOver && (
        <div className="absolute inset-0 bg-blue-500/10 border-2 border-dashed border-blue-400 rounded-lg flex items-center justify-center pointer-events-none">
          <div className="text-blue-600 font-medium">
            Drop files here to attach
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Main MessageView component with all modern features
 */
const MessageView = ({ thread }) => {
  const dispatch = useDispatch()
  const generatingMap = useSelector((state) => state.chatStore.generating)
  const messagesEndRef = useRef(null)
  const isGenerating = Boolean(generatingMap?.[thread.id])
  const isTyping = isGenerating

  // Scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [thread.messages])

  const handleSendMessage = useCallback(
    async (content) => {
      if (!content.trim()) return
      await dispatch(sendMessageThunk(thread.id, content))
    },
    [dispatch, thread.id]
  )

  const handleStopGeneration = useCallback(() => {
    dispatch(stopStreaming(thread.id))
  }, [dispatch, thread.id])

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <ScrollArea className="flex-1">
        <div className="min-h-full">
          {thread.messages.map((message) => (
            <Message key={message.id} message={message} />
          ))}

          {isTyping && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input area */}
      <MessageInput
        onSendMessage={handleSendMessage}
        disabled={isTyping}
        isGenerating={isGenerating}
        onStopGeneration={handleStopGeneration}
      />
    </div>
  )
}

Message.propTypes = {
  message: PropTypes.shape({
    id: PropTypes.string.isRequired,
    content: PropTypes.string.isRequired,
    role: PropTypes.oneOf(["user", "assistant", "tool"]).isRequired,
    timestamp: PropTypes.string.isRequired,
  }).isRequired,
}

MessageInput.propTypes = {
  onSendMessage: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
}

MessageInput.defaultProps = {
  disabled: false,
}

MessageView.propTypes = {
  thread: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    messages: PropTypes.array.isRequired,
  }).isRequired,
}

export default MessageView
