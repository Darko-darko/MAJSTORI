// lib/round2.js
// Single rounding function used everywhere in invoice calculations.
// Rounds to 2 decimal places using toFixed(2) → Number conversion.
// NEVER use Math.round(...)/100 or other methods — always this.

export function round2(value) {
  return Number((parseFloat(value) || 0).toFixed(2))
}

export default round2
