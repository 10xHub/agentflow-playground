import ct from "@constants/"

/**
 * Get the layout type based on the provided match.
 * If the match is not found, return the default layout type.
 * @param {Array} match - The array of matches to determine the layout type.
 * @returns {string} The layout type based on the match or the default layout type.
 */
export const getLayoutType = (match) => {
  const layoutType = match[match.length - 1].staticData?.layoutType
  if (layoutType) {
    return layoutType
  }
  return ct.layout.LAYOUT_TYPE_BLANK
}
