/* eslint-disable unicorn/filename-case */
import PropTypes from "prop-types"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { buildMessageText } from "@/lib/messageContent"

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
  const isLongContent = contentText.length > 100

  return (
    <div className="border border-border/30 rounded-md p-3 space-y-2 bg-background/50 hover:bg-background/70 transition-all duration-200">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xs font-medium text-muted-foreground">
            #{index + 1}
          </span>
          <span
            className={cn(
              "text-[10px] font-medium px-1.5 py-0.5 rounded",
              message.role === "user"
                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                : message.role === "assistant"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : message.role === "system"
                    ? "bg-violet-500/10 text-violet-600 dark:text-violet-400"
                    : "bg-muted text-muted-foreground"
            )}
          >
            {message.role}
          </span>
          <span className="text-xs text-muted-foreground">
            ID: {message.message_id || "auto"}
          </span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleRemove}
          className="h-6 w-6 p-0 hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
        >
          ×
        </Button>
      </div>

      <div className="space-y-2">
        <div className="text-sm leading-relaxed whitespace-pre-wrap">
          {isLongContent
            ? `${contentText.slice(0, 100)}...`
            : contentText || "No content"}
        </div>

        {isLongContent && (
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              Show full content
            </summary>
            <div className="mt-2 p-2 bg-muted/50 rounded text-sm whitespace-pre-wrap">
              {contentText}
            </div>
          </details>
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
