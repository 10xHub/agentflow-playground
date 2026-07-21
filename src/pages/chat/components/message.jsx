import PropTypes from "prop-types"

import styles from "../chat.module.css"

import ContentBlock from "./content-block"
import RichText from "./rich-text"

const usageShape = PropTypes.shape({
  prompt_tokens: PropTypes.number,
  completion_tokens: PropTypes.number,
  reasoning_tokens: PropTypes.number,
  total_tokens: PropTypes.number,
  calls: PropTypes.number,
})

const runMetaShape = PropTypes.shape({
  usage: usageShape,
  path: PropTypes.string,
  status: PropTypes.string,
})

/** Token / call / path footer under an agent turn. */
const RunMeta = ({ runMeta }) => (
  <div className={styles.runmeta}>
    {runMeta.usage ? (
      <span title="prompt in · completion out · reasoning">
        <b>tokens</b> {runMeta.usage.prompt_tokens} in ·{" "}
        {runMeta.usage.completion_tokens} out
        {runMeta.usage.reasoning_tokens
          ? ` · ${runMeta.usage.reasoning_tokens} reason`
          : ""}{" "}
        <span className={styles.tokTotal}>
          ({runMeta.usage.total_tokens} total)
        </span>
      </span>
    ) : null}
    {runMeta.usage?.calls ? (
      <span>
        <b>llm calls</b> {runMeta.usage.calls}
      </span>
    ) : null}
    <span>
      <b>path</b> {runMeta.path}
    </span>
    {runMeta.status ? (
      <span className={styles.ok}>{runMeta.status}</span>
    ) : null}
  </div>
)

RunMeta.propTypes = {
  runMeta: runMetaShape.isRequired,
}

/** A user turn: plain text, no blocks. */
const UserMessage = ({ msg }) => (
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

UserMessage.propTypes = {
  msg: PropTypes.shape({
    who: PropTypes.string,
    time: PropTypes.string,
    text: PropTypes.string,
  }).isRequired,
}

/** An agent turn: reasoning / tool blocks, the answer, then the run footer. */
const AgentMessage = ({ msg }) => (
  <div className={styles.msgWrap}>
    <div className={styles.msg}>
      <div className={`${styles.avatar} ${styles.agent}`}>AG</div>
      <div className={styles.msgBody}>
        <div className={styles.msgRole}>
          <span className={styles.who}>{msg.who}</span> · node{" "}
          <span className="mono">{msg.node}</span>
        </div>

        {msg.blocks?.map((block) => (
          <ContentBlock key={block._key} block={block} />
        ))}

        <div className={styles.prose} style={{ marginTop: 12 }}>
          <RichText
            text={msg.answer?.join("\n\n") || ""}
            streaming={msg.streaming}
          >
            {msg.streaming ? <span className={styles.caret} /> : null}
          </RichText>
        </div>

        {msg.runMeta ? <RunMeta runMeta={msg.runMeta} /> : null}
      </div>
    </div>
  </div>
)

AgentMessage.propTypes = {
  msg: PropTypes.shape({
    who: PropTypes.string,
    node: PropTypes.string,
    blocks: PropTypes.arrayOf(PropTypes.shape({ _key: PropTypes.string })),
    answer: PropTypes.arrayOf(PropTypes.string),
    streaming: PropTypes.bool,
    runMeta: runMetaShape,
  }).isRequired,
}

/**
 *
 */
const Message = ({ msg }) =>
  msg.role === "user" ? <UserMessage msg={msg} /> : <AgentMessage msg={msg} />

Message.propTypes = {
  msg: PropTypes.shape({
    role: PropTypes.string,
  }).isRequired,
}

export default Message
