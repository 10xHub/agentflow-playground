import { PauseCircle } from "lucide-react"
import PropTypes from "prop-types"
import { useState } from "react"
import { useDispatch, useSelector } from "react-redux"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  answerPlan,
  isStaticPause,
  parseResponse,
  previewValue,
} from "@/lib/interrupt"
import { resumeRun } from "@/store/chat-thunks"

const interruptShape = PropTypes.shape({
  id: PropTypes.string,
  kind: PropTypes.oneOf(["before", "after", "remote_tool"]),
  tool: PropTypes.string,
  node: PropTypes.string,
  message: PropTypes.string,
  value: PropTypes.any,
  response_schema: PropTypes.object,
})

const Respond = ({ busy, onSend }) => {
  const [text, setText] = useState("")
  return (
    <div className="flex flex-col gap-2">
      <Textarea
        aria-label="Response"
        placeholder="Your answer. JSON is sent as JSON, anything else as text."
        value={text}
        disabled={busy}
        onChange={(e) => setText(e.target.value)}
        className="min-h-14 font-mono text-xs"
      />
      <div>
        <Button
          size="sm"
          disabled={busy || parseResponse(text) === undefined}
          onClick={() => onSend(parseResponse(text))}
        >
          Respond
        </Button>
      </div>
    </div>
  )
}

Respond.propTypes = {
  busy: PropTypes.bool.isRequired,
  onSend: PropTypes.func.isRequired,
}

// What a pause that is not an interrupt() says, or null for an interrupt().
const pauseTitle = ({ kind, node, tool }) => {
  if (kind === "remote_tool") {
    return tool
      ? `Waiting for client tool ${tool}`
      : "Waiting for a client tool"
  }
  if (kind === "before" || kind === "after") {
    return `Paused ${kind} ${node || "a node"}`
  }
  return null
}

const PauseNote = ({ interrupt, actionable, busy, error = null, onResume }) => (
  <section
    aria-label="Paused"
    className="flex flex-col gap-3 rounded-xl border border-(--warn)/40 bg-card p-4"
  >
    <div className="flex items-center gap-2 text-sm font-medium">
      <PauseCircle className="size-4 text-(--warn)" />
      {pauseTitle(interrupt)}
    </div>
    {isStaticPause(interrupt) ? (
      actionable ? (
        <div>
          <Button size="sm" disabled={busy} onClick={() => onResume(true)}>
            Continue
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Continuing needs streaming mode. Switch the mode in the header, then
          reload this thread.
        </p>
      )
    ) : null}
    {error ? (
      <p role="alert" className="font-mono text-xs text-destructive">
        {error}
      </p>
    ) : null}
  </section>
)

PauseNote.propTypes = {
  interrupt: interruptShape.isRequired,
  actionable: PropTypes.bool.isRequired,
  busy: PropTypes.bool.isRequired,
  error: PropTypes.string,
  onResume: PropTypes.func.isRequired,
}

/**
 * A run paused on interrupt(). In stream mode the reader can approve, reject
 * (resume with null) or respond; in invoke mode it is shown read-only.
 */
export const InterruptCard = ({
  interrupt,
  actionable,
  busy = false,
  error = null,
  onResume,
}) => {
  const plan = answerPlan(interrupt)
  const shown = previewValue(interrupt.value)

  if (pauseTitle(interrupt)) {
    return (
      <PauseNote
        interrupt={interrupt}
        actionable={actionable}
        busy={busy}
        error={error}
        onResume={onResume}
      />
    )
  }

  return (
    <section
      aria-label="Needs input"
      className="flex flex-col gap-3 rounded-xl border border-(--warn)/40 bg-card p-4"
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <PauseCircle className="size-4 text-(--warn)" />
        Needs input
        {interrupt.node ? (
          <span className="font-mono text-xs font-normal text-muted-foreground">
            {interrupt.node}
          </span>
        ) : null}
      </div>
      {interrupt.message ? (
        <p className="text-sm">{interrupt.message}</p>
      ) : null}
      {shown ? (
        <pre className="max-h-48 overflow-auto rounded-md bg-muted p-2 font-mono text-xs whitespace-pre-wrap">
          {shown}
        </pre>
      ) : null}

      {actionable ? (
        <>
          {plan.kind === "approve" ? (
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={busy}
                onClick={() => onResume(plan.value)}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => onResume(null)}
              >
                Reject
              </Button>
            </div>
          ) : (
            <>
              <Respond busy={busy} onSend={onResume} />
              <div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => onResume(null)}
                >
                  Reject
                </Button>
              </div>
            </>
          )}
        </>
      ) : (
        <p className="text-xs text-muted-foreground">
          Approving or rejecting needs streaming mode. Switch the mode in the
          header, then reload this thread.
        </p>
      )}

      {error ? (
        <p role="alert" className="font-mono text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  )
}

InterruptCard.propTypes = {
  interrupt: interruptShape.isRequired,
  actionable: PropTypes.bool.isRequired,
  busy: PropTypes.bool,
  error: PropTypes.string,
  onResume: PropTypes.func.isRequired,
}

/** The card for the store's pending interrupt, or nothing. */
const PendingInterrupt = () => {
  const dispatch = useDispatch()
  const pending = useSelector((s) => s.chat.pendingInterrupt)
  const mode = useSelector((s) => s.chat.mode)
  if (!pending) return null
  return (
    <InterruptCard
      interrupt={pending.interrupt}
      actionable={mode === "stream"}
      busy={pending.busy}
      error={pending.error}
      onResume={(value) => dispatch(resumeRun(value))}
    />
  )
}

export default PendingInterrupt
