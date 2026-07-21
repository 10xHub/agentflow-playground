import PropTypes from "prop-types"
import { Fragment } from "react"

import styles from "../tools.module.css"

const K = ({ children = null }) => (
  <span className={styles.key}>{children}</span>
)

K.propTypes = {
  children: PropTypes.node,
}

const S = ({ children = null }) => (
  <span className={styles.str}>{children}</span>
)

S.propTypes = {
  children: PropTypes.node,
}

// Syntax-highlighted `{ type:"function", function:{…} }` schema, mirroring the
// mockup's tokenized <span class=key/str> output. Purely presentational.
/**
 *
 */
const JsonSchema = ({ tool }) => {
  const desc =
    tool.desc.slice(0, 80).replace(/"/g, '\\"') +
    (tool.desc.length > 80 ? "…" : "")
  const required = tool.params.filter((p) => p.r)

  return (
    <div className={styles.jsonbox}>
      {`{\n  `}
      <K>&quot;type&quot;</K>
      {": "}
      <S>&quot;function&quot;</S>
      {`,\n  `}
      <K>&quot;function&quot;</K>
      {`: {\n    `}
      <K>&quot;name&quot;</K>
      {": "}
      <S>&quot;{tool.name}&quot;</S>
      {`,\n    `}
      <K>&quot;description&quot;</K>
      {": "}
      <S>&quot;{desc}&quot;</S>
      {`,\n    `}
      <K>&quot;parameters&quot;</K>
      {`: {\n      `}
      <K>&quot;type&quot;</K>
      {": "}
      <S>&quot;object&quot;</S>
      {`,\n      `}
      <K>&quot;properties&quot;</K>
      {`: {\n`}
      {tool.params.map((p, index) => (
        <Fragment key={p.n}>
          {"      "}
          <K>&quot;{p.n}&quot;</K>
          {": { "}
          <K>&quot;type&quot;</K>
          {": "}
          <S>&quot;{p.t}&quot;</S>
          {p.d && (
            <>
              {", "}
              <K>&quot;description&quot;</K>
              {": "}
              <S>&quot;{p.d}&quot;</S>
            </>
          )}
          {" }"}
          {index < tool.params.length - 1 ? ",\n" : "\n"}
        </Fragment>
      ))}
      {`      },\n      `}
      <K>&quot;required&quot;</K>: [
      {required.map((p, index) => (
        <Fragment key={p.n}>
          <S>&quot;{p.n}&quot;</S>
          {index < required.length - 1 ? ", " : ""}
        </Fragment>
      ))}
      {`]\n    }\n  }\n}`}
    </div>
  )
}

JsonSchema.propTypes = {
  tool: PropTypes.shape({
    name: PropTypes.string,
    desc: PropTypes.string.isRequired,
    params: PropTypes.arrayOf(
      PropTypes.shape({
        n: PropTypes.string.isRequired,
        t: PropTypes.string,
        r: PropTypes.bool,
        d: PropTypes.string,
      })
    ).isRequired,
  }).isRequired,
}

export default JsonSchema
