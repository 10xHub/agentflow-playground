/* eslint-disable unicorn/filename-case */
import { Bot, User, Copy, FileText, Image, Zap } from "lucide-react"
import PropTypes from "prop-types"
import ReactMarkdown from "react-markdown"
import { useSelector } from "react-redux"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"
import remarkGfm from "remark-gfm"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { buildMessageText, getMessageCopyText } from "@/lib/messageContent"

/**
 * Markdown components for syntax highlighting
 */
const MarkdownComponents = {
  code: ({ inline, className, children }) => {
    const match = /language-(\w+)/.exec(className || "")
    const language = match ? match[1] : ""

    if (!inline && language) {
      return (
        <SyntaxHighlighter
          style={oneDark}
          language={language}
          PreTag="div"
          className="rounded-md !my-2"
          customStyle={{
            margin: "0.5rem 0",
            borderRadius: "0.375rem",
            fontSize: "0.875rem",
          }}
        >
          {String(children).replace(/\n$/, "")}
        </SyntaxHighlighter>
      )
    }

    return (
      <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">
        {children}
      </code>
    )
  },
}

/**
 * File attachment preview component
 */
const FileAttachment = ({ file, index }) => (
  <div
    key={`file-${file.name}-${index}`}
    className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg"
  >
    <div className="w-8 h-8 rounded bg-background flex items-center justify-center">
      {file.type?.startsWith("image/") ? (
        <Image className="w-4 h-4" />
      ) : (
        <FileText className="w-4 h-4" />
      )}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium truncate">{file.name}</p>
      <p className="text-xs text-muted-foreground">
        {file.size ? `${Math.round(file.size / 1024)} KB` : "Unknown size"}
      </p>
    </div>
  </div>
)

FileAttachment.propTypes = {
  file: PropTypes.shape({
    name: PropTypes.string.isRequired,
    type: PropTypes.string,
    size: PropTypes.number,
  }).isRequired,
  index: PropTypes.number.isRequired,
}

/**
 * Message component that handles different message types
 */
// eslint-disable-next-line max-lines-per-function, complexity
const Message = ({ message, onCopy }) => {
  const isUser = message.role === "user"
  const isTool = message.role === "tool"
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

  const handleCopy = () => {
    try {
      const copyValue = getMessageCopyText(message, {
        showToolDetails: showToolMessageContent,
      })

      navigator.clipboard.writeText(copyValue)
      onCopy?.(copyValue)
    } catch (error) {
      console.warn("Failed to copy to clipboard:", error)
    }
  }

  return (
    <div className={`flex gap-4 p-4 group ${isUser ? "justify-end" : ""}`}>
      {/* Avatar */}
      {!isUser && (
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarFallback className={isTool ? "bg-orange-500" : "bg-blue-500"}>
            {isTool ? <Zap className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
          </AvatarFallback>
        </Avatar>
      )}

      {/* Message Content */}
      <div className={`flex flex-col max-w-[80%] ${isUser ? "items-end" : ""}`}>
        {/* Message Type Badge */}
        {isTool && (
          <Badge variant="secondary" className="mb-2 self-start">
            Tool Result
          </Badge>
        )}

        {/* Message Bubble */}
        <Card
          className={`shadow-sm ${
            isUser
              ? "bg-blue-600 text-white border-blue-600"
              : isTool
                ? "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800"
                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
          }`}
        >
          <CardContent className="p-4">
            {/* File Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="space-y-2 mb-3">
                {message.attachments.map((file, index) => (
                  <FileAttachment key={file.name} file={file} index={index} />
                ))}
              </div>
            )}

            {/* Message Content */}
            <div className="text-sm leading-relaxed">
              {isUser ? (
                <div className="whitespace-pre-wrap">{message.content}</div>
              ) : (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={MarkdownComponents}
                  >
                    {displayContent}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Message Actions */}
        <div className="flex items-center gap-2 mt-2 px-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-xs text-muted-foreground">
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>

          {!isUser && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-6 w-6 p-0"
            >
              <Copy className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      {/* User Avatar */}
      {isUser && (
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarFallback className="bg-blue-600">
            <User className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
      )}
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
    role: PropTypes.oneOf(["user", "assistant", "tool"]).isRequired,
    timestamp: PropTypes.string.isRequired,
    attachments: PropTypes.array,
    metadata: PropTypes.object,
    reasoning: PropTypes.string,
    toolsCalls: PropTypes.array,
  }).isRequired,
  onCopy: PropTypes.func,
}

Message.defaultProps = {
  onCopy: null,
}

export default Message
