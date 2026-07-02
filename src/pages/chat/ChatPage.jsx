import { PanelRight } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useSelector } from "react-redux"

import { BarButton } from "@/components/shell/ConnectionBar"
import { useConnectionBarSlot } from "@/components/shell/AppShell"

import ChatHeader from "./components/ChatHeader"
import Composer from "./components/Composer"
import Inspector from "./components/Inspector"
import Message from "./components/Message"
import styles from "./chat.module.css"

export default function ChatPage() {
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const { setBarRight } = useConnectionBarSlot()

  const messages = useSelector((s) => s.chat.messages)
  const generating = useSelector((s) => s.chat.generating)
  const error = useSelector((s) => s.chat.error)
  const threadRef = useRef(null)

  // Publish the inspector toggle into the shared connection bar; clear on leave.
  useEffect(() => {
    setBarRight(
      <BarButton armed={inspectorOpen} onClick={() => setInspectorOpen((o) => !o)}>
        <PanelRight size={15} />
        Inspector
      </BarButton>
    )
    return () => setBarRight(null)
  }, [inspectorOpen, setBarRight])

  // Keep the newest message in view as it streams in.
  useEffect(() => {
    const el = threadRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  return (
    <>
      <div className={styles.main}>
        <ChatHeader />
        <div className={styles.thread} ref={threadRef}>
          {messages.length === 0 ? (
            <div className={styles.streamingNote}>
              Send a message to start · POST /v1/graph/stream
            </div>
          ) : (
            messages.map((msg) => <Message key={msg.id} msg={msg} />)
          )}

          {generating && (
            <div className={styles.streamingNote}>
              <span className={styles.sp} /> receiving stream · POST /v1/graph/stream
            </div>
          )}

          {error && (
            <div className={styles.streamingNote} style={{ color: "var(--danger, #e5484d)" }}>
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
