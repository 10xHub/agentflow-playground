import { Paperclip, SendHorizontal } from "lucide-react"

import styles from "../chat.module.css"

export default function Composer() {
  return (
    <div className={styles.composerWrap}>
      <div className={styles.composer}>
        <textarea rows={1} placeholder="Message the agent…  (⌘↵ to send)" />
        <div className={styles.composerFoot}>
          <button className={styles.attach} type="button" title="Attach file">
            <Paperclip size={17} />
          </button>
          <span className={styles.composerHint}>initial_state · config overrides</span>
          <button className={styles.send} type="button">
            Send
            <SendHorizontal size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
