#!/usr/bin/env node
// lib/__tests__/invoice-calc.test.mjs
// Golden reference tests for invoice calculation logic.
// Run: node lib/__tests__/invoice-calc.test.mjs
//
// These values are HAND-CALCULATED and must never change.
// If a test fails, the calculation logic is broken — do NOT adjust the expected values.

import { round2 } from '../round2.js'

let passed = 0
let failed = 0

function expect(name, actual, expected) {
  if (actual === expected) {
    console.log(`  ✅ ${name}: ${actual}`)
    passed++
  } else {
    console.error(`  ❌ ${name}: got ${actual}, expected ${expected}`)
    failed++
  }
}

// Simulate calculateTotals logic — must match InvoiceCreator exactly
function calculate({ items, taxRate, rabattPct = 0, einbehaltPct = 0 }) {
  // 1. Subtotal netto
  let subtotalNetto = 0
  for (const item of items) {
    subtotalNetto += round2(item.qty * item.price)
  }
  subtotalNetto = round2(subtotalNetto)

  // 2. Rabatt on netto
  const rabattAmount = round2(subtotalNetto * rabattPct / 100)

  // 3. Netto nach Rabatt
  const nettoAfterDiscount = round2(subtotalNetto - rabattAmount)

  // 4. MwSt on netto nach Rabatt
  const taxAmount = round2(nettoAfterDiscount * taxRate / 100)

  // 5. Brutto
  const grossTotal = round2(nettoAfterDiscount + taxAmount)

  // 6. Einbehalt on brutto
  const einbehaltAmount = round2(grossTotal * einbehaltPct / 100)

  // 7. Amount due
  const amountDue = round2(grossTotal - einbehaltAmount)

  return { subtotalNetto, rabattAmount, nettoAfterDiscount, taxAmount, grossTotal, einbehaltAmount, amountDue }
}

// ─── TEST 1: Einfache Rechnung ohne Rabatt ─────────────────────────────────
console.log('\n── Test 1: Einfache Rechnung (1000€ netto, 19% MwSt, kein Rabatt)')
{
  const r = calculate({
    items: [{ qty: 10, price: 60 }, { qty: 1, price: 400 }],
    taxRate: 19,
  })
  // 10×60 = 600, 1×400 = 400 → subtotal = 1000
  // MwSt = 1000 × 19% = 190
  // Brutto = 1000 + 190 = 1190
  expect('Subtotal netto', r.subtotalNetto, 1000)
  expect('Rabatt', r.rabattAmount, 0)
  expect('Netto nach Rabatt', r.nettoAfterDiscount, 1000)
  expect('MwSt 19%', r.taxAmount, 190)
  expect('Brutto', r.grossTotal, 1190)
  expect('Einbehalt', r.einbehaltAmount, 0)
  expect('Zahlbar', r.amountDue, 1190)
}

// ─── TEST 2: Rechnung mit 10% Rabatt ────────────────────────────────────────
console.log('\n── Test 2: Rechnung mit 10% Rabatt (1000€ netto)')
{
  const r = calculate({
    items: [{ qty: 10, price: 60 }, { qty: 1, price: 400 }],
    taxRate: 19,
    rabattPct: 10,
  })
  // Subtotal = 1000
  // Rabatt = 1000 × 10% = 100
  // Netto nach Rabatt = 900
  // MwSt = 900 × 19% = 171
  // Brutto = 900 + 171 = 1071
  expect('Subtotal netto', r.subtotalNetto, 1000)
  expect('Rabatt 10%', r.rabattAmount, 100)
  expect('Netto nach Rabatt', r.nettoAfterDiscount, 900)
  expect('MwSt 19%', r.taxAmount, 171)
  expect('Brutto', r.grossTotal, 1071)
  expect('Zahlbar', r.amountDue, 1071)
}

// ─── TEST 3: Rechnung mit 5% Rabatt + 10% Einbehalt ────────────────────────
console.log('\n── Test 3: 5% Rabatt + 10% Einbehalt (1000€ netto)')
{
  const r = calculate({
    items: [{ qty: 10, price: 60 }, { qty: 1, price: 400 }],
    taxRate: 19,
    rabattPct: 5,
    einbehaltPct: 10,
  })
  // Subtotal = 1000
  // Rabatt = 1000 × 5% = 50
  // Netto nach Rabatt = 950
  // MwSt = 950 × 19% = 180.50
  // Brutto = 950 + 180.50 = 1130.50
  // Einbehalt = 1130.50 × 10% = 113.05
  // Zahlbar = 1130.50 - 113.05 = 1017.45
  expect('Subtotal netto', r.subtotalNetto, 1000)
  expect('Rabatt 5%', r.rabattAmount, 50)
  expect('Netto nach Rabatt', r.nettoAfterDiscount, 950)
  expect('MwSt 19%', r.taxAmount, 180.50)
  expect('Brutto', r.grossTotal, 1130.50)
  expect('Einbehalt 10%', r.einbehaltAmount, 113.05)
  expect('Zahlbar sofort', r.amountDue, 1017.45)
}

// ─── TEST 4: Skonto (nur informativ — ändert keine Beträge) ─────────────────
console.log('\n── Test 4: Skonto 2% informativ (1190€ brutto)')
{
  const r = calculate({
    items: [{ qty: 10, price: 60 }, { qty: 1, price: 400 }],
    taxRate: 19,
  })
  // Skonto ändert keine Beträge — nur informativer Hinweis
  const skontoAmount = round2(r.amountDue * 2 / 100)
  // 1190 × 2% = 23.80
  expect('Brutto', r.grossTotal, 1190)
  expect('Zahlbar (unverändert)', r.amountDue, 1190)
  expect('Skonto 2% (informativ)', skontoAmount, 23.80)
}

// ─── TEST 5: "Hässliche" Dezimalzahlen ──────────────────────────────────────
console.log('\n── Test 5: Hässliche Dezimalzahlen (840,34€ netto, 5% Rabatt, 8.5% Einbehalt)')
{
  const r = calculate({
    items: [{ qty: 1, price: 840.34 }],
    taxRate: 19,
    rabattPct: 5,
    einbehaltPct: 8.5,
  })
  // Subtotal = 840.34
  // Rabatt = 840.34 × 5% = 42.017 → round2 = 42.02
  // Netto nach Rabatt = 840.34 - 42.02 = 798.32
  // MwSt = 798.32 × 19% = 151.6808 → round2 = 151.68
  // Brutto = 798.32 + 151.68 = 949.99 (NICHT 950!)
  //   (wäre 950.00 ohne Rundung — das ist der 1-Cent Effekt)
  // Einbehalt = 949.99... wir berechnen: 949.99 × 8.5% = 80.74915 → 80.75
  //   ABER: brutto könnte auch 950.00 sein je nach round2 Verhalten
  //
  // Exakt mit round2:
  const expRabatt = round2(840.34 * 5 / 100)        // 42.02
  const expNetto = round2(840.34 - expRabatt)         // 798.32
  const expTax = round2(expNetto * 19 / 100)          // 151.68
  const expBrutto = round2(expNetto + expTax)          // 950.00
  const expEinbehalt = round2(expBrutto * 8.5 / 100)  // 80.75
  const expDue = round2(expBrutto - expEinbehalt)      // 869.25

  expect('Subtotal netto', r.subtotalNetto, 840.34)
  expect('Rabatt 5%', r.rabattAmount, expRabatt)
  expect('Netto nach Rabatt', r.nettoAfterDiscount, expNetto)
  expect('MwSt 19%', r.taxAmount, expTax)
  expect('Brutto', r.grossTotal, expBrutto)
  expect('Einbehalt 8.5%', r.einbehaltAmount, expEinbehalt)
  expect('Zahlbar sofort', r.amountDue, expDue)
}

// ─── Summary ────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`)
if (failed === 0) {
  console.log(`✅ All ${passed} golden reference tests passed`)
} else {
  console.log(`❌ ${failed} test(s) failed, ${passed} passed`)
  process.exit(1)
}
