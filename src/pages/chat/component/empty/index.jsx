import { Sparkles } from "lucide-react"
import PropTypes from "prop-types"
import { useState, useRef } from "react"
import { useSelector } from "react-redux"

import ct from "@constants/"

import EmptyInputCard from "./EmptyInputCard"
import QuickAction from "./QuickAction"

/**
 * EmptyChatView component displays when no thread is selected or active thread has no messages
 * Styled to match Claude's clean and modern empty state design
 */
const EmptyChatUI = ({ onNewChat, onSendMessage }) => {
  const [message, setMessage] = useState("")
  const fileInputReference = useRef(null)

  const store = useSelector((state) => state[ct.store.SETTINGS_STORE])

  const handleSubmit = (event) => {
    event.preventDefault()
    if (message.trim()) {
      onSendMessage?.(message.trim())
      setMessage("")
    }
  }

  const handleFileAttach = () => {
    fileInputReference.current?.click()
  }

  const handleFileChange = (event) => {
    const { files } = event.target
    if (files && files.length > 0) {
      // Start new chat with file attachment
      onNewChat()
      // Here you could handle file processing and add to the new chat
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with logo and greeting */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto px-6">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-semibold ml-3 text-foreground">
              {store.name && store.name.length > 0 ? (
                <span>{store.name}</span>
              ) : (
                <span>PyAgenity</span>
              )}
            </h1>
          </div>
          <p className="text-xs text-muted-foreground">
            Powered by AI Intelligence
          </p>
        </div>

        {/* Large input area with shine border */}
        <EmptyInputCard
          onHandleSubmit={handleSubmit}
          message={message}
          setMessage={setMessage}
          onHandleFileChange={handleFileChange}
          onHandleFileAttach={handleFileAttach}
          fileInputReference={fileInputReference}
        />

        {/* Quick Actions */}
        <QuickAction />
      </div>
    </div>
  )
}

EmptyChatUI.propTypes = {
  onNewChat: PropTypes.func.isRequired,
  onSendMessage: PropTypes.func.isRequired,
}

export default EmptyChatUI
