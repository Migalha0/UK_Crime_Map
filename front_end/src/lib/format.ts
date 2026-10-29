export const format_number = (value: number): string => value.toLocaleString('en-GB');

/**
 * Format a correlation coefficient as "+0.32" / "−0.31", or "–" when undefined.
 */
export const format_rho = (rho: number): string => Number.isFinite(rho)
    ? `${rho > 0 ? '+' : rho < 0 ? '−' : ''}${Math.abs(rho).toFixed(2)}`
    : '–';
