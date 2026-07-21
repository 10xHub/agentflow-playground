import { Code2, Eye } from "lucide-react"
import PropTypes from "prop-types"
import { useState } from "react"
import ReactMarkdown from "react-markdown"
import rehypeRaw from "rehype-raw"
import rehypeSanitize, { defaultSchema } from "rehype-sanitize"
import remarkGfm from "remark-gfm"

import { detectFormat } from "@/lib/rich-text"

import styles from "../chat.module.css"

import CodeBlock from "./code-block"
import HtmlFrame from "./html-frame"

// Inline HTML is allowed through, but not the parts that would leak out of the
// message and restyle or instrument the playground itself.
const SCHEMA = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    "*": [...(defaultSchema.attributes?.["*"] || []), "className", "style"],
  },
}

const MD_PLUGINS = [remarkGfm]
const HAST_PLUGINS = [rehypeRaw, [rehypeSanitize, SCHEMA]]

// react-markdown v10 dropped the `inline` prop on `code`, so the fenced case is
// owned by `pre` (only fences are wrapped in one) and `code` stays inline-only.
const COMPONENTS = {
  pre: ({ children }) => {
    const child = Array.isArray(children) ? children[0] : children
    const inner = child?.props
    if (!inner) return <pre>{children}</pre>
    const code = String(inner.children).replace(/\n$/, "")
    const lang = /language-(\w+)/.exec(inner.className || "")?.[1]
    return <CodeBlock lang={lang} code={code} />
  },
}

/**
 * Agent text. Output that is structurally an HTML document renders in a
 * sandboxed frame; everything else is markdown. Detection is deferred while a
 * response is still streaming, since partial HTML reflows on every token.
 */
const RichText = ({ text = "", streaming = false, children = null }) => {
  const isHtml = !streaming && detectFormat(text) === "html"
  const [preview, setPreview] = useState(true)

  if (isHtml) {
    return (
      <div className={styles.codeWrap}>
        <div className={styles.codeBar}>
          <span className={styles.codeLang}>html</span>
          <button
            type="button"
            className={styles.codeToggle}
            onClick={() => setPreview((p) => !p)}
            title={preview ? "Show source" : "Show preview"}
          >
            {preview ? <Code2 size={12} /> : <Eye size={12} />}
            {preview ? "source" : "preview"}
          </button>
        </div>
        {preview ? (
          <HtmlFrame html={text} />
        ) : (
          <pre className={styles.rawHtml}>{text}</pre>
        )}
      </div>
    )
  }

  return (
    <>
      <ReactMarkdown
        remarkPlugins={MD_PLUGINS}
        rehypePlugins={HAST_PLUGINS}
        components={COMPONENTS}
      >
        {text}
      </ReactMarkdown>
      {children}
    </>
  )
}

RichText.propTypes = {
  text: PropTypes.string,
  streaming: PropTypes.bool,
  children: PropTypes.node,
}

export default RichText
