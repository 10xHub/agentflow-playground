import { PanelRight } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useSelector } from "react-redux"

import { useConnectionBarSlot } from "@/components/shell/app-shell"
import { BarButton } from "@/components/shell/connection-bar"
import { useConnection } from "@/lib/connection/connection-context"

import styles from "./chat.module.css"
import ChatHeader from "./components/chat-header"
import Composer from "./components/composer"
import Inspector from "./components/inspector"
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

/**
 *
 */
const ChatPage = () => {
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const { setBarRight } = useConnectionBarSlot()
  const { isConnected, capabilities, active } = useConnection()

  const isRealtime = isLiveAgent(isConnected, capabilities)

  const messages = useSelector((s) => s.chat.messages)
  const generating = useSelector((s) => s.chat.generating)
  const error = useSelector((s) => s.chat.error)
  const mode = useSelector((s) => s.chat.mode)
  const threadReference = useRef(null)

  const transport = TRANSPORT[mode] || TRANSPORT.stream

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

  // Keep the newest message in view as it streams in.
  useEffect(() => {
    const element = threadReference.current
    if (element) element.scrollTop = element.scrollHeight
  }, [messages])

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
        <div className={styles.thread} ref={threadReference}>
          {messages.length === 0 ? (
            <div className={styles.streamingNote}>
              Send a message to start · {transport}
            </div>
          ) : (
            messages.map((message) => (
              <Message key={message.id} msg={message} />
            ))
          )}

          {generating && (
            <div className={styles.streamingNote}>
              <span className={styles.sp} />{" "}
              {mode === "invoke" ? "awaiting response" : "receiving stream"} ·{" "}
              {transport}
            </div>
          )}

          {error && (
            <div
              className={styles.streamingNote}
              style={{ color: "var(--danger, #e5484d)" }}
            >
              {error}
            </div>
          )}
        </div>
        <Composer />
      </div>

      {inspectorOpen && <Inspector onClose={() => setInspectorOpen(false)} />}
    </>
  )
}

export default ChatPage
