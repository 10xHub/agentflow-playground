import { describe, expect, it } from "vitest"

import { buildAttachmentMessage } from "./chat-attachments"

const img = { file_id: "f1", mime_type: "image/png", filename: "a.png" }
const pdf = { file_id: "f2", mime_type: "application/pdf", filename: "b.pdf" }

describe("buildAttachmentMessage", () => {
  it("puts text first and an image block with a file_id reference", () => {
    const m = buildAttachmentMessage("look", [img])
    expect(m.role).toBe("user")
    expect(m.content[0]).toMatchObject({ type: "text", text: "look" })
    expect(m.content[1]).toMatchObject({
      type: "image",
      media: { kind: "file_id", file_id: "f1", mime_type: "image/png" },
    })
  })

  it("adds one block per attachment, documents as document blocks", () => {
    const m = buildAttachmentMessage("both", [img, pdf])
    expect(m.content.map((b) => b.type)).toEqual(["text", "image", "document"])
    expect(m.content[2].media.file_id).toBe("f2")
  })

  it("omits the text block when there is no text", () => {
    const m = buildAttachmentMessage("", [pdf])
    expect(m.content.map((b) => b.type)).toEqual(["document"])
  })
})
