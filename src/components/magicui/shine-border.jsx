"use client"
import PropTypes from "prop-types"
import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Shine Border
 *
 * An animated background border effect component with configurable properties.
 */
export const ShineBorder = ({
  borderWidth = 1,
  duration = 14,
  shineColor = "#000000",
  className,
  style,
  ...properties
}) => {
  return (
    <div
      style={{
        "--border-width": `${borderWidth}px`,
        "--duration": `${duration}s`,

        backgroundImage: `radial-gradient(transparent,transparent, ${
          Array.isArray(shineColor) ? shineColor.join(",") : shineColor
        },transparent,transparent)`,

        backgroundSize: "300% 300%",
        mask: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
        WebkitMask: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
        WebkitMaskComposite: "xor",
        maskComposite: "exclude",
        padding: "var(--border-width)",
        ...style,
      }}
      className={cn(
        "pointer-events-none absolute inset-0 size-full rounded-[inherit] will-change-[background-position] motion-safe:animate-shine",
        className
      )}
      {...properties}
    />
  )
}

/* eslint-disable react/require-default-props */
ShineBorder.propTypes = {
  borderWidth: PropTypes.number,
  duration: PropTypes.number,
  shineColor: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.arrayOf(PropTypes.string),
  ]),
  className: PropTypes.string,
  style: PropTypes.object,
}
/* eslint-enable react/require-default-props */
