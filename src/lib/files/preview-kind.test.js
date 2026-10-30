import { describe, expect, it } from "vitest"

import { formatBytes, previewKind } from "./preview-kind"

describe("previewKind", () => {
  it.each([
    ["image/png", "image"],
    ["audio/mpeg", "audio"],
    ["video/mp4", "video"],
    ["application/pdf", "pdf"],
    ["text/plain", "text"],
    ["text/csv", "text"],
    ["application/json", "text"],
    ["application/zip", "none"],
    [undefined, "none"],
  ])("%s -> %s", (mime, kind) => {
    expect(previewKind(mime)).toBe(kind)
  })
})

describe("formatBytes", () => {
  it("formats sizes", () => {
    expect(formatBytes(512)).toBe("512 B")
    expect(formatBytes(2048)).toBe("2.0 KB")
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB")
    expect(formatBytes(undefined)).toBe("-")
  })
})
