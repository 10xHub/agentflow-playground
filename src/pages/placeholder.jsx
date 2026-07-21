import PropTypes from "prop-types"

const DEFAULT_NOTE = "coming next"

// Temporary stand-in for routes still being converted from the HTML mockups.
/**
 *
 */
const Placeholder = ({ name, note = DEFAULT_NOTE }) => {
  return (
    <div
      style={{
        flex: 1,
        display: "grid",
        placeItems: "center",
        color: "var(--text-muted)",
        fontFamily: "var(--mono)",
        fontSize: 12,
      }}
    >
      {name} — {note}
    </div>
  )
}

Placeholder.propTypes = {
  name: PropTypes.string.isRequired,
  note: PropTypes.string,
}

export default Placeholder
