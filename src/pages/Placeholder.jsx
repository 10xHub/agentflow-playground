// Temporary stand-in for routes still being converted from the HTML mockups.
export default function Placeholder({ name }) {
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
      {name} — coming next
    </div>
  )
}
