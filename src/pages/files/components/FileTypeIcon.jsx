import { File, FileText, Image, Music } from "lucide-react"

// Maps a file class to a lucide glyph matching the mockup's inline SVGs.
/**
 *
 */
export default function FileTypeIcon({ cls, size = 16, strokeWidth = 1.6 }) {
  const properties = { size, strokeWidth }
  if (cls === "img") return <Image {...properties} />
  if (cls === "aud") return <Music {...properties} />
  if (cls === "doc") return <FileText {...properties} />
  return <File {...properties} />
}
