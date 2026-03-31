// import { Sparkles } from "lucide-react"
import { Sparkles, Settings, AlertCircle } from "lucide-react"
import PropTypes from "prop-types"
import { useState, useRef } from "react"
import { useSelector } from "react-redux"

import EmptyInputCard from "./EmptyInputCard"

/**
 * EmptyChatView component displays when no thread is selected or active thread has no messages
 * Styled to match Claude's clean and modern empty state design
 */
const EmptyChatUI = ({ onNewChat, onSendMessage, disabled = false }) => {
  const [message, setMessage] = useState("")
  const fileInputReference = useRef(null)
  const store = useSelector((state) => state?.settings)

  const handleSubmit = (event) => {
    event.preventDefault()
    if (message.trim() && !disabled) {
      onSendMessage?.(message.trim())
      setMessage("")
    }
  }

  // const handleFileAttach = () => {
  //   fileInputReference.current?.click()
  // }

  const handleFileChange = (event) => {
    const { files } = event.target
    if (files && files.length > 0) {
      // Start new chat with file attachment
      onNewChat()
      // Here you could handle file processing and add to the new chat
    }
  }

  return (
    <div className="flex items-center justify-center h-screen w-full">
      <div className="flex flex-col items-center w-full max-w-xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-2 gap-2">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
              <Sparkles className="w-6 h-6 text-white" />
            </span>
            <h1 className="text-3xl font-semibold text-foreground">
              {store?.name && store.name.length > 0 ? store.name : "AgentFlow"}
            </h1>
          </div>
          <p className="text-base text-muted-foreground">
            Powered by AI Intelligence
          </p>
          {disabled && (
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg max-w-md">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  <p className="font-medium mb-1">
                    Backend URL is not configured properly
                  </p>
                  <p className="text-xs">
                    Use{" "}
                    <code className="bg-amber-100 dark:bg-amber-900 px-1.5 py-0.5 rounded">
                      ?backendUrl=YOUR_URL
                    </code>{" "}
                    in the URL or click the{" "}
                    <Settings className="h-3 w-3 inline mx-0.5" /> Settings icon
                    to configure
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        <EmptyInputCard
          onHandleSubmit={handleSubmit}
          message={message}
          setMessage={setMessage}
          onHandleFileChange={handleFileChange}
          fileInputReference={fileInputReference}
          disabled={disabled}
        />
      </div>
    </div>
  )
}

EmptyChatUI.propTypes = {
  onNewChat: PropTypes.func.isRequired,
  onSendMessage: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
}

EmptyChatUI.defaultProps = {
  disabled: false,
}

export default EmptyChatUI
