import { PanelRight } from "lucide-react"
import { useEffect, useState } from "react"

import { BarButton } from "@/components/shell/ConnectionBar"
import { useConnectionBarSlot } from "@/components/shell/AppShell"

import ChatHeader from "./components/ChatHeader"
import Composer from "./components/Composer"
import Inspector from "./components/Inspector"
import Message from "./components/Message"
import { CONVERSATION } from "./data"
import styles from "./chat.module.css"

export default function ChatPage() {
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const { setBarRight } = useConnectionBarSlot()

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

  return (
    <>
      <div className={styles.main}>
        <ChatHeader />
        <div className={styles.thread}>
          {CONVERSATION.map((msg) => (
            <Message key={msg.id} msg={msg} />
          ))}
          <div className={styles.streamingNote}>
            <span className={styles.sp} /> receiving stream · POST /v1/graph/stream
          </div>
        </div>
        <Composer />
      </div>

      {inspectorOpen && <Inspector onClose={() => setInspectorOpen(false)} />}
    </>
  )
}
