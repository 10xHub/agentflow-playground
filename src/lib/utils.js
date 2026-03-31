import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines class names using clsx and merges them with tailwind-merge.
 * @returns {string} The merged class name string.
 */
export const cn = (...inputs) => twMerge(clsx(inputs))
