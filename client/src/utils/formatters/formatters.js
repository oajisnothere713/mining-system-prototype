/**
 * Format a number based on its unit of measure.
 * Tonnes get 2 decimal places with Indian locale; everything else gets rounded integers.
 */
export const fmt = (n, uom) =>
  uom === "t"
    ? n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : Math.round(n).toLocaleString("en-IN");

/**
 * Return the display unit string.
 */
export const unit = (uom) => (uom === "t" ? "t" : uom);
