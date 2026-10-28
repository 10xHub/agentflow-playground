import PropTypes from "prop-types"

import { Bubble, BubbleContent } from "@/components/ui/bubble"
import {
  Message as MessageRoot,
  MessageContent,
  MessageFooter,
  MessageHeader,
} from "@/components/ui/message"
import { formatBytes } from "@/lib/files/preview-kind"
import { cn } from "@/lib/utils"

import styles from "../chat.module.css"

import AgentSteps from "./agent-steps"
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

const WARN_TONE = "text-(--warn)"

const STATUS_TONE = {
  done: "text-(--ok)",
  stopped: WARN_TONE,
  interrupted: WARN_TONE,
  error: "text-destructive",
}

// Raw run statuses that read better as words.
const STATUS_LABEL = { interrupted: "needs input" }

/** Token / call / path footer under an agent turn. */
const RunMeta = ({ runMeta }) => {
  const { usage, path, status } = runMeta
  return (
    <MessageFooter className="flex-wrap gap-x-3 gap-y-1 px-0 font-mono text-[10.5px] font-normal">
      {usage ? (
        <span title="prompt in · completion out · reasoning">
          {usage.prompt_tokens} in · {usage.completion_tokens} out
          {usage.reasoning_tokens
            ? ` · ${usage.reasoning_tokens} reason`
            : ""}{" "}
          <span className="opacity-70">({usage.total_tokens} tokens)</span>
        </span>
      ) : null}
      {usage?.calls ? <span>{usage.calls} llm calls</span> : null}
      {path ? <span>{path}</span> : null}
      {status ? (
        <span className={STATUS_TONE[status] ?? ""}>
          {STATUS_LABEL[status] ?? status}
        </span>
      ) : null}
    </MessageFooter>
  )
}

RunMeta.propTypes = {
  runMeta: runMetaShape.isRequired,
}

/** A user turn: a right-aligned bubble. */
const UserMessage = ({ msg }) => (
  <MessageRoot align="end">
    <MessageContent>
      <Bubble align="end" variant="muted">
        <BubbleContent className="whitespace-pre-wrap">
          {msg.text}
        </BubbleContent>
        {msg.attachments?.length ? (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {msg.attachments.map((a) => (
              <span
                key={a.file_id}
                className="rounded-md border border-border px-2 py-0.5 font-mono text-[11px]"
              >
                {a.filename || a.file_id}
                {a.size_bytes ? ` · ${formatBytes(a.size_bytes)}` : ""}
              </span>
            ))}
          </div>
        ) : null}
      </Bubble>
      {msg.time ? (
        <MessageFooter className="font-normal opacity-0 transition-opacity group-hover/message:opacity-100">
          {msg.time}
        </MessageFooter>
      ) : null}
    </MessageContent>
  </MessageRoot>
)

UserMessage.propTypes = {
  msg: PropTypes.shape({
    time: PropTypes.string,
    text: PropTypes.string,
    attachments: PropTypes.arrayOf(
      PropTypes.shape({
        file_id: PropTypes.string,
        filename: PropTypes.string,
        size_bytes: PropTypes.number,
      })
    ),
  }).isRequired,
}

/** An agent turn: the node, reasoning and tool steps, the answer, the run footer. */
const AgentMessage = ({ msg }) => {
  const text = msg.answer?.join("\n\n") || ""
  return (
    <MessageRoot>
      <MessageContent className="gap-3">
        <MessageHeader className="gap-1.5 px-0 font-normal">
          <span className="text-foreground/80">{msg.who}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono">{msg.node}</span>
        </MessageHeader>

        <AgentSteps
          blocks={msg.blocks}
          streaming={msg.streaming}
          answering={text.length > 0}
        />

        {text || msg.streaming ? (
          <div className={cn(styles.prose, "min-w-0")}>
            <RichText text={text} streaming={msg.streaming}>
              {msg.streaming ? <span className={styles.caret} /> : null}
            </RichText>
          </div>
        ) : null}

        {msg.runMeta ? <RunMeta runMeta={msg.runMeta} /> : null}
      </MessageContent>
    </MessageRoot>
  )
}

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
