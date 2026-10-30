import { MessageSquareDashed, PanelRight } from "lucide-react"
import PropTypes from "prop-types"
import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"

import { useConnectionBarSlot } from "@/components/shell/app-shell"
import { BarButton } from "@/components/shell/connection-bar"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller"
import { useConnection } from "@/lib/connection/connection-context"
import { setError, setMode } from "@/store/chat-slice"
import {
  WS_UNAVAILABLE_MESSAGE,
  loadPendingInterrupt,
} from "@/store/chat-thunks"

import styles from "./chat.module.css"
import ChatHeader from "./components/chat-header"
import Composer from "./components/composer"
import DemoPrompts from "./components/demo-prompts"
import Inspector from "./components/inspector"
import InterruptCard from "./components/interrupt-card"
import Message from "./components/message"
import RealtimeGate from "./components/realtime-gate"

// A live (realtime) agent rejects turn-based chat; show a dedicated state instead.
const isLiveAgent = (isConnected, capabilities) =>
  isConnected && Boolean(capabilities?.find((c) => c.name === "live")?.on)

// How the current mode reaches the server, for the status lines below.
const TRANSPORT = {
  invoke: "POST /v1/graph/invoke",
  ws: "WS /v1/graph/ws",
  stream: "POST /v1/graph/stream",
}

const emptyNote = (isDemo, transport) =>
  isDemo
    ? "Recorded demo · pick a prompt below to replay a real run"
    : `Send a message to start · ${transport}`

/** The empty thread: what to do first, and which endpoint it will hit. */
const EmptyThread = ({ note }) => (
  <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
    <div className="flex size-10 items-center justify-center rounded-xl border bg-card text-muted-foreground">
      <MessageSquareDashed className="size-5" />
    </div>
    <p className="font-mono text-xs text-muted-foreground">{note}</p>
  </div>
)

EmptyThread.propTypes = { note: PropTypes.string.isRequired }

/** The live run line under the last turn, or the run's error. */
const RunStatus = ({ generating, error = null, label }) => {
  const dispatch = useDispatch()
  if (error) {
    return (
      <p role="alert" className="font-mono text-xs text-destructive">
        {error}
        {error === WS_UNAVAILABLE_MESSAGE && (
          <button
            type="button"
            className="ml-2 underline"
            onClick={() => {
              dispatch(setMode("stream"))
              dispatch(setError(null))
            }}
          >
            Switch to Stream
          </button>
        )}
      </p>
    )
  }
  if (!generating) return null
  return (
    <p className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
      <span className={styles.sp} /> {label}
    </p>
  )
}

RunStatus.propTypes = {
  generating: PropTypes.bool.isRequired,
  error: PropTypes.string,
  label: PropTypes.string.isRequired,
}

/**
 * The conversation. The user's turn is the scroll anchor, so a new question
 * settles near the top and the reply streams in under it.
 */
const Thread = ({ messages, generating, error = null, label }) => (
  <MessageScroller>
    <MessageScrollerViewport aria-label="Conversation">
      <MessageScrollerContent
        aria-busy={generating}
        className="mx-auto w-full max-w-190 gap-7 px-6 py-6"
      >
        {messages.map((message) => (
          <MessageScrollerItem
            key={message.id}
            messageId={message.id}
            scrollAnchor={message.role === "user"}
          >
            <Message msg={message} />
          </MessageScrollerItem>
        ))}
        <InterruptCard />
        <RunStatus generating={generating} error={error} label={label} />
      </MessageScrollerContent>
    </MessageScrollerViewport>
    <MessageScrollerButton />
  </MessageScroller>
)

Thread.propTypes = {
  messages: PropTypes.arrayOf(
    PropTypes.shape({ id: PropTypes.string, role: PropTypes.string })
  ).isRequired,
  generating: PropTypes.bool.isRequired,
  error: PropTypes.string,
  label: PropTypes.string.isRequired,
}

/**
 *
 */
const ChatPage = () => {
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const { setBarRight } = useConnectionBarSlot()
  const { isConnected, capabilities, active, isDemo } = useConnection()

  const isRealtime = isLiveAgent(isConnected, capabilities)

  const messages = useSelector((s) => s.chat.messages)
  const generating = useSelector((s) => s.chat.generating)
  const error = useSelector((s) => s.chat.error)
  const mode = useSelector((s) => s.chat.mode)
  const threadId = useSelector((s) => s.chat.threadId)
  const hasPending = useSelector((s) => Boolean(s.chat.pendingInterrupt))
  const dispatch = useDispatch()

  // A thread reopened after a reload may still be paused: offer its interrupt.
  useEffect(() => {
    if (isConnected && threadId) dispatch(loadPendingInterrupt())
  }, [isConnected, threadId, dispatch])

  const transport = TRANSPORT[mode] || TRANSPORT.stream
  const runLabel = `${mode === "invoke" ? "awaiting response" : "receiving stream"} · ${transport}`

  // Publish the inspector toggle into the shared connection bar; clear on leave.
  // A realtime agent has no turn-based inspector, so don't offer it in that state.
  useEffect(() => {
    if (isRealtime) {
      setBarRight(null)
      return undefined
    }
    setBarRight(
      <BarButton
        armed={inspectorOpen}
        onClick={() => setInspectorOpen((o) => !o)}
      >
        <PanelRight size={15} />
        Inspector
      </BarButton>
    )
    return () => setBarRight(null)
  }, [inspectorOpen, setBarRight, isRealtime])

  if (isRealtime) {
    return (
      <div className={styles.main}>
        <RealtimeGate agentName={active?.name} />
      </div>
    )
  }

  return (
    <>
      <div className={styles.main}>
        <ChatHeader />
        <MessageScrollerProvider autoScroll>
          <div className="relative min-h-0 flex-1">
            {messages.length === 0 && !hasPending ? (
              <EmptyThread note={emptyNote(isDemo, transport)} />
            ) : (
              <Thread
                messages={messages}
                generating={generating}
                error={error}
                label={runLabel}
              />
            )}
          </div>
        </MessageScrollerProvider>
        <DemoPrompts enabled={isDemo} />
        <Composer />
      </div>

      {inspectorOpen && <Inspector onClose={() => setInspectorOpen(false)} />}
    </>
  )
}

export default ChatPage
