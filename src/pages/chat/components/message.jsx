import styles from "../chat.module.css"

import ContentBlock from "./ContentBlock"
import RichText from "./RichText"

/**
 *
 */
export default function Message({ msg }) {
  if (msg.role === "user") {
    return (
      <div className={styles.msgWrap}>
        <div className={styles.msg}>
          <div className={`${styles.avatar} ${styles.user}`}>YOU</div>
          <div className={styles.msgBody}>
            <div className={styles.msgRole}>
              <span className={styles.who}>{msg.who}</span> · {msg.time}
            </div>
            <div className={styles.prose}>
              <p>{msg.text}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const rm = msg.runMeta
  return (
    <div className={styles.msgWrap}>
      <div className={styles.msg}>
        <div className={`${styles.avatar} ${styles.agent}`}>AG</div>
        <div className={styles.msgBody}>
          <div className={styles.msgRole}>
            <span className={styles.who}>{msg.who}</span> · node{" "}
            <span className="mono">{msg.node}</span>
          </div>

          {msg.blocks?.map((block, index) => (
            <ContentBlock key={index} block={block} />
          ))}

          <div className={styles.prose} style={{ marginTop: 12 }}>
            <RichText
              text={msg.answer?.join("\n\n") || ""}
              streaming={msg.streaming}
            >
              {msg.streaming ? <span className={styles.caret} /> : null}
            </RichText>
          </div>

          {rm ? (
            <div className={styles.runmeta}>
              {rm.usage ? (
                <span title="prompt in · completion out · reasoning">
                  <b>tokens</b> {rm.usage.prompt_tokens} in ·{" "}
                  {rm.usage.completion_tokens} out
                  {rm.usage.reasoning_tokens
                    ? ` · ${rm.usage.reasoning_tokens} reason`
                    : ""}{" "}
                  <span className={styles.tokTotal}>
                    ({rm.usage.total_tokens} total)
                  </span>
                </span>
              ) : null}
              {rm.usage?.calls ? (
                <span>
                  <b>llm calls</b> {rm.usage.calls}
                </span>
              ) : null}
              <span>
                <b>path</b> {rm.path}
              </span>
              {rm.status ? (
                <span className={styles.ok}>{rm.status}</span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
