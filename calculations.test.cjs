const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('./calculations.js');

test('mortgage computes a standard 25-year annuity and closes balance', () => {
  const result = C.mortgage({ principal: 150000, annualRate: 3.5, years: 25 });
  assert.equal(result.count, 300);
  assert.ok(Math.abs(result.payment - 750.94) < 0.02);
  assert.equal(result.schedule.at(-1).balance, 0);
  assert.ok(result.totalInterest > 75000);
});

test('zero-rate mortgage divides principal evenly', () => {
  const result = C.mortgage({ principal: 120000, annualRate: 0, years: 20 });
  assert.equal(result.payment, 500);
  assert.equal(result.totalInterest, 0);
});

test('invalid mortgage duration is rejected', () => {
  assert.throws(() => C.mortgage({ principal: 100000, annualRate: 2, years: 0 }), /Durata non valido/);
});

test('affordability subtracts existing monthly commitments from the income limit', () => {
  assert.deepEqual(C.affordability({ monthlyIncome: 3000, commitments: 250, thresholdPercent: 35 }), { sustainablePayment: 800, ratio: 250 / 3000 });
});

test('LTV is unavailable if property value is missing', () => {
  assert.equal(C.ltv({ principal: 150000, propertyValue: 0 }), null);
  assert.equal(C.ltv({ principal: 150000, propertyValue: 200000 }), 75);
});

test('commercial surface applies each editable coefficient', () => {
  assert.equal(C.commercialSurface([{ area: 80, coefficientPercent: 100 }, { area: 12, coefficientPercent: 30 }, { area: 8, coefficientPercent: 25 }]), 85.6);
});

test('estimate applies a signed adjustment', () => {
  assert.equal(C.estimate({ surface: 90, unitValue: 3000, adjustmentPercent: -5 }), 256500);
});

test('purchase budget adds costs and purchase price separately', () => {
  const result = C.purchaseBudget({ price: 200000, taxes: 8000, notary: 2500, agency: 6000, loan: 1000, other: 500 });
  assert.equal(result.totalCosts, 18000);
  assert.equal(result.totalBudget, 218000);
});
