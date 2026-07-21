/* eslint-disable unicorn/filename-case */
import { User, Bot, Wrench, Monitor, X } from "lucide-react"
import PropTypes from "prop-types"

import { Button } from "@/components/ui/button"
import { buildMessageText } from "@/lib/messageContent"
import { cn } from "@/lib/utils"

const ROLE_CONFIG = {
  user: {
    icon: User,
    label: "User",
    badge:
      "bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/20",
    accent: "border-l-blue-500",
  },
  assistant: {
    icon: Bot,
    label: "Assistant",
    badge:
      "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20",
    accent: "border-l-emerald-500",
  },
  tool: {
    icon: Wrench,
    label: "Tool",
    badge:
      "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20",
    accent: "border-l-amber-500",
  },
  system: {
    icon: Monitor,
    label: "System",
    badge:
      "bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/20",
    accent: "border-l-violet-500",
  },
}

const tryParseJSON = (text) => {
  if (typeof text !== "string") return null
  const trimmed = text.trim()
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    try {
      const parsed = JSON.parse(trimmed)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return null
    }
  }
  return null
}

const ContentBlock = ({ text }) => {
  const jsonFormatted = tryParseJSON(text)
  if (jsonFormatted) {
    return (
      <pre className="text-xs font-mono bg-muted/60 dark:bg-muted/30 rounded-md p-2.5 overflow-x-auto whitespace-pre border border-border/30 max-h-[200px] overflow-y-auto">
        <code>{jsonFormatted}</code>
      </pre>
    )
  }
  return (
    <div className="text-[13px] leading-relaxed whitespace-pre-wrap break-words text-foreground/90">
      {text || <span className="italic text-muted-foreground">No content</span>}
    </div>
  )
}

ContentBlock.propTypes = {
  text: PropTypes.string,
}

ContentBlock.defaultProps = {
  text: "",
}

/**
 * Helper component for context message management
 */
const ContextMessage = ({
  message,
  index,
  onUpdate: _onUpdate,
  handleRemove,
}) => {
  const contentText = buildMessageText(message.content, {
    metadata: message.metadata,
    reasoning: message.reasoning,
    showToolDetails: true,
    toolCalls: message.toolsCalls || message.tools_calls,
  })
  const roleConfig = ROLE_CONFIG[message.role] || ROLE_CONFIG.system
  const Icon = roleConfig.icon
  const isLongContent = contentText.length > 300

  return (
    <div
      className={cn(
        "rounded-lg border border-border/40 bg-card/50 hover:bg-card/80 transition-all duration-150 overflow-hidden",
        "border-l-[3px]",
        roleConfig.accent
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/20 border-b border-border/20">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground/70 w-5 text-right">
            {index + 1}
          </span>
          <div
            className={cn(
              "inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full",
              roleConfig.badge
            )}
          >
            <Icon className="h-3 w-3" />
            {roleConfig.label}
          </div>
          {message.message_id && (
            <span
              className="text-[10px] text-muted-foreground/60 font-mono truncate max-w-[140px]"
              title={message.message_id}
            >
              {message.message_id}
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleRemove}
          className="h-5 w-5 p-0 hover:bg-destructive/15 text-muted-foreground/50 hover:text-destructive rounded-full"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      {/* Content */}
      <div className="px-3 py-2.5">
        {isLongContent ? (
          <details className="group">
            <summary className="cursor-pointer select-none list-none">
              <ContentBlock text={contentText.slice(0, 300)} />
              <span className="text-[11px] text-primary/70 hover:text-primary font-medium mt-1.5 inline-block group-open:hidden">
                ▸ Show more ({contentText.length} chars)
              </span>
              <span className="text-[11px] text-primary/70 hover:text-primary font-medium mt-1.5 hidden group-open:inline-block">
                ▾ Show less
              </span>
            </summary>
            <div className="mt-2">
              <ContentBlock text={contentText} />
            </div>
          </details>
        ) : (
          <ContentBlock text={contentText} />
        )}
      </div>
    </div>
  )
}

ContextMessage.propTypes = {
  message: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  onUpdate: PropTypes.func.isRequired,
  handleRemove: PropTypes.func.isRequired,
}

export default ContextMessage
