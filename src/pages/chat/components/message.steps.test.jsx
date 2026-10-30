import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import Message from "./message"

const base = { id: "a", role: "agent", who: "graph.react", streaming: false }

describe("Message steps", () => {
  it("folds earlier steps, expands on click, and shows the last text as the answer", async () => {
    render(
      <Message
        msg={{
          ...base,
          node: "REFLECT",
          blocks: [],
          answer: ["reflect 2"],
          steps: [
            { node: "PLAN", round: 1, text: "plan 1" },
            { node: "REFLECT", round: 1, text: "reflect 1" },
            { node: "PLAN", round: 2, text: "plan 2" },
            { node: "REFLECT", round: 2, text: "reflect 2" },
          ],
        }}
      />
    )
    expect(screen.getByRole("button", { name: "PLAN" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "REFLECT" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "PLAN · 2" })).toBeInTheDocument()
    expect(screen.getByText("reflect 2")).toBeInTheDocument()
    expect(screen.queryByText("plan 1")).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "PLAN" }))
    expect(screen.getByText("plan 1")).toBeInTheDocument()
  })

  it("shows the last non-internal step as the answer and folds internal ones", async () => {
    render(
      <Message
        msg={{
          ...base,
          node: "REFLECT",
          blocks: [],
          answer: ["Greeting handled."],
          steps: [
            { node: "PLAN", round: 1, text: "Which city?" },
            {
              node: "REFLECT",
              round: 1,
              text: "Greeting handled.",
              internal: true,
            },
          ],
        }}
      />
    )
    expect(screen.getByText("Which city?")).toBeInTheDocument()
    expect(screen.queryByText("Greeting handled.")).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "REFLECT" }))
    expect(screen.getByText("Greeting handled.")).toBeInTheDocument()
  })

  it("falls back to the last step when every step is internal", () => {
    render(
      <Message
        msg={{
          ...base,
          node: "REFLECT",
          blocks: [],
          answer: ["b"],
          steps: [
            { node: "PLAN", round: 1, text: "a", internal: true },
            { node: "REFLECT", round: 1, text: "b", internal: true },
          ],
        }}
      />
    )
    expect(screen.getByText("b")).toBeInTheDocument()
  })

  it("shows no step headers for a single-node run", () => {
    render(
      <Message
        msg={{
          ...base,
          node: "MAIN",
          blocks: [],
          answer: ["final"],
          steps: [
            { node: "MAIN", round: 1, text: "a" },
            { node: "TOOL", round: 1, text: "" },
            { node: "MAIN", round: 2, text: "final" },
          ],
        }}
      />
    )
    expect(screen.getByText("final")).toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
    expect(screen.queryByText("MAIN · 2")).not.toBeInTheDocument()
  })

  it("renders turns saved without steps", () => {
    render(
      <Message msg={{ ...base, node: "agent", blocks: [], answer: ["old"] }} />
    )
    expect(screen.getByText("old")).toBeInTheDocument()
  })
})
