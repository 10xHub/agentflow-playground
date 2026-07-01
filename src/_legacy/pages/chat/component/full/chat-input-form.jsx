import { Send, Square, Paperclip } from "lucide-react"
import PropTypes from "prop-types"

import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from "@/components/ui/input-group"

/**
 * Chat input form component
 */
const ChatInputForm = ({
  message,
  onMessageChange: handleMessageChange,
  onKeyDown: handleKeyDown,
  onSubmit: handleSubmit,
  isDragOver,
  onDragOver: handleDragOver,
  onDragLeave: handleDragLeave,
  onDrop: handleDrop,
  onFileButtonClick: handleFileButtonClick,
  disabled,
  isLoading,
  onStopClick: handleStopClick,
  hasContent,
}) => (
  <form onSubmit={handleSubmit}>
    <InputGroup
      className={`transition-colors ${
        isDragOver ? "border-primary bg-primary/5" : ""
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <InputGroupAddon>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleFileButtonClick}
          disabled={disabled}
        >
          <Paperclip className="w-4 h-4" />
        </Button>
      </InputGroupAddon>

      <InputGroupTextarea
        value={message}
        onChange={handleMessageChange}
        onKeyDown={handleKeyDown}
        placeholder={
          isDragOver
            ? "Drop files here..."
            : "Type your message... (Shift+Enter for new line)"
        }
        disabled={disabled}
        className="min-h-[44px] max-h-[120px] resize-none"
      />

      <InputGroupAddon align="inline-end">
        {isLoading ? (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            onClick={handleStopClick}
          >
            <Square className="w-4 h-4" />
          </Button>
        ) : (
          <Button type="submit" size="icon" disabled={!hasContent}>
            <Send className="w-4 h-4" />
          </Button>
        )}
      </InputGroupAddon>
    </InputGroup>
  </form>
)

ChatInputForm.propTypes = {
  message: PropTypes.string.isRequired,
  onMessageChange: PropTypes.func.isRequired,
  onKeyDown: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  isDragOver: PropTypes.bool.isRequired,
  onDragOver: PropTypes.func.isRequired,
  onDragLeave: PropTypes.func.isRequired,
  onDrop: PropTypes.func.isRequired,
  onFileButtonClick: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  isLoading: PropTypes.bool,
  onStopClick: PropTypes.func.isRequired,
  hasContent: PropTypes.bool.isRequired,
}

ChatInputForm.defaultProps = {
  disabled: false,
  isLoading: false,
}

export default ChatInputForm
