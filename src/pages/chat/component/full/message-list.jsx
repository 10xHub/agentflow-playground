import PropTypes from "prop-types"
import { useRef, useEffect } from "react"

import { ScrollArea } from "@/components/ui/scroll-area"

import InProgressMessage from "./InProgressMessage"
import Message from "./MessageComponent"

/**
 * Message list component
 */
const MessageList = ({ messages, isLoading, toolCalls }) => {
  const messagesEndReference = useRef(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndReference.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  return (
    <ScrollArea className="h-full w-full">
      <div className="space-y-1 p-4">
        {messages.map((message) => (
          <Message key={message.id} message={message} />
        ))}

        {isLoading && <InProgressMessage toolCalls={toolCalls} />}

        <div ref={messagesEndReference} />
      </div>
    </ScrollArea>
  )
}

MessageList.propTypes = {
  messages: PropTypes.array.isRequired,
  isLoading: PropTypes.bool,
  toolCalls: PropTypes.array,
}

MessageList.defaultProps = {
  isLoading: false,
  toolCalls: [],
}

export default MessageList
