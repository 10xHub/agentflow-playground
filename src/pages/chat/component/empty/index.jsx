// import { Sparkles } from "lucide-react"
import { Sparkles } from "lucide-react"
import PropTypes from "prop-types"
import { useState, useRef } from "react"
import { useSelector } from "react-redux"

import EmptyInputCard from "./EmptyInputCard"

/**
 * EmptyChatView component displays when no thread is selected or active thread has no messages
 * Styled to match Claude's clean and modern empty state design
 */
const EmptyChatUI = ({ onNewChat, onSendMessage }) => {
  const [message, setMessage] = useState("")
  const fileInputReference = useRef(null)
  const store = useSelector((state) => state?.settings)

  // const store = useSelector((state) => state[ct.store.SETTINGS_STORE])

  const handleSubmit = (event) => {
    event.preventDefault()
    if (message.trim()) {
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
    <div className="flex items-center justify-center h-screen w-full bg-gradient-to-b from-[#181c2a] via-[#23263a] to-[#181c2a]">
      <div className="flex flex-col items-center w-full max-w-xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-2 gap-2">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
              <Sparkles className="w-6 h-6 text-white" />
            </span>
            <h1 className="text-3xl font-semibold text-foreground">
              {store?.name && store.name.length > 0 ? store.name : "PyAgenity"}
            </h1>
          </div>
          <p className="text-base text-muted-foreground">
            Powered by AI Intelligence
          </p>
        </div>
        <EmptyInputCard
          onHandleSubmit={handleSubmit}
          message={message}
          setMessage={setMessage}
          onHandleFileChange={handleFileChange}
          fileInputReference={fileInputReference}
        />
      </div>
    </div>
  )
}

EmptyChatUI.propTypes = {
  onNewChat: PropTypes.func.isRequired,
  onSendMessage: PropTypes.func.isRequired,
}

export default EmptyChatUI
