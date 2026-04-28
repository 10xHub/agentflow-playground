import { fireEvent, render, screen } from "@testing-library/react"
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

  it("renders cyclic tool flows without dropping the return edge", () => {
    const { container } = render(
      <ReFlowComponent
        graphData={{
          nodes: [
            { id: "start-id", name: "__start__" },
            { id: "main-id", name: "MAIN" },
            { id: "tool-id", name: "TOOL" },
            { id: "end-id", name: "__end__" },
          ],
          edges: [
            { id: "edge-1", source: "__start__", target: "MAIN" },
            { id: "edge-2", source: "MAIN", target: "TOOL" },
            { id: "edge-3", source: "TOOL", target: "MAIN" },
            { id: "edge-4", source: "MAIN", target: "__end__" },
          ],
        }}
      />
    )

    expect(screen.getAllByText("MAIN").length).toBeGreaterThan(0)
    expect(screen.getAllByText("TOOL").length).toBeGreaterThan(0)
    expect(screen.getByLabelText("Open details for TOOL")).toBeInTheDocument()
  })

  it("shows node details in the right sidebar when a node is clicked", () => {
    render(
      <ReFlowComponent
        graphData={{
          nodes: [
            { id: "main-id", name: "MAIN", mode: "agent" },
            { id: "tool-id", name: "TOOL", action: "search" },
          ],
          edges: [{ id: "edge-1", source: "MAIN", target: "TOOL" }],
        }}
      />
    )

    fireEvent.click(
      screen.getByRole("button", { name: "Open details for MAIN" })
    )

    expect(screen.getByLabelText("Graph sidebar")).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Node Details" })
    ).toBeInTheDocument()
    expect(
      screen.getByText("Inspect the selected node and its graph connections.")
    ).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "MAIN" })).toBeInTheDocument()
    expect(screen.getAllByText("Agent node").length).toBeGreaterThan(0)
    expect(screen.getAllByText("TOOL").length).toBeGreaterThan(0)
  })
})
