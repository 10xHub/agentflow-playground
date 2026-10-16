import { ArrowUp, Square } from "lucide-react"
import PropTypes from "prop-types"
import { useState } from "react"
import { useDispatch, useSelector } from "react-redux"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import { track } from "@/lib/analytics"
import { useConnection } from "@/lib/connection/connection-context"
import { summariseRunOptions } from "@/lib/run-options"
import { cn } from "@/lib/utils"
import { sendMessage, stopGeneration } from "@/store/chat-thunks"

import RunOptionsPopup from "./run-options-popup"

// The recorded demo replays prompts from chips; free text has no recording.
const canSendText = ({ text, generating, isConnected, isDemo }) =>
  text.trim().length > 0 && !generating && isConnected && !isDemo

const placeholderFor = (isDemo) =>
  isDemo
    ? "Recorded demo: pick a prompt above"
    : "Message the agent…  (Enter to send, Shift+Enter for a new line)"

const RUN_OPTIONS = [
  {
    focus: "initialState",
    label: "initial_state",
    title: "Set initial_state for the next run",
  },
  {
    focus: "config",
    label: "config",
    title: "Override config / recursion_limit for the next run",
  },
]

/**
 * The prompt input: the message, the per-run options, and send or stop.
 */
const Composer = () => {
  const dispatch = useDispatch()
  const generating = useSelector((s) => s.chat.generating)
  const runOptions = useSelector((s) => s.chat.runOptions)
  const { isConnected, isDemo } = useConnection()
  const [text, setText] = useState("")
  const [popup, setPopup] = useState(null) // null | "initialState" | "config"

  const summary = summariseRunOptions(runOptions)
  const canSend = canSendText({ text, generating, isConnected, isDemo })

  const submit = (e) => {
    e?.preventDefault()
    if (!canSend) return
    dispatch(sendMessage(text))
    // Message text is never sent to analytics.
    track("chat_message_sent", { has_run_options: Boolean(summary) })
    setText("")
  }

  const onKeyDown = (e) => {
    // Enter or ⌘↵ / Ctrl+↵ sends; Shift+Enter inserts a newline.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      submit(e)
    }
  }

  return (
    <div className="relative flex-none px-6 pt-2 pb-4">
      {popup ? (
        <RunOptionsPopup focus={popup} onClose={() => setPopup(null)} />
      ) : null}
      <form onSubmit={submit} className="mx-auto w-full max-w-190">
        <InputGroup className="rounded-2xl border-border bg-card shadow-xs">
          <InputGroupTextarea
            aria-label="Message"
            placeholder={placeholderFor(isDemo)}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={generating || isDemo}
            className="max-h-60 min-h-14 px-3.5 pt-3 text-[13.5px]"
          />
          <InputGroupAddon align="block-end" className="gap-1 pt-0">
            {isConnected && !isDemo
              ? RUN_OPTIONS.map((option) => (
                  <InputGroupButton
                    key={option.focus}
                    size="xs"
                    title={option.title}
                    onClick={() => setPopup(option.focus)}
                    className={cn(
                      "font-mono text-[11px] font-normal",
                      summary && "text-(--accent)"
                    )}
                  >
                    {option.label}
                  </InputGroupButton>
                ))
              : null}
            <ComposerHint
              isConnected={isConnected}
              generating={generating}
              summary={summary}
            />
            {generating ? (
              <InputGroupButton
                size="icon-sm"
                variant="default"
                aria-label="Stop"
                title="Stop"
                className="ml-auto rounded-full"
                onClick={() => dispatch(stopGeneration())}
              >
                <Square className="size-3 fill-current" />
              </InputGroupButton>
            ) : (
              <InputGroupButton
                type="submit"
                size="icon-sm"
                variant="default"
                aria-label="Send"
                title="Send"
                className="ml-auto rounded-full"
                disabled={!canSend}
              >
                <ArrowUp />
              </InputGroupButton>
            )}
          </InputGroupAddon>
        </InputGroup>
      </form>
    </div>
  )
}

/** One short line of state beside the run options. */
const ComposerHint = ({ isConnected, generating, summary = "" }) => {
  const text = !isConnected
    ? "Not connected. Open Connection first."
    : generating
      ? "streaming…"
      : summary
  if (!text) return null
  return (
    <span className="min-w-0 truncate px-1 font-mono text-[11px] font-normal">
      {text}
    </span>
  )
}

ComposerHint.propTypes = {
  isConnected: PropTypes.bool.isRequired,
  generating: PropTypes.bool.isRequired,
  summary: PropTypes.string,
}

export default Composer
