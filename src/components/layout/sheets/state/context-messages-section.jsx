import { Plus } from "lucide-react"
import PropTypes from "prop-types"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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
  return (
    <Card className="p-3">
      <div className="flex w-full justify-between items-center mb-3">
        <div>
          <Label className="text-xs font-semibold text-foreground uppercase tracking-wide">
            Context Messages
            <span className="ml-1.5 text-muted-foreground font-normal normal-case tracking-normal">
              ({(context || []).length})
            </span>
          </Label>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Short term conversation memory
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleAddMessage}
          className="h-7 text-xs"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add
        </Button>
      </div>
      <div className="space-y-2">
        {(context || []).map((message, messageIndex) => (
          <ContextMessage
            key={`message-${message.message_id || messageIndex}`}
            message={message}
            index={messageIndex}
            handleRemove={() => onRemoveMessage(messageIndex)}
          />
        ))}
        {(context || []).length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-xs">
              No messages yet. Click &ldquo;Add&rdquo; to start.
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}

ContextMessagesSection.propTypes = {
  context: PropTypes.array.isRequired,
  handleAddMessage: PropTypes.func.isRequired,
  onRemoveMessage: PropTypes.func.isRequired,
}

export default ContextMessagesSection
