import { Code2, Eye } from "lucide-react"
import PropTypes from "prop-types"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  CodeBlock as CodeBlockRoot,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockLine,
  CodeBlockTitle,
} from "@/components/ui/code-block"
import { useHighlightedCode } from "@/hooks/use-highlighted-code"
import { isPreviewableLang } from "@/lib/rich-text"

import HtmlFrame from "./html-frame"

/** Shiki-highlighted lines; a language shiki does not know renders plain. */
const HighlightedLines = ({ code, lang }) => {
  const lines = useHighlightedCode(code, lang || "text")
  // A line has no identity beyond its position, and lines only append.
  return lines.map((line, index) => (
    // eslint-disable-next-line react/no-array-index-key
    <CodeBlockLine key={index}>{line}</CodeBlockLine>
  ))
}

HighlightedLines.propTypes = {
  code: PropTypes.string.isRequired,
  lang: PropTypes.string,
}

const labelFor = (lang) => lang || "text"

/** Switches a renderable block between its preview and its source. */
const PreviewToggle = ({ preview, onToggle }) => {
  const label = preview ? "Show source" : "Show preview"
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      aria-label={label}
      title={label}
      onClick={onToggle}
    >
      {preview ? <Code2 /> : <Eye />}
    </Button>
  )
}

PreviewToggle.propTypes = {
  preview: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
}

/**
 * Fenced code and tool payloads. Renderable languages preview by default, with
 * a source toggle. `title` replaces the language label; `size="sm"` and `wrap`
 * suit tool arguments and results.
 */
const CodeBlock = ({
  lang = "",
  code = "",
  title = null,
  size = "default",
  wrap = false,
  className = "",
}) => {
  const previewable = isPreviewableLang(lang)
  const [preview, setPreview] = useState(previewable)

  return (
    <CodeBlockRoot size={size} className={className}>
      <CodeBlockHeader>
        <CodeBlockTitle className="font-mono text-muted-foreground">
          {title ?? labelFor(lang)}
        </CodeBlockTitle>
        <CodeBlockActions>
          {previewable ? (
            <PreviewToggle
              preview={preview}
              onToggle={() => setPreview((p) => !p)}
            />
          ) : null}
          <CodeBlockCopyButton value={code} />
        </CodeBlockActions>
      </CodeBlockHeader>
      {preview ? (
        <div className="px-3 pb-3">
          <HtmlFrame html={code} />
        </div>
      ) : (
        <CodeBlockContent wrap={wrap} className="max-h-96">
          <HighlightedLines code={code} lang={lang} />
        </CodeBlockContent>
      )}
    </CodeBlockRoot>
  )
}

CodeBlock.propTypes = {
  lang: PropTypes.string,
  code: PropTypes.string,
  title: PropTypes.node,
  size: PropTypes.oneOf(["default", "sm"]),
  wrap: PropTypes.bool,
  className: PropTypes.string,
}

export default CodeBlock
