import styles from "../threads.module.css"

// Renders a pre-tokenized JSON blob (array of lines; each line an array of
// { t, c } tokens) with syntax highlighting classes.
/**
 *
 */
export default function JsonBlock({ lines }) {
  return (
    <div className={styles.json}>
      {lines.map((line, index) => (
        <span key={index}>
          {line.map((tok, index_) =>
            tok.c ? (
              <span key={index_} className={styles[tok.c]}>
                {tok.t}
              </span>
            ) : (
              <span key={index_}>{tok.t}</span>
            )
          )}
          {index < lines.length - 1 ? "\n" : null}
        </span>
      ))}
    </div>
  )
}
