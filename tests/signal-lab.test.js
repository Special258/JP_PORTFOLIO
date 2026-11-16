'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { movingAverage, rollingVolatility } = require('../public/signal-lab.js');
const { convertCsv } = require('../tools/csv-to-prices.js');

test('moving average returns only complete trailing windows', function () {
  assert.deepEqual(movingAverage([10, 20, 30, 40], 3), [null, null, 20, 30]);
  assert.deepEqual(movingAverage([2, 4], 1), [2, 4]);
  assert.deepEqual(movingAverage([2, 4], 3), [null, null]);
});

test('moving average rejects invalid periods and non-finite values', function () {
  assert.throws(function () { movingAverage([1, 2], 0); }, /positive integer period/);
  assert.throws(function () { movingAverage([1, NaN], 1); }, /finite numbers/);
});

test('rolling volatility uses a complete window of daily log returns', function () {
  const values = rollingVolatility([100, 110, 99], 2);
  assert.equal(values[0], null);
  assert.equal(values[1], null);
  assert.ok(Math.abs(values[2] - Math.abs(Math.log(1.1) - Math.log(0.9)) / 2) < 1e-12);
});

test('CSV conversion sorts owner-supplied prices and keeps the three ticker records', function () {
  const csv = [
    'date,ticker,close',
    '2025-01-02,BBB,12.5',
    '2025-01-01,AAA,10',
    '2025-01-01,BBB,12',
    '2025-01-02,CCC,32',
    '2025-01-01,CCC,31',
    '2025-01-02,AAA,11'
  ].join('\n');

  assert.deepEqual(convertCsv(csv), {
    tickers: [
      { symbol: 'AAA', prices: [{ date: '2025-01-01', close: 10 }, { date: '2025-01-02', close: 11 }] },
      { symbol: 'BBB', prices: [{ date: '2025-01-01', close: 12 }, { date: '2025-01-02', close: 12.5 }] },
      { symbol: 'CCC', prices: [{ date: '2025-01-01', close: 31 }, { date: '2025-01-02', close: 32 }] }
    ]
  });
});

test('CSV conversion rejects data that could be mistaken for a complete export', function () {
  assert.throws(function () { convertCsv('date,ticker,close\n2025-01-01,AAA,10'); }, /exactly three unique ticker symbols/);
  assert.throws(function () {
    convertCsv('date,ticker,close\n2025-02-30,AAA,10\n2025-01-01,BBB,20\n2025-01-01,CCC,30');
  }, /real YYYY-MM-DD date/);
});
