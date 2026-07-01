import { ChevronDown, Plus } from "lucide-react"
import PropTypes from "prop-types"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Label } from "@/components/ui/label"

import ContextMessage from "./ContextMessage"

/**
 * ContextMessagesSection component displays the context messages array
 * @returns {object} Card component displaying context messages
 */
const ContextMessagesSection = ({
  context,
  handleAddMessage,
  onRemoveMessage,
}) => {
  const [isOpen, setIsOpen] = useState(true)
  const messageCount = (context || []).length

  return (
    <Card className="p-3">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="mb-3 flex w-full items-center justify-between gap-3">
          <CollapsibleTrigger className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-md text-left">
            <div className="min-w-0">
              <Label className="text-xs font-semibold text-foreground uppercase tracking-wide">
                Context Messages
                <span className="ml-1.5 text-muted-foreground font-normal normal-case tracking-normal">
                  ({messageCount})
                </span>
              </Label>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Short term conversation memory
              </p>
            </div>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </CollapsibleTrigger>
          <Button
            size="sm"
            variant="outline"
            onClick={handleAddMessage}
            className="h-7 shrink-0 text-xs"
          >
            <Plus className="mr-1 h-3 w-3" />
            Add
          </Button>
        </div>
        <CollapsibleContent>
          <div className="space-y-2">
            {(context || []).map((message, messageIndex) => (
              <ContextMessage
                key={`message-${message.message_id || messageIndex}`}
                message={message}
                index={messageIndex}
                handleRemove={() => onRemoveMessage(messageIndex)}
              />
            ))}
            {messageCount === 0 && (
              <div className="py-8 text-center text-muted-foreground">
                <p className="text-xs">
                  No messages yet. Click &ldquo;Add&rdquo; to start.
                </p>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

ContextMessagesSection.propTypes = {
  context: PropTypes.array.isRequired,
  handleAddMessage: PropTypes.func.isRequired,
  onRemoveMessage: PropTypes.func.isRequired,
}

export default ContextMessagesSection
