// Utility functions for OMNI Sourcing System

/**
 * Format a number as a localized money string (no currency symbol).
 */
export const formatMoney = (val: number | undefined | null): string => {
  if (val === undefined || val === null || isNaN(val)) return '0';
  return Number(val).toLocaleString();
};

/**
 * Round to 2 decimal places safely.
 */
export const mathRound = (val: number): number => {
  return Math.round((val + Number.EPSILON) * 100) / 100;
};

/**
 * Generate a unique product ID.
 */
export const generateProductId = (): string => {
  return `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
};
