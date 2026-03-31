import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import ReFlowComponent from "./react-flow-component"

describe("ReFlowComponent", () => {
  it("renders graph nodes without relying on the old graph library", () => {
    render(
      <ReFlowComponent
        graphData={{
          nodes: [
            { id: "start-id", name: "__start__" },
            { id: "worker-id", name: "Worker" },
            { id: "end-id", name: "__end__" },
          ],
          edges: [
            { id: "edge-1", source: "__start__", target: "Worker" },
            { id: "edge-2", source: "Worker", target: "__end__" },
          ],
        }}
      />
    )

    expect(screen.getByLabelText("Network graph")).toBeInTheDocument()
    expect(screen.getAllByText("Start").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Worker").length).toBeGreaterThan(0)
    expect(screen.getAllByText("End").length).toBeGreaterThan(0)
  })

  it("shows an empty state when no nodes are available", () => {
    render(
      <ReFlowComponent
        graphData={{
          nodes: [],
          edges: [],
        }}
      />
    )

    expect(screen.getByText("No graph data available yet.")).toBeInTheDocument()
  })
})