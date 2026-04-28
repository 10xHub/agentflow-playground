/* eslint-disable unicorn/filename-case, complexity */

const MESSAGE_LABEL = "Message"
const TOOL_CALL_LABEL = "Tool Call"
const TOOL_RESULT_LABEL = "Tool Result"
const UNKNOWN_TOOL_LABEL = "Unknown tool"

const safeStringify = (value) => {
  if (value == null) {
    return ""
  }

  if (typeof value === "string") {
    return value
  }

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

const parseToolArguments = (value) => {
  if (typeof value !== "string") {
    return value
  }

  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

const getToolCallEntry = (toolCalls) =>
  Array.isArray(toolCalls) && toolCalls.length > 0 ? toolCalls[0] : null

const getToolName = (block, metadata = {}, toolCalls = null) => {
  const firstToolCall = getToolCallEntry(toolCalls)

  return (
    block?.name ||
    metadata?.function_name ||
    firstToolCall?.function?.name ||
    metadata?.tool_name ||
    UNKNOWN_TOOL_LABEL
  )
}

const getToolArguments = (block, metadata = {}, toolCalls = null) => {
  const firstToolCall = getToolCallEntry(toolCalls)

  return (
    block?.args ??
    metadata?.function_argument ??
    parseToolArguments(firstToolCall?.function?.arguments)
  )
}

const getToolOutput = (block) => block?.output ?? block?.result ?? block

const formatInlineToolName = (toolName) => `\`${toolName}\``

const formatNamedSection = (title, body) => {
  const normalizedBody = safeStringify(body).trim()

  if (!normalizedBody) {
    return ""
  }

  return `**${title}**\n\n${normalizedBody}`
}

const formatToolCall = (block, options = {}) => {
  const toolName = getToolName(block, options.metadata, options.toolCalls)

  if (!options.showToolDetails) {
    return formatNamedSection(TOOL_CALL_LABEL, formatInlineToolName(toolName))
  }

  const formattedArguments = safeStringify(
    getToolArguments(block, options.metadata, options.toolCalls)
  ).trim()

  if (!formattedArguments) {
    return formatNamedSection(TOOL_CALL_LABEL, formatInlineToolName(toolName))
  }

  return `**${TOOL_CALL_LABEL}**\n\n${formatInlineToolName(toolName)}\n\n\`\`\`json\n${formattedArguments}\n\`\`\``
}

const formatToolResult = (block, options = {}) => {
  const toolName = getToolName(block, options.metadata, options.toolCalls)

  if (!options.showToolDetails) {
    return formatNamedSection(TOOL_RESULT_LABEL, formatInlineToolName(toolName))
  }

  const output = safeStringify(getToolOutput(block)).trim()

  if (!output) {
    return formatNamedSection(TOOL_RESULT_LABEL, formatInlineToolName(toolName))
  }

  return `**${TOOL_RESULT_LABEL}**\n\n${formatInlineToolName(toolName)}\n\n\`\`\`json\n${output}\n\`\`\``
}

const formatImageBlock = (block) => {
  const media = block.media || {}
  if (media.kind === "data" && media.data_base64) {
    const mime = media.mime_type || "image/png"
    return `![image](data:${mime};base64,${media.data_base64})`
  }
  if (media.kind === "url" && media.url) {
    return `![image](${media.url})`
  }
  if (media.kind === "file_id" && media.file_id) {
    return `[image: ${media.file_id}]`
  }
  return formatNamedSection("Image", safeStringify(media))
}

const formatAudioBlock = (block) => {
  const media = block.media || {}
  const transcript = block.transcript || media.transcript
  const desc = transcript ? ` — "${transcript}"` : ""
  if (media.kind === "file_id" && media.file_id) {
    return `[audio: ${media.file_id}${desc}]`
  }
  return formatNamedSection("Audio", transcript || safeStringify(media))
}

const formatVideoBlock = (block) => {
  const media = block.media || {}
  if (media.kind === "file_id" && media.file_id) {
    return `[video: ${media.file_id}]`
  }
  return formatNamedSection("Video", safeStringify(media))
}

const formatDocumentBlock = (block) => {
  const media = block.media || {}
  if (block.text) {
    return block.text
  }
  if (media.kind === "file_id" && media.file_id) {
    return `[document: ${media.file_id}]`
  }
  return formatNamedSection("Document", safeStringify(media))
}

const formatReasoningBlock = (block, options, index) => {
  const reasoningText =
    index === 0 && options.reasoning
      ? options.reasoning
      : block.summary || block.details
  return formatNamedSection("Reasoning", reasoningText)
}

const formatContentBlock = (block, options = {}, index = 0) => {
  if (!block || typeof block !== "object") {
    return safeStringify(block).trim()
  }

  switch (block.type) {
    case "text":
      return safeStringify(block.text).trim()
    case "reasoning":
      return formatReasoningBlock(block, options, index)
    case "tool_call":
      return formatToolCall(block, options)
    case "tool_result":
      return formatToolResult(block, options)
    case "image":
      return formatImageBlock(block)
    case "audio":
      return formatAudioBlock(block)
    case "video":
      return formatVideoBlock(block)
    case "document":
      return formatDocumentBlock(block)
    case "data":
      return formatNamedSection("Data", safeStringify(block.data || block))
    default:
      return formatNamedSection(MESSAGE_LABEL, safeStringify(block))
  }
}

export const buildMessageText = (content, options = {}) => {
  if (typeof content === "string") {
    return content
  }

  if (!Array.isArray(content)) {
    if (options.reasoning) {
      return options.reasoning
    }

    return safeStringify(content)
  }

  const formattedBlocks = content
    .map((block, index) => formatContentBlock(block, options, index))
    .filter(Boolean)

  if (formattedBlocks.length === 0 && options.reasoning) {
    return options.reasoning
  }

  return formattedBlocks.join("\n\n")
}

export const hasRenderableMessageContent = (content, options = {}) =>
  buildMessageText(content, options).trim().length > 0

export const normalizeTimestamp = (timestamp) => {
  if (!timestamp) {
    return new Date().toISOString()
  }

  if (typeof timestamp === "number") {
    const normalizedValue =
      timestamp > 1_000_000_000_000 ? timestamp : timestamp * 1000
    return new Date(normalizedValue).toISOString()
  }

  const parsedDate = new Date(timestamp)

  if (Number.isNaN(parsedDate.getTime())) {
    return new Date().toISOString()
  }

  return parsedDate.toISOString()
}

export const getMessageCopyText = (message, options = {}) =>
  buildMessageText(message?.rawContent ?? message?.content, {
    metadata: message?.metadata,
    reasoning: message?.reasoning,
    showToolDetails: options.showToolDetails,
    toolCalls: message?.toolsCalls,
  })
