import { Play } from "lucide-react"
import PropTypes from "prop-types"
import { useDispatch, useSelector } from "react-redux"

import { Button } from "@/components/ui/button"
import { track } from "@/lib/analytics"
import { getTenxGraphClient } from "@/lib/tenxgraph-client"
import { sendDemoRun } from "@/store/chat-thunks"

const INSTALL = "pip install 10xgraph 10xgraph-api"

const ROW = "mx-auto w-full max-w-190 px-6"

/**
 * Demo mode: one suggestion per recorded run that can play now. Re-reads the
 * client's available runs after every run, since playing one unlocks the next.
 */
const DemoPrompts = ({ enabled = true }) => {
  const dispatch = useDispatch()
  // Re-render when a run starts or ends, which is when availability changes.
  const generating = useSelector((s) => s.chat.generating)
  if (!enabled) return null
  const runs = getTenxGraphClient().availableRuns()

  const play = (run) => {
    track("demo_prompt", { run: run.id })
    dispatch(sendDemoRun(run))
  }

  if (runs.length === 0) {
    return (
      <p className={`${ROW} pt-2 text-xs text-muted-foreground`}>
        That is the whole recording. Run it on your own agent:{" "}
        <code className="font-mono text-foreground">{INSTALL}</code> then{" "}
        <code className="font-mono text-foreground">10xgraph play</code>
      </p>
    )
  }

  return (
    <div
      className={`${ROW} scroll-fade-x scrollbar-none flex gap-2 overflow-x-auto overscroll-x-contain pt-2`}
      aria-label="Suggested prompts"
    >
      {runs.map((run) => (
        <Button
          key={run.id}
          variant="outline"
          size="sm"
          className="shrink-0 rounded-full font-normal"
          onClick={() => play(run)}
          disabled={generating}
          title={run.prompt}
        >
          <Play className="size-3" />
          {run.label}
        </Button>
      ))}
    </div>
  )
}

DemoPrompts.propTypes = {
  enabled: PropTypes.bool,
}

export default DemoPrompts
