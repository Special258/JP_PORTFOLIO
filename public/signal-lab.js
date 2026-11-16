'use strict';

function movingAverage(values, period) {
  if (!Array.isArray(values) || !Number.isInteger(period) || period < 1) {
    throw new TypeError('Moving average requires an array and a positive integer period.');
  }
  if (values.some(function (value) { return !Number.isFinite(value); })) {
    throw new TypeError('Moving average values must all be finite numbers.');
  }

  const result = new Array(values.length).fill(null);
  let total = 0;
  for (let index = 0; index < values.length; index += 1) {
    total += values[index];
    if (index >= period) {
      total -= values[index - period];
    }
    if (index >= period - 1) {
      result[index] = total / period;
    }
  }
  return result;
}

function rollingVolatility(closes, windowSize) {
  if (!Array.isArray(closes) || !Number.isInteger(windowSize) || windowSize < 2) {
    throw new TypeError('Rolling volatility requires an array and an integer window of at least two.');
  }
  if (closes.some(function (value) { return !Number.isFinite(value) || value <= 0; })) {
    throw new TypeError('Closing prices must be finite positive numbers.');
  }

  const logReturns = new Array(closes.length).fill(null);
  for (let index = 1; index < closes.length; index += 1) {
    logReturns[index] = Math.log(closes[index] / closes[index - 1]);
  }

  const result = new Array(closes.length).fill(null);
  for (let end = windowSize; end < closes.length; end += 1) {
    const returns = logReturns.slice(end - windowSize + 1, end + 1);
    const mean = returns.reduce(function (total, value) { return total + value; }, 0) / windowSize;
    const variance = returns.reduce(function (total, value) {
      return total + Math.pow(value - mean, 2);
    }, 0) / windowSize;
    result[end] = Math.sqrt(variance);
  }
  return result;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { movingAverage: movingAverage, rollingVolatility: rollingVolatility };
}

(function () {
  if (typeof document === 'undefined') {
    return;
  }

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const controls = document.getElementById('signal-lab-controls');
  const tickerSelect = document.getElementById('signal-lab-ticker');
  const crossoverToggle = document.getElementById('signal-lab-crossover');
  const volatilityToggle = document.getElementById('signal-lab-volatility');
  const status = document.getElementById('signal-lab-status');
  const chart = document.getElementById('signal-lab-chart');
  const summary = document.getElementById('signal-lab-summary');

  if (!controls || !tickerSelect || !crossoverToggle || !volatilityToggle || !status || !chart || !summary) {
    return;
  }

  function validateDataset(dataset) {
    if (!dataset || typeof dataset !== 'object' || dataset.placeholder === true) {
      throw new Error('Only real, owner-exported closing-price data can be loaded; the example file is a placeholder.');
    }
    if (!Array.isArray(dataset.tickers) || dataset.tickers.length !== 3) {
      throw new Error('The dataset must contain exactly three tickers.');
    }

    const seenSymbols = new Set();
    return dataset.tickers.map(function (ticker) {
      if (!ticker || typeof ticker.symbol !== 'string' || !/^[A-Z0-9.^-]{1,15}$/.test(ticker.symbol)) {
        throw new Error('Each ticker must have a valid uppercase symbol.');
      }
      if (seenSymbols.has(ticker.symbol)) {
        throw new Error('Ticker symbols must be unique.');
      }
      seenSymbols.add(ticker.symbol);

      if (!Array.isArray(ticker.prices) || ticker.prices.length === 0) {
        throw new Error('Each ticker must include at least one daily close.');
      }
      const prices = ticker.prices.map(function (item) {
        if (!item || typeof item.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item.date) ||
            !Number.isFinite(Date.parse(item.date)) ||
            new Date(item.date + 'T00:00:00Z').toISOString().slice(0, 10) !== item.date ||
            !Number.isFinite(item.close) || item.close <= 0) {
          throw new Error('Every price must have a valid YYYY-MM-DD date and a positive numeric close.');
        }
        return { date: item.date, close: item.close };
      }).sort(function (left, right) {
        return left.date.localeCompare(right.date);
      });

      for (let index = 1; index < prices.length; index += 1) {
        if (prices[index - 1].date === prices[index].date) {
          throw new Error('A ticker cannot contain more than one close for the same date.');
        }
      }
      return { symbol: ticker.symbol, prices: prices };
    });
  }

  function svgElement(name, attributes, text) {
    const element = document.createElementNS(SVG_NS, name);
    Object.keys(attributes || {}).forEach(function (key) {
      element.setAttribute(key, attributes[key]);
    });
    if (text !== undefined) {
      element.textContent = text;
    }
    return element;
  }

  function addText(parent, x, y, text, className) {
    const element = svgElement('text', { x: x, y: y, class: className || '' }, text);
    parent.appendChild(element);
    return element;
  }

  function linePath(series, xFor, yFor) {
    let path = '';
    series.forEach(function (value, index) {
      if (value === null || !Number.isFinite(value)) {
        return;
      }
      path += (path ? ' L ' : 'M ') + xFor(index).toFixed(2) + ' ' + yFor(value).toFixed(2);
    });
    return path;
  }

  function findCrossovers(shortAverage, longAverage) {
    const crossovers = [];
    for (let index = 1; index < shortAverage.length; index += 1) {
      const previousShort = shortAverage[index - 1];
      const previousLong = longAverage[index - 1];
      const currentShort = shortAverage[index];
      const currentLong = longAverage[index];
      if (previousShort === null || previousLong === null || currentShort === null || currentLong === null) {
        continue;
      }

      const previousDifference = previousShort - previousLong;
      const currentDifference = currentShort - currentLong;
      if (previousDifference <= 0 && currentDifference > 0) {
        crossovers.push({ index: index, direction: '20-day average crossed above 50-day average' });
      } else if (previousDifference >= 0 && currentDifference < 0) {
        crossovers.push({ index: index, direction: '20-day average crossed below 50-day average' });
      }
    }
    return crossovers;
  }

  let tickers = [];

  function renderChart() {
    const ticker = tickers.find(function (item) { return item.symbol === tickerSelect.value; });
    if (!ticker) {
      return;
    }

    const prices = ticker.prices;
    const closes = prices.map(function (item) { return item.close; });
    const movingAverage20 = movingAverage(closes, 20);
    const movingAverage50 = movingAverage(closes, 50);
    const volatility = rollingVolatility(closes, 20);
    const showAverages = crossoverToggle.checked;
    const showVolatility = volatilityToggle.checked;
    const left = 58;
    const right = 724;
    const top = 40;
    const priceBottom = showVolatility ? 202 : 286;
    const volatilityTop = 238;
    const volatilityBottom = 292;
    const xFor = function (index) {
      return prices.length === 1 ? (left + right) / 2 : left + (right - left) * index / (prices.length - 1);
    };

    const visibleSeries = [closes];
    if (showAverages) {
      visibleSeries.push(movingAverage20, movingAverage50);
    }
    const visibleValues = visibleSeries.reduce(function (all, series) {
      return all.concat(series.filter(function (value) { return Number.isFinite(value); }));
    }, []);
    const minimum = Math.min.apply(null, visibleValues);
    const maximum = Math.max.apply(null, visibleValues);
    const padding = maximum === minimum ? Math.max(Math.abs(maximum) * 0.05, 1) : (maximum - minimum) * 0.08;
    const yForPrice = function (value) {
      return priceBottom - ((value - (minimum - padding)) / ((maximum + padding) - (minimum - padding))) * (priceBottom - top);
    };

    chart.replaceChildren();
    chart.appendChild(svgElement('title', { id: 'signal-lab-chart-title' }, ticker.symbol + ' historical daily closing prices'));
    chart.appendChild(svgElement('desc', { id: 'signal-lab-chart-description' },
      'Keyboard-focusable points show each supplied daily close. Optional overlays show 20- and 50-day averages and 20-day rolling volatility.'));

    const legend = [{ label: 'Daily close', className: 'signal-lab__line--close' }];
    if (showAverages) {
      legend.push(
        { label: '20-day average', className: 'signal-lab__line--short' },
        { label: '50-day average', className: 'signal-lab__line--long' }
      );
    }
    if (showVolatility) {
      legend.push({ label: '20-day volatility', className: 'signal-lab__line--volatility' });
    }
    legend.forEach(function (item, index) {
      const legendX = left + index * 160;
      chart.appendChild(svgElement('line', {
        x1: legendX, y1: 20, x2: legendX + 18, y2: 20, class: 'signal-lab__line ' + item.className
      }));
      addText(chart, legendX + 24, 24, item.label, 'signal-lab__axis-label');
    });

    for (let step = 0; step <= 4; step += 1) {
      const y = top + (priceBottom - top) * step / 4;
      const value = maximum + padding - ((maximum + padding) - (minimum - padding)) * step / 4;
      chart.appendChild(svgElement('line', { x1: left, y1: y, x2: right, y2: y, class: 'signal-lab__gridline' }));
      addText(chart, 6, y + 4, value.toFixed(2), 'signal-lab__axis-label');
    }

    chart.appendChild(svgElement('line', { x1: left, y1: top, x2: left, y2: priceBottom, class: 'signal-lab__axis' }));
    chart.appendChild(svgElement('line', { x1: left, y1: priceBottom, x2: right, y2: priceBottom, class: 'signal-lab__axis' }));
    addText(chart, left, 320, prices[0].date, 'signal-lab__axis-label');
    addText(chart, right, 320, prices[prices.length - 1].date, 'signal-lab__axis-label signal-lab__axis-label--end');
    chart.appendChild(svgElement('path', { d: linePath(closes, xFor, yForPrice), class: 'signal-lab__line signal-lab__line--close' }));

    if (showAverages) {
      chart.appendChild(svgElement('path', { d: linePath(movingAverage20, xFor, yForPrice), class: 'signal-lab__line signal-lab__line--short' }));
      chart.appendChild(svgElement('path', { d: linePath(movingAverage50, xFor, yForPrice), class: 'signal-lab__line signal-lab__line--long' }));
      findCrossovers(movingAverage20, movingAverage50).forEach(function (crossing) {
        const marker = svgElement('circle', {
          cx: xFor(crossing.index),
          cy: yForPrice(movingAverage20[crossing.index]),
          r: 5,
          class: 'signal-lab__crossover',
          tabindex: '0',
          focusable: 'true',
          role: 'img',
          'aria-label': prices[crossing.index].date + ': ' + crossing.direction
        });
        chart.appendChild(marker);
      });
    }

    prices.forEach(function (item, index) {
      chart.appendChild(svgElement('circle', {
        cx: xFor(index),
        cy: yForPrice(item.close),
        r: prices.length > 100 ? 2 : 3.5,
        class: 'signal-lab__point',
        tabindex: '0',
        focusable: 'true',
        role: 'img',
        'aria-label': item.date + ', ' + ticker.symbol + ' close ' + item.close
      }));
    });

    if (showVolatility) {
      const availableVolatility = volatility.filter(function (value) { return Number.isFinite(value); });
      if (availableVolatility.length > 0) {
        const volatilityMaximum = Math.max.apply(null, availableVolatility);
        const yForVolatility = function (value) {
          return volatilityBottom - value / (volatilityMaximum || 1) * (volatilityBottom - volatilityTop);
        };
        chart.appendChild(svgElement('line', {
          x1: left, y1: volatilityTop, x2: right, y2: volatilityTop, class: 'signal-lab__axis'
        }));
        addText(chart, left, 232, '20-day rolling volatility (daily log-return standard deviation)', 'signal-lab__axis-label');
        chart.appendChild(svgElement('path', {
          d: linePath(volatility, xFor, yForVolatility),
          class: 'signal-lab__line signal-lab__line--volatility'
        }));
        volatility.forEach(function (value, index) {
          if (value === null) {
            return;
          }
          chart.appendChild(svgElement('circle', {
            cx: xFor(index),
            cy: yForVolatility(value),
            r: 2.5,
            class: 'signal-lab__point signal-lab__point--volatility',
            tabindex: '0',
            focusable: 'true',
            role: 'img',
            'aria-label': prices[index].date + ', 20-day rolling volatility ' + (value * 100).toFixed(3) + ' percent'
          }));
        });
      } else {
        addText(chart, left, 254, 'At least 21 daily closes are needed for a 20-day return-volatility window.', 'signal-lab__axis-label');
      }
    }

    const first = prices[0];
    const last = prices[prices.length - 1];
    const changePercent = (last.close / first.close - 1) * 100;
    const crossoverCount = findCrossovers(movingAverage20, movingAverage50).length;
    summary.textContent = ticker.symbol + ': ' + prices.length + ' daily closes from ' + first.date + ' to ' + last.date +
      '. Latest close value: ' + last.close + '. Change across the supplied period: ' + changePercent.toFixed(2) +
      '%.' + (showAverages ? ' Observed 20/50-day crossovers: ' + crossoverCount + '.' : '') +
      (showVolatility && Number.isFinite(volatility[volatility.length - 1])
        ? ' Latest 20-day daily-return volatility: ' + (volatility[volatility.length - 1] * 100).toFixed(3) + '%.'
        : '');
  }

  function showLoadError(message, error) {
    status.textContent = message;
    summary.textContent = 'The chart is unavailable until valid local data is provided.';
    console.error('Signal Lab data load failed:', error);
  }

  async function loadData() {
    let response;
    try {
      response = await fetch('data/prices.json', { cache: 'no-store', credentials: 'same-origin' });
    } catch (error) {
      showLoadError('Unable to request the same-origin local price file: ' + error.message, error);
      return;
    }

    if (response.status === 404) {
      status.textContent = 'TODO: Add your own three-ticker daily-close CSV and convert it to data/prices.json. No market prices were supplied or fabricated.';
      return;
    }
    if (!response.ok) {
      const error = new Error('The local price file returned HTTP ' + response.status + '.');
      showLoadError('Unable to load the local price file: ' + error.message, error);
      return;
    }

    let dataset;
    try {
      dataset = await response.json();
    } catch (error) {
      showLoadError('The local price file is not valid JSON: ' + error.message, error);
      return;
    }

    try {
      tickers = validateDataset(dataset);
    } catch (error) {
      showLoadError('The local price data is invalid: ' + error.message, error);
      return;
    }

    tickerSelect.replaceChildren();
    tickers.forEach(function (ticker) {
      const option = document.createElement('option');
      option.value = ticker.symbol;
      option.textContent = ticker.symbol;
      tickerSelect.appendChild(option);
    });
    controls.disabled = false;
    status.textContent = 'Loaded owner-supplied daily closes locally. Nothing is sent to a remote service.';
    renderChart();
  }

  tickerSelect.addEventListener('change', renderChart);
  crossoverToggle.addEventListener('change', renderChart);
  volatilityToggle.addEventListener('change', renderChart);
  loadData();

}());
