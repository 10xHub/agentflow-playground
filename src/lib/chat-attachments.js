import { Message } from "10xgraph-client"

// Build the user message for a send that carries uploaded files. Each attachment is a
// media block that points at the server copy by file_id (no bytes in the message).
// Message.withFile picks image, audio, video or document by MIME type.
const mediaBlock = ({ file_id: fileId, mime_type: mime }) =>
  Message.withFile("", fileId, mime).content[1]

/**
 * @param {string} text - the typed text, may be empty
 * @param {Array<{file_id: string, mime_type?: string}>} attachments - uploaded files
 * @returns {object} a user Message with a text block (when text is set) and media blocks
 */
export const buildAttachmentMessage = (text, attachments) => {
  const blocks = attachments.map(mediaBlock)
  if (text) blocks.unshift(Message.text_message(text, "user").content[0])
  return Message.multimodal(blocks, "user")
}
