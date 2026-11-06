(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.IperitoCalculations = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const finite = (name, value, min = 0, max = Number.MAX_SAFE_INTEGER) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n < min || n > max) throw new RangeError(`${name} non valido`);
    return n;
  };
  const money = value => Math.round((value + Number.EPSILON) * 100) / 100;

  function mortgage({ principal, annualRate, years }) {
    const p = finite('Capitale', principal, 0.01);
    const rate = finite('TAN', annualRate, 0, 100) / 100 / 12;
    const duration = finite('Durata', years, 1, 50);
    const count = Math.round(duration * 12);
    const payment = rate === 0 ? p / count : p * rate / (1 - Math.pow(1 + rate, -count));
    let balance = p;
    let totalInterest = 0;
    const schedule = [];
    for (let month = 1; month <= count; month++) {
      const interest = balance * rate;
      const capital = month === count ? balance : Math.min(balance, payment - interest);
      balance = Math.max(0, balance - capital);
      totalInterest += interest;
      schedule.push({ month, payment: money(capital + interest), capital: money(capital), interest: money(interest), balance: money(balance) });
    }
    return { payment: money(payment), count, totalInterest: money(totalInterest), totalPaid: money(p + totalInterest), schedule };
  }

  function affordability({ monthlyIncome, commitments = 0, thresholdPercent = 35 }) {
    const income = finite('Reddito', monthlyIncome);
    const debt = finite('Impegni', commitments);
    const threshold = finite('Soglia', thresholdPercent, 1, 100) / 100;
    return { sustainablePayment: money(Math.max(0, income * threshold - debt)), ratio: income > 0 ? debt / income : null };
  }

  function ltv({ principal, propertyValue }) {
    const amount = finite('Finanziamento', principal);
    const value = finite('Valore immobile', propertyValue);
    return value === 0 ? null : amount / value * 100;
  }

  function commercialSurface(items) {
    if (!Array.isArray(items)) throw new TypeError('Superfici non valide');
    return money(items.reduce((sum, item) => sum + finite('Superficie', item.area) * finite('Coefficiente', item.coefficientPercent, 0, 100) / 100, 0));
  }

  function estimate({ surface, unitValue, adjustmentPercent = 0 }) {
    const area = finite('Superficie', surface);
    const unit = finite('Valore unitario', unitValue);
    const adjustment = finite('Aggiustamento', adjustmentPercent, -100, 1000);
    return money(area * unit * (1 + adjustment / 100));
  }

  function purchaseBudget(values) {
    const keys = ['price', 'taxes', 'notary', 'agency', 'loan', 'other'];
    const costs = Object.fromEntries(keys.map(key => [key, money(finite(key, values[key] || 0))]));
    const totalCosts = money(keys.slice(1).reduce((sum, key) => sum + costs[key], 0));
    return { ...costs, totalCosts, totalBudget: money(costs.price + totalCosts) };
  }

  return { mortgage, affordability, ltv, commercialSurface, estimate, purchaseBudget, money };
});
