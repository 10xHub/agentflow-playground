import { PanelRight } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useSelector } from "react-redux"

import { BarButton } from "@/components/shell/ConnectionBar"
import { useConnectionBarSlot } from "@/components/shell/AppShell"
import { useConnection } from "@/lib/connection/ConnectionContext"

import ChatHeader from "./components/ChatHeader"
import Composer from "./components/Composer"
import Inspector from "./components/Inspector"
import Message from "./components/Message"
import RealtimeGate from "./components/RealtimeGate"
import styles from "./chat.module.css"

export default function ChatPage() {
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const { setBarRight } = useConnectionBarSlot()
  const { isConnected, capabilities, active } = useConnection()

  // A live (realtime) agent rejects turn-based chat; show a dedicated state instead.
  const isRealtime =
    isConnected && Boolean(capabilities?.find((c) => c.name === "live")?.on)

  const messages = useSelector((s) => s.chat.messages)
  const generating = useSelector((s) => s.chat.generating)
  const error = useSelector((s) => s.chat.error)
  const mode = useSelector((s) => s.chat.mode)
  const threadRef = useRef(null)

  // How the current mode reaches the server, for the status lines below.
  const transport =
    mode === "invoke"
      ? "POST /v1/graph/invoke"
      : mode === "ws"
        ? "WS /v1/graph/ws"
        : "POST /v1/graph/stream"

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
    const el = threadRef.current
    if (el) el.scrollTop = el.scrollHeight
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
        <div className={styles.thread} ref={threadRef}>
          {messages.length === 0 ? (
            <div className={styles.streamingNote}>
              Send a message to start · {transport}
            </div>
          ) : (
            messages.map((msg) => <Message key={msg.id} msg={msg} />)
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
