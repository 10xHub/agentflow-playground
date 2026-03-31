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
  Settings,
  AlertCircle,
  AlertTriangle,
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
import {
  sendMessage as sendMessageThunk,
  stopStreaming,
} from "@/services/store/slices/chat.slice"
import { buildMessageText, getMessageCopyText } from "@/lib/messageContent"

/**
 * Message component renders individual chat messages with modern design
 */
const Message = ({ message }) => {
  const isUser = message.role === "user"
  const isReasoning = message.kind === "reasoning"
  const isToolCall = message.kind === "tool_call"
  const isToolResult = message.kind === "tool_result" || message.role === "tool"
  const isError = message.kind === "error"
  const showToolMessageContent = useSelector(
    (state) => state.threadSettingsStore.show_tool_message_content
  )
  const displayContent = isUser
    ? message.content
    : buildMessageText(message.rawContent ?? message.content, {
        metadata: message.metadata,
        reasoning: message.reasoning,
        showToolDetails: showToolMessageContent,
        toolCalls: message.toolsCalls,
      })
  const kindLabel = isReasoning
    ? "Reasoning"
    : isToolCall
      ? "Tool Call"
      : isToolResult
        ? "Tool Result"
        : isError
          ? "Error"
          : null
  const bubbleClassName = isUser
    ? "bg-[#f4f4f4] dark:bg-muted font-normal text-foreground"
    : isError
      ? "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3"
      : isReasoning
        ? "bg-muted/30 dark:bg-muted/20 text-muted-foreground border-l-2 border-slate-300 dark:border-slate-700"
        : isToolCall
          ? "bg-muted/30 dark:bg-muted/20 text-muted-foreground border-l-2 border-amber-400 dark:border-amber-600"
          : isToolResult
            ? "bg-muted/30 dark:bg-muted/20 text-muted-foreground border-l-2 border-orange-400 dark:border-orange-600"
            : "bg-transparent text-foreground"
  const avatarClassName = isError
    ? "from-red-100 to-red-200 dark:from-red-900 dark:to-red-950 text-red-600 dark:text-red-400"
    : isToolCall
      ? "from-amber-100 to-amber-200 dark:from-amber-900 dark:to-amber-950 text-amber-600 dark:text-amber-400"
      : isToolResult
        ? "from-orange-100 to-orange-200 dark:from-orange-900 dark:to-orange-950 text-orange-600 dark:text-orange-400"
        : isReasoning
          ? "from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 text-slate-600 dark:text-slate-400"
          : "from-blue-600 to-indigo-600 text-white"

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(
        getMessageCopyText(message, {
          showToolDetails: showToolMessageContent,
        })
      )
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
      className={`flex gap-4 py-6 px-4 md:px-6 w-full max-w-4xl mx-auto ${isUser ? "justify-end" : "justify-start"} group transition-colors`}
    >
      {!isUser && (
        <div
          className={`flex-shrink-0 w-8 h-8 rounded-md bg-gradient-to-br ${avatarClassName} flex items-center justify-center shadow-sm`}
        >
          {isError ? (
            <AlertTriangle className="w-4 h-4 text-current" />
          ) : (
            <Bot className="w-5 h-5 text-current opacity-80" />
          )}
        </div>
      )}
      <div
        className={`flex flex-col flex-1 min-w-0 max-w-[85%] ${isUser ? "items-end" : "items-start"}`}
      >
        {!isUser && kindLabel && (
          <div className="mb-1">
            <span
              className={`inline-flex items-center text-[11px] font-semibold tracking-wider uppercase ${isError ? "text-red-500 dark:text-red-400" : "text-muted-foreground"}`}
            >
              {kindLabel}
            </span>
          </div>
        )}
        <div className={isUser ? "flex justify-end" : "relative w-full"}>
          <div
            className={`${isUser ? "rounded-2xl px-5 py-3 shadow-sm max-w-full" : isError ? "" : "py-1"} ${bubbleClassName}`}
          >
            <div className="text-[15px] leading-relaxed">
              {isUser ? (
                <p className="whitespace-pre-wrap">{message.content}</p>
              ) : isError ? (
                <p className="whitespace-pre-wrap text-sm">{message.content}</p>
              ) : (
                <div className="prose prose-sm max-w-none dark:prose-invert prose-slate">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={MarkdownComponents}
                  >
                    {displayContent}
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
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                    >
                      <Copy className="w-3.5 h-3.5" />
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
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                        >
                          <Code className="w-3.5 h-3.5" />
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
        </div>
      </div>

      {isUser && (
        <div className="flex-shrink-0 mt-0.5 w-8 h-8 rounded-md bg-muted flex items-center justify-center shadow-sm">
          <User className="w-5 h-5 text-muted-foreground" />
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
    <div className="flex gap-4 py-4 px-4 md:px-6 w-full max-w-4xl mx-auto justify-start group">
      <div className="flex-shrink-0 w-8 h-8 rounded-md bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-sm">
        <Bot className="w-5 h-5 text-white opacity-80" />
      </div>
      <div className="flex flex-col flex-1 min-w-0">
        <div className="py-2 px-3 bg-muted/40 rounded-xl w-fit">
          <div className="flex items-center gap-2">
            <div className="flex space-x-1.5">
              <div
                className="w-2 h-2 bg-blue-500/70 rounded-full animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <div
                className="w-2 h-2 bg-blue-500/70 rounded-full animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <div
                className="w-2 h-2 bg-blue-500/70 rounded-full animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </div>
            <span className="text-xs text-muted-foreground animate-pulse font-medium">
              AI is thinking…
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
    <div className="pt-2 pb-4 px-4 bg-transparent w-full max-w-4xl mx-auto">
      {/* File previews */}
      {attachedFiles.length > 0 && (
        <div className="mb-4 space-y-2">
          {attachedFiles.map((file, index) => (
            <AttachmentPreview key={index} file={file} onRemove={removeFile} />
          ))}
        </div>
      )}

      {/* Main input area */}
      <div
        className={`relative transition-all duration-200 rounded-2xl border bg-background shadow-sm ${
          isDragOver
            ? "border-primary bg-primary/5 shadow-md"
            : "border-border/60 hover:border-border focus-within:border-border focus-within:ring-1 focus-within:ring-ring"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="p-0">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-2 p-2 w-full"
          >
            {/* Text input */}
            <div className="flex-1 relative w-full px-2 pt-2">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder={
                  isDragOver
                    ? "Drop files here..."
                    : "Message AgentFlow Workbench..."
                }
                disabled={disabled}
                className="w-full resize-none border-0 bg-transparent text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px] max-h-[200px]"
                rows={1}
              />
            </div>

            <div className="flex items-center justify-between w-full pb-1 px-1">
              {/* Attachment controls */}
              <div className="flex items-center gap-0.5">
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                      >
                        <Paperclip className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Attach files</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleVoiceInput}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                      >
                        <Mic className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      Voice input (coming soon)
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* Send/Stop button */}
              <div className="flex items-center pr-1">
                {isGenerating ? (
                  <Button
                    type="button"
                    onClick={onStopGeneration}
                    size="icon"
                    className="h-8 w-8 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20"
                    title="Stop generation"
                  >
                    <Square className="h-3 w-3 fill-current" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    size="icon"
                    disabled={
                      (!message.trim() && attachedFiles.length === 0) ||
                      disabled
                    }
                    className="h-8 w-8 rounded-full animate-in fade-in zoom-in bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>

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
const MessageView = ({ thread, disabled = false }) => {
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
      if (!content.trim() || disabled) return
      await dispatch(sendMessageThunk(thread.id, content))
    },
    [dispatch, thread.id, disabled]
  )

  const handleStopGeneration = useCallback(() => {
    dispatch(stopStreaming(thread.id))
  }, [dispatch, thread.id])

  return (
    <div className="flex flex-col h-full">
      {/* Warning banner when disabled */}
      {disabled && (
        <div className="flex-shrink-0 p-3 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800">
          <div className="flex items-start gap-2 max-w-4xl mx-auto">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <p className="font-medium mb-1">
                Backend URL is not configured properly
              </p>
              <p className="text-xs">
                Use{" "}
                <code className="bg-amber-100 dark:bg-amber-900 px-1.5 py-0.5 rounded">
                  ?backendUrl=YOUR_URL
                </code>{" "}
                in the URL or click the{" "}
                <Settings className="h-3 w-3 inline mx-0.5" /> Settings icon to
                configure
              </p>
            </div>
          </div>
        </div>
      )}
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
        disabled={isTyping || disabled}
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
    rawContent: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.array,
      PropTypes.object,
    ]),
    kind: PropTypes.string,
    role: PropTypes.oneOf(["user", "assistant", "tool"]).isRequired,
    timestamp: PropTypes.string.isRequired,
    metadata: PropTypes.object,
    reasoning: PropTypes.string,
    toolsCalls: PropTypes.array,
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
  disabled: PropTypes.bool,
}

MessageView.defaultProps = {
  disabled: false,
}

export default MessageView
