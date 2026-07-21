import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import RichText from "./RichText"

describe("RichText", () => {
  it("renders markdown structure", () => {
    const { container } = render(
      <RichText text={"# Title\n\n- one\n- two\n\n**bold** and `code`"} />
    )
    expect(container.querySelector("h1")).toHaveTextContent("Title")
    expect(container.querySelectorAll("li")).toHaveLength(2)
    expect(container.querySelector("strong")).toHaveTextContent("bold")
    expect(container.querySelector("code")).toHaveTextContent("code")
  })

  it("renders gfm tables", () => {
    const { container } = render(<RichText text={"| a | b |\n| - | - |\n| 1 | 2 |"} />)
    expect(container.querySelector("table")).toBeTruthy()
    expect(container.querySelectorAll("td")).toHaveLength(2)
  })

  it("previews an html document in a sandboxed frame", () => {
    const { container } = render(<RichText text="<!doctype html><html><body>hi</body></html>" />)
    const frame = container.querySelector("iframe")
    expect(frame).toBeTruthy()
    expect(frame.getAttribute("sandbox")).toBe("allow-scripts")
    expect(frame.getAttribute("sandbox")).not.toContain("allow-same-origin")
  })

  it("falls back to source via the toggle", async () => {
    const html = "<div><h1>Hi</h1></div>"
    const { container } = render(<RichText text={html} />)
    expect(container.querySelector("iframe")).toBeTruthy()
    await userEvent.click(screen.getByTitle("Show source"))
    expect(container.querySelector("iframe")).toBeNull()
    expect(container.querySelector("pre")).toHaveTextContent("<h1>Hi</h1>")
  })

  it("stays on markdown while streaming", () => {
    const { container } = render(
      <RichText text="<div><h1>Hi</h1></div>" streaming>
        <span data-testid="caret" />
      </RichText>
    )
    expect(container.querySelector("iframe")).toBeNull()
    expect(screen.getByTestId("caret")).toBeTruthy()
  })

  it("auto-previews an html fence but not a python one", () => {
    const { container: html } = render(
      <RichText text={"```html\n<div><h1>x</h1></div>\n```"} />
    )
    expect(html.querySelector("iframe")).toBeTruthy()

    const { container: py } = render(<RichText text={"```python\nprint(1)\n```"} />)
    expect(py.querySelector("iframe")).toBeNull()
    expect(py.textContent).toContain("print(1)")
  })

  it("strips script tags from the inline markdown path", () => {
    const { container } = render(
      <RichText text={"hello <script>window.__pwned = 1</script> world"} />
    )
    expect(container.querySelector("script")).toBeNull()
  })
})
