import { describe, expect, it } from "vitest"

import { detectFormat, formatJson, isPreviewableLang } from "./rich-text"

describe("detectFormat", () => {
  it("treats plain prose and markdown as markdown", () => {
    expect(detectFormat("hello **world**")).toBe("markdown")
    expect(detectFormat("| a | b |\n| - | - |")).toBe("markdown")
    expect(detectFormat("")).toBe("markdown")
    expect(detectFormat(null)).toBe("markdown")
  })

  it("treats a full document as html", () => {
    expect(detectFormat("<!doctype html><html><body>hi</body></html>")).toBe("html")
    expect(detectFormat("<html><body>hi</body></html>")).toBe("html")
  })

  it("treats a structural fragment as html", () => {
    expect(detectFormat("<div class='a'><h1>Hi</h1></div>")).toBe("html")
    expect(detectFormat("<section><ul><li>x</li></ul></section>")).toBe("html")
  })

  it("keeps prose that merely mentions tags as markdown", () => {
    expect(detectFormat("Use a <div> to wrap it, then add <section>.")).toBe("markdown")
    expect(detectFormat("Here is the page:\n\n```html\n<div><h1>x</h1></div>\n```")).toBe(
      "markdown"
    )
  })

  it("does not promote a single lone tag", () => {
    expect(detectFormat("<div>hello</div>")).toBe("markdown")
  })
})

describe("formatJson", () => {
  it("pretty-prints valid json objects and arrays", () => {
    expect(formatJson('{"a":1}')).toBe('{\n  "a": 1\n}')
    expect(formatJson("[1,2]")).toBe("[\n  1,\n  2\n]")
  })

  it("returns null for non-json", () => {
    expect(formatJson("not json")).toBeNull()
    expect(formatJson("{broken")).toBeNull()
    expect(formatJson("")).toBeNull()
  })
})

describe("isPreviewableLang", () => {
  it("only previews markup languages", () => {
    expect(isPreviewableLang("html")).toBe(true)
    expect(isPreviewableLang("svg")).toBe(true)
    expect(isPreviewableLang("python")).toBe(false)
    expect(isPreviewableLang(undefined)).toBe(false)
  })
})
