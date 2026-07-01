import styles from "../threads.module.css"

// Renders a pre-tokenized JSON blob (array of lines; each line an array of
// { t, c } tokens) with syntax highlighting classes.
export default function JsonBlock({ lines }) {
  return (
    <div className={styles.json}>
      {lines.map((line, i) => (
        <span key={i}>
          {line.map((tok, j) =>
            tok.c ? (
              <span key={j} className={styles[tok.c]}>
                {tok.t}
              </span>
            ) : (
              <span key={j}>{tok.t}</span>
            )
          )}
          {i < lines.length - 1 ? "\n" : null}
        </span>
      ))}
    </div>
  )
}
