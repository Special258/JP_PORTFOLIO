'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { movingAverage, rollingVolatility } = require('../public/signal-lab.js');
const { convertCsv } = require('../tools/csv-to-json.js');

test('tools/csv-to-json converts valid 3-ticker CSV', function () {
  const sample = [
    'date,ticker,close',
    '2025-03-01,AAPL,150.5',
    '2025-03-02,AAPL,152.0',
    '2025-03-01,MSFT,300.0',
    '2025-03-02,MSFT,305.5',
    '2025-03-01,NVDA,120.0',
    '2025-03-02,NVDA,125.0'
  ].join('\n');

  const result = convertCsv(sample);
  assert.equal(result.tickers.length, 3);
  assert.deepEqual(result.tickers.map((t) => t.symbol), ['AAPL', 'MSFT', 'NVDA']);
  assert.equal(result.tickers[0].prices.length, 2);
  assert.equal(result.tickers[0].prices[0].close, 150.5);
});

test('movingAverage correctly calculates 20-day and 50-day window averages', function () {
  // Test 20-period moving average
  const prices20 = Array.from({ length: 25 }, (_, i) => 100 + i);
  const ma20 = movingAverage(prices20, 20);
  assert.equal(ma20.length, 25);
  for (let i = 0; i < 19; i++) {
    assert.equal(ma20[i], null, `Index ${i} should be null before 20 values`);
  }
  // The 20th value (index 19) is the average of 100..119 = (100 + 119) / 2 = 109.5
  assert.equal(ma20[19], 109.5);
  // The 21st value (index 20) is the average of 101..120 = 110.5
  assert.equal(ma20[20], 110.5);

  // Test 50-period moving average with 55 elements
  const prices50 = Array.from({ length: 55 }, (_, i) => 200 + i);
  const ma50 = movingAverage(prices50, 50);
  assert.equal(ma50[48], null);
  // Average of 200..249 = (200 + 249) / 2 = 224.5
  assert.equal(ma50[49], 224.5);
  assert.equal(ma50[50], 225.5);
});

test('rollingVolatility returns mathematical sample standard deviation of log returns', function () {
  // Constant price series -> log returns all 0 -> volatility = 0
  const flatPrices = [100, 100, 100, 100, 100];
  const vol = rollingVolatility(flatPrices, 3);
  assert.equal(vol[0], null);
  assert.equal(vol[1], null);
  assert.equal(vol[2], null);
  assert.equal(vol[3], 0);
  assert.equal(vol[4], 0);
});
