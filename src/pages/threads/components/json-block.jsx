import PropTypes from "prop-types"

import styles from "../threads.module.css"

// Builds content-derived keys, disambiguating repeats (e.g. many "}" lines)
// with an occurrence counter so keys stay stable across re-renders.
/**
 *
 */
const withKeys = (items, toText) => {
  const seen = new Map()
  return items.map((value) => {
    const text = toText(value)
    const n = seen.get(text) || 0
    seen.set(text, n + 1)
    return { key: `${text}#${n}`, value }
  })
}

const lineText = (line) => line.map((tok) => tok.t).join("")
const tokenText = (tok) => `${tok.c || ""}:${tok.t}`

// Renders a pre-tokenized JSON blob (array of lines; each line an array of
// { t, c } tokens) with syntax highlighting classes.
/**
 *
 */
const JsonBlock = ({ lines }) => {
  const rows = withKeys(lines, lineText)
  return (
    <div className={styles.json}>
      {rows.map((row, index) => (
        <span key={row.key}>
          {withKeys(row.value, tokenText).map(({ key, value: tok }) =>
            tok.c ? (
              <span key={key} className={styles[tok.c]}>
                {tok.t}
              </span>
            ) : (
              <span key={key}>{tok.t}</span>
            )
          )}
          {index < rows.length - 1 ? "\n" : null}
        </span>
      ))}
    </div>
  )
}

JsonBlock.propTypes = {
  lines: PropTypes.arrayOf(
    PropTypes.arrayOf(
      PropTypes.shape({
        t: PropTypes.string,
        c: PropTypes.string,
      })
    )
  ).isRequired,
}

export default JsonBlock
