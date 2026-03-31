// import { Sparkles } from "lucide-react"
import {
  Sparkles,
  Settings,
  AlertCircle,
  Zap,
  Code2,
  BookOpen,
  Lightbulb,
} from "lucide-react"
import PropTypes from "prop-types"
import { useState, useRef } from "react"
import { useSelector } from "react-redux"

import EmptyInputCard from "./empty-input-card"

const SUGGESTIONS = [
  {
    icon: Code2,
    label: "Write code",
    prompt:
      "Write a Python function to sort a list of dictionaries by a specific key",
  },
  {
    icon: BookOpen,
    label: "Explain a concept",
    prompt: "Explain how large language models work in simple terms",
  },
  {
    icon: Lightbulb,
    label: "Brainstorm ideas",
    prompt: "Give me 5 creative ideas for a SaaS product that uses AI",
  },
  {
    icon: Zap,
    label: "Summarize text",
    prompt: "Summarize the key points of the following text:",
  },
]

/**
 * EmptyChatView component displays when no thread is selected or active thread has no messages
 * Styled to match Claude's clean and modern empty state design
 */
const EmptyChatUI = ({ onNewChat, onSendMessage, disabled = false }) => {
  const [message, setMessage] = useState("")
  const fileInputReference = useRef(null)
  const store = useSelector((state) => state?.settingsStore)

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

  const handleSuggestion = (prompt) => {
    if (!disabled) {
      setMessage(prompt)
    }
  }

  return (
    <div className="flex items-center justify-center h-full w-full">
      <div className="flex flex-col items-center w-full max-w-2xl mx-auto px-4">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-3 gap-3">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-md">
              <Sparkles className="w-6 h-6 text-white" />
            </span>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {store?.name && store.name.length > 0 ? store.name : "AgentFlow"}
            </h1>
          </div>
          <p className="text-base text-muted-foreground">
            Powered by AI Intelligence
          </p>
          {disabled && (
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg max-w-md mx-auto">
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

        {/* Quick suggestion chips */}
        {!disabled && (
          <div className="mt-5 w-full">
            <p className="text-xs text-muted-foreground text-center mb-3 font-medium uppercase tracking-wider">
              Try asking about
            </p>
            <div className="grid grid-cols-2 gap-2">
              {SUGGESTIONS.map(({ icon: Icon, label, prompt }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleSuggestion(prompt)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-border/60 bg-background/60 hover:bg-muted/60 hover:border-border transition-all text-left group"
                >
                  <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </span>
                  <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors font-medium truncate">
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
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
