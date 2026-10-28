import { Brain, LoaderCircle, TriangleAlert, Wrench } from "lucide-react"
import PropTypes from "prop-types"
import { useState } from "react"

import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceDescription,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@/components/ui/trace"
import { formatJson } from "@/lib/rich-text"

import styles from "../chat.module.css"

import CodeBlock from "./code-block"
import RichText from "./rich-text"

// Threads cached before blocks carried a callId still have it in their key:
// "tool_call:<id>" / "tool_result:<call_id>".
const callIdOf = (block) =>
  block.callId ?? block._key?.slice(block._key.indexOf(":") + 1)

/**
 * Agent blocks as Trace steps, in stream order: reasoning on its own, each tool
 * call with the result that answers it (matched by call id), and any result
 * whose call is not in this turn as a step of its own.
 */
export const groupSteps = (blocks = []) => {
  const calls = new Set(
    blocks.filter((b) => b.kind === "tool_call").map(callIdOf)
  )
  const results = new Map(
    blocks
      .filter((b) => b.kind === "tool_result" && calls.has(callIdOf(b)))
      .map((b) => [callIdOf(b), b])
  )
  return blocks.flatMap((block) => {
    if (block.kind === "reasoning") return [{ kind: "reasoning", block }]
    if (block.kind === "tool_call") {
      return [
        { kind: "tool", call: block, result: results.get(callIdOf(block)) },
      ]
    }
    if (block.kind === "tool_result" && !calls.has(callIdOf(block))) {
      return [{ kind: "tool", call: null, result: block }]
    }
    return []
  })
}

// One line of the arguments, for the collapsed row.
const argsPreview = (code) => {
  try {
    const args = JSON.parse(code || "{}")
    const text = Object.entries(args)
      .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
      .join(", ")
    return text.length > 60 ? `${text.slice(0, 59)}…` : text
  } catch {
    return ""
  }
}

/** Tool arguments or output: highlighted JSON when it parses, text otherwise. */
const Payload = ({ title, code = "" }) => {
  const json = formatJson(code)
  return (
    <CodeBlock
      size="sm"
      wrap
      lang={json ? "json" : "text"}
      title={title}
      code={json ?? code}
    />
  )
}

Payload.propTypes = {
  title: PropTypes.string.isRequired,
  code: PropTypes.string,
}

const toolState = (result, streaming, remote = false) => {
  if (result?.isError) return { status: "error", verb: "Failed to run" }
  if (result) return { status: null, verb: "Ran" }
  if (streaming) return { status: "running", verb: "Running" }
  // The browser runs these itself and the result is not streamed back.
  if (remote) return { status: null, verb: "Ran" }
  // No result in this turn (stopped, or the server did not send one).
  return { status: null, verb: "Called" }
}

const toolName = (call, result) => call?.name ?? result?.name ?? "tool"

const TOOL_ICON = {
  error: <TriangleAlert />,
  running: <LoaderCircle className="animate-spin" />,
}

/** The collapsed row: "Ran lookup_order  order_id: \"1043\"". */
const ToolLine = ({
  status = null,
  verb,
  name,
  args = null,
  remote = false,
}) => (
  <TraceLine status={status}>
    <TraceIcon>{TOOL_ICON[status] ?? <Wrench />}</TraceIcon>
    <TraceTitle>
      {verb} <span className="font-mono">{name}</span>
    </TraceTitle>
    {remote ? (
      <TraceDescription className="text-xs">in your browser</TraceDescription>
    ) : null}
    {args ? (
      <TraceDescription className="hidden font-mono text-xs sm:inline">
        {argsPreview(args)}
      </TraceDescription>
    ) : null}
  </TraceLine>
)

ToolLine.propTypes = {
  status: PropTypes.string,
  verb: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  args: PropTypes.string,
  remote: PropTypes.bool,
}

/** A tool call and the result that answers it, folded into one step. */
export const ToolStep = ({ call = null, result = null, streaming = false }) => {
  const { status, verb } = toolState(result, streaming, call?.remote)

  return (
    <TraceCollapsible>
      <TraceCollapsibleTrigger>
        <ToolLine
          status={status}
          verb={verb}
          name={toolName(call, result)}
          args={call?.code}
          remote={Boolean(call?.remote)}
        />
      </TraceCollapsibleTrigger>
      <TraceCollapsibleContent className="flex flex-col gap-2">
        {call ? <Payload title="arguments" code={call.code} /> : null}
        {result ? <ResultPayload result={result} /> : null}
      </TraceCollapsibleContent>
    </TraceCollapsible>
  )
}

const ResultPayload = ({ result }) => (
  <Payload title={result.isError ? "error" : "result"} code={result.code} />
)

ResultPayload.propTypes = {
  result: PropTypes.shape({ isError: PropTypes.bool, code: PropTypes.string })
    .isRequired,
}

const blockShape = PropTypes.shape({
  _key: PropTypes.string,
  kind: PropTypes.string,
  callId: PropTypes.string,
  name: PropTypes.string,
  code: PropTypes.string,
  text: PropTypes.string,
  isError: PropTypes.bool,
  remote: PropTypes.bool,
})

ToolStep.propTypes = {
  call: blockShape,
  result: blockShape,
  streaming: PropTypes.bool,
}

/** Model reasoning: open while it streams, folded to "Thought" once done. */
export const ReasoningStep = ({ text = "", running = false }) => {
  // Undefined until the reader toggles it, so it follows `running` until then.
  const [open, setOpen] = useState()

  return (
    <TraceCollapsible open={open ?? running} onOpenChange={setOpen}>
      <TraceCollapsibleTrigger>
        <TraceLine status={running ? "running" : undefined}>
          <TraceIcon>
            {running ? <LoaderCircle className="animate-spin" /> : <Brain />}
          </TraceIcon>
          <TraceTitle>{running ? "Thinking" : "Thought"}</TraceTitle>
        </TraceLine>
      </TraceCollapsibleTrigger>
      <TraceCollapsibleContent className={styles.prose}>
        <RichText text={text} />
      </TraceCollapsibleContent>
    </TraceCollapsible>
  )
}

ReasoningStep.propTypes = {
  text: PropTypes.string,
  running: PropTypes.bool,
}

/**
 * The steps of an agent turn. While the turn streams, the last step is the live
 * one: reasoning shows "Thinking" until the answer starts.
 */
const AgentSteps = ({ blocks = [], streaming = false, answering = false }) => {
  const steps = groupSteps(blocks)
  if (steps.length === 0) return null

  return (
    <Trace>
      {steps.map((step, index) => {
        const live = streaming && index === steps.length - 1
        if (step.kind === "reasoning") {
          return (
            <ReasoningStep
              key={step.block._key}
              text={step.block.text}
              running={live && !answering}
            />
          )
        }
        return (
          <ToolStep
            key={(step.call ?? step.result)._key}
            call={step.call}
            result={step.result}
            streaming={streaming}
          />
        )
      })}
    </Trace>
  )
}

AgentSteps.propTypes = {
  blocks: PropTypes.arrayOf(blockShape),
  streaming: PropTypes.bool,
  answering: PropTypes.bool,
}

export default AgentSteps
