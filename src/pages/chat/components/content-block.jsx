import { ChevronDown } from "lucide-react"
import PropTypes from "prop-types"
import { useState } from "react"

import { formatJson } from "@/lib/rich-text"

import styles from "../chat.module.css"

import CodeBlock from "./code-block"
import RichText from "./rich-text"

const TAG = {
  reasoning: { cls: styles.reason, label: "reasoning" },
  tool_call: { cls: styles.tool, label: "tool_call" },
  tool_result: { cls: styles.result, label: "tool_result" },
}

/** Tool args / results: highlighted JSON when it parses, rich text otherwise. */
const ToolPayload = ({ code = "" }) => {
  const json = formatJson(code)
  if (json) return <CodeBlock lang="json" code={json} />
  return (
    <div className={styles.prose}>
      <RichText text={code || ""} />
    </div>
  )
}

ToolPayload.propTypes = {
  code: PropTypes.string,
}

/** Collapsible reasoning / tool_call / tool_result block inside an agent turn. */
const ContentBlock = ({ block }) => {
  const [collapsed, setCollapsed] = useState(!!block.collapsed)
  const tag = TAG[block.kind]

  const toggle = () => setCollapsed((c) => !c)
  const onKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      toggle()
    }
  }

  return (
    <div className={`${styles.block} ${collapsed ? styles.collapsed : ""}`}>
      <div
        className={styles.blockH}
        role="button"
        tabIndex={0}
        onClick={toggle}
        onKeyDown={onKeyDown}
      >
        <span className={`${styles.tag} ${tag.cls}`}>{tag.label}</span>
        {block.kind === "reasoning" ? (
          <span>{block.summary}</span>
        ) : (
          <span className={styles.blockName}>{block.name}</span>
        )}
        {block.meta ? (
          <span className={styles.blockMeta}>{block.meta}</span>
        ) : null}
        <ChevronDown size={12} className={styles.arrow} />
      </div>
      <div className={styles.blockC}>
        {block.kind === "reasoning" ? (
          <div className={`${styles.reasontext} ${styles.prose}`}>
            <RichText text={block.text || ""} />
          </div>
        ) : (
          <ToolPayload code={block.code} />
        )}
      </div>
    </div>
  )
}

ContentBlock.propTypes = {
  block: PropTypes.shape({
    collapsed: PropTypes.bool,
    kind: PropTypes.string,
    summary: PropTypes.string,
    name: PropTypes.string,
    meta: PropTypes.node,
    text: PropTypes.string,
    code: PropTypes.string,
  }).isRequired,
}

export default ContentBlock
