import { ChevronDown } from "lucide-react"
import { useState } from "react"

import { formatJson } from "@/lib/rich-text"

import CodeBlock from "./CodeBlock"
import RichText from "./RichText"
import styles from "../chat.module.css"

const TAG = {
  reasoning: { cls: styles.reason, label: "reasoning" },
  tool_call: { cls: styles.tool, label: "tool_call" },
  tool_result: { cls: styles.result, label: "tool_result" },
}

/** Tool args / results: highlighted JSON when it parses, rich text otherwise. */
function ToolPayload({ code }) {
  const json = formatJson(code)
  if (json) return <CodeBlock lang="json" code={json} />
  return (
    <div className={styles.prose}>
      <RichText text={code || ""} />
    </div>
  )
}

/** Collapsible reasoning / tool_call / tool_result block inside an agent turn. */
export default function ContentBlock({ block }) {
  const [collapsed, setCollapsed] = useState(!!block.collapsed)
  const tag = TAG[block.kind]

  return (
    <div className={`${styles.block} ${collapsed ? styles.collapsed : ""}`}>
      <div className={styles.blockH} onClick={() => setCollapsed((c) => !c)}>
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
