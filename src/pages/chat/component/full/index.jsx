import PropTypes from "prop-types"
import { useState, useCallback } from "react"

import { useToast } from "@/components/ui/use-toast"

import ChatInput from "./ChatInput"
import MessageList from "./MessageList"

/**
 * Main FullMessageUI component
 */
const FullMessageUI = ({ thread }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [toolCalls, setToolCalls] = useState([])
  const { toast } = useToast()

  const handleSendMessage = useCallback(
    async ({ content, attachments }) => {
      if (!content && attachments.length === 0) return

      setIsLoading(true)
      setToolCalls([])

      try {
        // Here you would integrate with your chat API
        // For now, we'll simulate a response
        console.warn("Sending message:", { content, attachments })

        // Simulate tool calls
        if (
          content.toLowerCase().includes("search") ||
          content.toLowerCase().includes("find")
        ) {
          setToolCalls([
            {
              name: "web_search",
              description: "Searching the web...",
            },
          ])
          // Simulate delay for tool execution
          await new Promise((resolve) => {
            window.setTimeout(resolve, 2000)
          })
        }

        toast({
          title: "Message sent",
          description: "Your message has been sent successfully.",
        })
      } catch {
        toast({
          title: "Error",
          description: "Failed to send message. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
        setToolCalls([])
      }
    },
    [toast]
  )

  const handleStop = useCallback(() => {
    setIsLoading(false)
    setToolCalls([])
    toast({
      title: "Stopped",
      description: "Message generation stopped.",
    })
  }, [toast])

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      <MessageList
        messages={thread?.messages || []}
        isLoading={isLoading}
        toolCalls={toolCalls}
      />

      <ChatInput
        onSendMessage={handleSendMessage}
        disabled={isLoading}
        isLoading={isLoading}
        onStop={handleStop}
      />
    </div>
  )
}

FullMessageUI.propTypes = {
  thread: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    messages: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        content: PropTypes.string.isRequired,
        role: PropTypes.oneOf(["user", "assistant", "tool"]).isRequired,
        timestamp: PropTypes.string.isRequired,
        attachments: PropTypes.array,
      })
    ).isRequired,
  }).isRequired,
}

export default FullMessageUI
