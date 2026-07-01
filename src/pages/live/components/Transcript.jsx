import { TRANSCRIPT } from "../data"
import styles from "../live.module.css"

function Turn({ turn }) {
  const isYou = turn.role === "you"
  return (
    <div className={styles.tInner}>
      <div className={styles.turn}>
        <div className={`${styles.tAv} ${isYou ? styles.you : styles.agent}`}>
          {isYou ? "YOU" : "AG"}
        </div>
        <div className={styles.tBody}>
          <div className={styles.tRole}>
            <span className={styles.who}>{turn.who}</span>
            <span className={styles.transtag}>{turn.tag}</span> · {turn.time}
          </div>
          <div className={`${styles.tText} ${turn.partial ? styles.partial : ""}`}>{turn.text}</div>

          {turn.tools?.map((tool, i) => (
            <div className={styles.toolInline} key={i}>
              <span className={styles.tt}>tool_call</span>
              <span className={`${styles.name} mono`}>{tool.name}</span>
              <span className={styles.ok}>{tool.result}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Rolling transcript: input/output transcript turns, inline tool_call chips,
 *  and the "you interrupted" divider. */
export default function Transcript() {
  return (
    <div className={styles.transcript}>
      {TRANSCRIPT.map((item) =>
        item.kind === "interrupt" ? (
          <div className={styles.interrupt} key={item.id}>
            {item.label} · {item.time}
          </div>
        ) : (
          <Turn key={item.id} turn={item} />
        )
      )}
    </div>
  )
}
