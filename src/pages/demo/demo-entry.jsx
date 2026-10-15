import { useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"

import { track } from "@/lib/analytics"
import { useConnection } from "@/lib/connection/connection-context"
import { resolveScenario } from "@/lib/demo/demo-mode"
import Placeholder from "@/pages/placeholder"

/**
 * /demo and /demo/:scenario: switch this tab into demo mode, then open Chat.
 */
const DemoEntry = () => {
  const { scenario } = useParams()
  const { startDemo, status, error } = useConnection()
  const navigate = useNavigate()

  useEffect(() => {
    track("demo_open", { scenario: resolveScenario(scenario) })
    const start = async () => {
      const result = await startDemo(scenario)
      if (result.ok) navigate("/chat", { replace: true })
    }
    start()
  }, [scenario, startDemo, navigate])

  if (status === "error") {
    return (
      <Placeholder name="10xGraph demo" note={`could not load: ${error}`} />
    )
  }
  return <Placeholder name="10xGraph demo" note="loading recorded runs" />
}

export default DemoEntry
