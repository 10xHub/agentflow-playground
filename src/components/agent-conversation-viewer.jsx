/**
 * Agent Conversation Viewer Component
 *
 * Displays real-time agent-to-agent conversations and communications.
 */

// eslint-disable-next-line import/named
import { A2UIClient } from "@10xscale/agentflow-client"
import PropTypes from "prop-types"
import React, { useState, useEffect, useRef } from "react"

// eslint-disable-next-line max-lines-per-function
const AgentConversationViewer = ({ baseUrl, agentId, authToken }) => {
  const [messages, setMessages] = useState([])
  const [thinking, setThinking] = useState(null)
  const [connectionState, setConnectionState] = useState("disconnected")
  const [error, setError] = useState(null)
  const messagesEndReference = useRef(null)

  const scrollToBottom = () => {
    messagesEndReference.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, thinking])

  useEffect(() => {
    const client = new A2UIClient({
      baseUrl,
      agentId: agentId || "*",
      authToken,
      debug: true,
    })

    client.onConnectionChange((state) => {
      setConnectionState(state)
    })

    // Handle agent messages
    client.on("AGENT_MESSAGE", (message) => {
      setMessages((previous) => [
        ...previous,
        {
          id: message.message_id || Date.now(),
          agent_id: message.agent_id,
          content: message.data.content,
          role: message.data.role,
          timestamp: message.timestamp,
          type: "message",
        },
      ])
    })

    // Handle agent thinking
    client.on("AGENT_THINKING", (message) => {
      setThinking({
        agent_id: message.agent_id,
        thinking: message.data.thinking,
        step: message.data.step,
      })
    })

    // Handle agent completion (clear thinking)
    client.on("AGENT_COMPLETE", (message) => {
      setThinking(null)
      setMessages((previous) => [
        ...previous,
        {
          id: Date.now(),
          agent_id: message.agent_id,
          content: `Completed: ${JSON.stringify(message.data.result)}`,
          role: "system",
          timestamp: message.timestamp,
          type: "complete",
        },
      ])
    })

    // Handle errors
    client.on("AGENT_ERROR", (message) => {
      setMessages((previous) => [
        ...previous,
        {
          id: Date.now(),
          agent_id: message.agent_id,
          content: `Error: ${message.data.error}`,
          role: "system",
          timestamp: message.timestamp,
          type: "error",
        },
      ])
    })

    client.onError((error_) => {
      setError(error_.message)
    })

    client.connect()

    return () => {
      client.disconnect()
    }
  }, [baseUrl, agentId, authToken])

  const handleClearMessages = () => {
    setMessages([])
    setThinking(null)
  }

  return (
    <div className="agent-conversation-viewer flex flex-col h-full">
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div>
          <h3 className="font-semibold">
            Agent Conversation {agentId && `- ${agentId}`}
          </h3>
          <div className="flex items-center gap-2 text-sm mt-1">
            <div
              className={`w-2 h-2 rounded-full ${
                connectionState === "connected" ? "bg-green-500" : "bg-red-500"
              }`}
            ></div>
            <span className="text-gray-600 capitalize">{connectionState}</span>
          </div>
        </div>
        <button
          onClick={handleClearMessages}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
        >
          Clear
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
        {messages.length === 0 && !thinking && (
          <div className="text-center text-gray-500 py-8">
            No messages yet. Waiting for agent communication...
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {thinking && <ThinkingIndicator thinking={thinking} />}

        <div ref={messagesEndReference} />
      </div>
    </div>
  )
}

const MessageBubble = ({ message }) => {
  const isSystem = message.role === "system"
  const isError = message.type === "error"
  const isComplete = message.type === "complete"

  const bgColor = isError
    ? "bg-red-100 border-red-300"
    : isComplete
      ? "bg-green-100 border-green-300"
      : isSystem
        ? "bg-gray-100 border-gray-300"
        : "bg-white border-gray-200"

  return (
    <div className="mb-3">
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-xs font-medium text-gray-600">
          {message.agent_id}
        </span>
        <span className="text-xs text-gray-400">
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
        <span className="text-xs px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded">
          {message.role}
        </span>
      </div>
      <div className={`border rounded-lg p-3 ${bgColor}`}>
        <div className="whitespace-pre-wrap">{message.content}</div>
      </div>
    </div>
  )
}

MessageBubble.propTypes = {
  message: PropTypes.shape({
    role: PropTypes.string,
    type: PropTypes.string,
    agent_id: PropTypes.string,
    timestamp: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    content: PropTypes.string,
  }).isRequired,
}

const ThinkingIndicator = ({ thinking }) => {
  return (
    <div className="mb-3 animate-pulse">
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-xs font-medium text-gray-600">
          {thinking.agent_id}
        </span>
        <span className="text-xs text-blue-600">thinking...</span>
        {thinking.step && (
          <span className="text-xs text-gray-400">Step: {thinking.step}</span>
        )}
      </div>
      <div className="border border-blue-200 rounded-lg p-3 bg-blue-50">
        <div className="text-blue-800 italic">{thinking.thinking}</div>
      </div>
    </div>
  )
}

ThinkingIndicator.propTypes = {
  thinking: PropTypes.shape({
    agent_id: PropTypes.string,
    step: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    thinking: PropTypes.string,
  }).isRequired,
}

AgentConversationViewer.propTypes = {
  baseUrl: PropTypes.string.isRequired,
  agentId: PropTypes.string,
  authToken: PropTypes.string,
}

AgentConversationViewer.defaultProps = {
  agentId: null,
  authToken: null,
}

export default AgentConversationViewer
