// src/setupTests.js

import "@testing-library/jest-dom/vitest"
import { vi } from "vitest"

// Mock reaflow Canvas – it relies on DOM resize observers (react-cool-dimensions)
// that are not available in the happy-dom test environment.
vi.mock("reaflow", () => {
  const React = require("react")

  const Canvas = ({ node, nodes = [], onCanvasClick }) =>
    React.createElement(
      "svg",
      { "aria-label": "reaflow-canvas", onClick: onCanvasClick },
      nodes.map((n) => {
        if (!node) {
          return React.createElement(
            "g",
            { key: n.id, "data-node-id": n.id },
            React.createElement("text", null, n.text)
          )
        }

        const nodeProps = {
          id: n.id,
          node: n,
          properties: n,
          width: n.width,
          height: n.height,
          x: 0,
          y: 0,
        }

        return typeof node === "function"
          ? React.cloneElement(node(nodeProps), { key: n.id })
          : React.cloneElement(node, { ...nodeProps, key: n.id })
      })
    )

  const Node = ({ children, node, onClick }) => {
    const content =
      typeof children === "function"
        ? children({
            node,
            width: node?.width,
            height: node?.height,
            x: 0,
            y: 0,
          })
        : children

    return React.createElement(
      "g",
      {
        "data-node-id": node?.id,
        onClick: (event) => onClick?.(event, node),
      },
      content
    )
  }

  const Edge = () => React.createElement("line", null)

  return { Canvas, Node, Edge }
})

// Optional: Suppress act() warnings or other noisy console errors in tests
const suppressedErrors = [/Warning.*not wrapped in act/, /DeprecationWarning/]
const originalError = console.error
console.error = (...arguments_) => {
  if (suppressedErrors.some((pattern) => pattern.test(arguments_[0]))) return
  originalError(...arguments_)
}
