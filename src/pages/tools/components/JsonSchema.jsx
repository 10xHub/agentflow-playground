import { Fragment } from "react"

import styles from "../tools.module.css"

// Syntax-highlighted `{ type:"function", function:{…} }` schema, mirroring the
// mockup's tokenized <span class=key/str> output. Purely presentational.
export default function JsonSchema({ tool }) {
  const K = ({ children }) => <span className={styles.key}>{children}</span>
  const S = ({ children }) => <span className={styles.str}>{children}</span>

  const desc =
    tool.desc.slice(0, 80).replace(/"/g, '\\"') +
    (tool.desc.length > 80 ? "…" : "")
  const required = tool.params.filter((p) => p.r)

  return (
    <div className={styles.jsonbox}>
      {`{\n  `}
      <K>"type"</K>
      {": "}
      <S>"function"</S>
      {`,\n  `}
      <K>"function"</K>
      {`: {\n    `}
      <K>"name"</K>
      {": "}
      <S>"{tool.name}"</S>
      {`,\n    `}
      <K>"description"</K>
      {": "}
      <S>"{desc}"</S>
      {`,\n    `}
      <K>"parameters"</K>
      {`: {\n      `}
      <K>"type"</K>
      {": "}
      <S>"object"</S>
      {`,\n      `}
      <K>"properties"</K>
      {`: {\n`}
      {tool.params.map((p, i) => (
        <Fragment key={p.n}>
          {"      "}
          <K>"{p.n}"</K>
          {": { "}
          <K>"type"</K>
          {": "}
          <S>"{p.t}"</S>
          {p.d && (
            <>
              {", "}
              <K>"description"</K>
              {": "}
              <S>"{p.d}"</S>
            </>
          )}
          {" }"}
          {i < tool.params.length - 1 ? ",\n" : "\n"}
        </Fragment>
      ))}
      {`      },\n      `}
      <K>"required"</K>
      {": ["}
      {required.map((p, i) => (
        <Fragment key={p.n}>
          <S>"{p.n}"</S>
          {i < required.length - 1 ? ", " : ""}
        </Fragment>
      ))}
      {`]\n    }\n  }\n}`}
    </div>
  )
}
