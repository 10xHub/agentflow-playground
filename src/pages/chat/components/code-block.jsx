import { Code2, Eye } from "lucide-react"
import PropTypes from "prop-types"
import { useState } from "react"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"

import { isPreviewableLang } from "@/lib/rich-text"

import styles from "../chat.module.css"

import HtmlFrame from "./html-frame"

/** Fenced code. Renderable languages preview by default, with a source toggle. */
const CodeBlock = ({ lang = "", code = "" }) => {
  const previewable = isPreviewableLang(lang)
  const [preview, setPreview] = useState(previewable)

  return (
    <div className={styles.codeWrap}>
      <div className={styles.codeBar}>
        <span className={styles.codeLang}>{lang || "text"}</span>
        {previewable ? (
          <button
            type="button"
            className={styles.codeToggle}
            onClick={() => setPreview((p) => !p)}
            title={preview ? "Show source" : "Show preview"}
          >
            {preview ? <Code2 size={12} /> : <Eye size={12} />}
            {preview ? "source" : "preview"}
          </button>
        ) : null}
      </div>
      {preview ? (
        <HtmlFrame html={code} />
      ) : (
        <SyntaxHighlighter
          language={lang || "text"}
          style={oneDark}
          customStyle={{ margin: 0, background: "transparent", fontSize: 11.5 }}
        >
          {code}
        </SyntaxHighlighter>
      )}
    </div>
  )
}

CodeBlock.propTypes = {
  lang: PropTypes.string,
  code: PropTypes.string,
}

export default CodeBlock
