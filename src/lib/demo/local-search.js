// Keyword fallback for memory queries that were not recorded. The UI labels these
// results, because they are not the store's vector search.
const words = (text) => (text || "").toLowerCase().match(/[a-z0-9_]+/g) ?? []

export const searchLocally = (memories, query) => {
  const terms = [...new Set(words(query))]
  if (terms.length === 0) return []
  return memories
    .map((m) => {
      const text = words(m.content).join(" ")
      // Five-letter prefixes let "preference" match "prefers".
      const hits = terms.filter((t) => text.includes(t.slice(0, 5))).length
      return { ...m, score: hits / terms.length }
    })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
}
