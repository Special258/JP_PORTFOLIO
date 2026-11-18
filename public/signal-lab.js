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

  /* --------------------------------------------------------------------------
     1. SIGNAL LAB: MARKETS × AI (Curated Stock Price & Signal Analysis)
     -------------------------------------------------------------------------- */
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const controls = document.getElementById('signal-lab-controls');
  const tickerSelect = document.getElementById('signal-lab-ticker');
  const crossoverToggle = document.getElementById('signal-lab-crossover');
  const volatilityToggle = document.getElementById('signal-lab-volatility');
  const status = document.getElementById('signal-lab-status');
  const chart = document.getElementById('signal-lab-chart');
  const summary = document.getElementById('signal-lab-summary');

  if (controls && tickerSelect && crossoverToggle && volatilityToggle && status && chart && summary) {
    crossoverToggle.checked = true;

    function validateDataset(dataset) {
      if (!dataset || typeof dataset !== 'object' || dataset.placeholder === true) {
        throw new Error('Only valid closing-price data can be loaded; placeholder file received.');
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
        return {
          symbol: ticker.symbol,
          name: ticker.name || ticker.symbol,
          focus: ticker.focus || '',
          thesis: ticker.thesis || '',
          prices: prices
        };
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
          crossovers.push({ index: index, type: 'golden', direction: '20-day MA crossed ABOVE 50-day MA (Golden Cross)' });
        } else if (previousDifference >= 0 && currentDifference < 0) {
          crossovers.push({ index: index, type: 'death', direction: '20-day MA crossed BELOW 50-day MA (Bearish Cross)' });
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
        'Interactive historical market signals showing closing prices, 20- and 50-day moving averages, and 20-day rolling return volatility.'));

      // Dynamic Live Readout bar inside the SVG
      const readoutText = svgElement('text', {
        x: right,
        y: 20,
        'text-anchor': 'end',
        class: 'signal-lab__axis-label',
        id: 'signal-lab-readout'
      }, 'Hover or tap points to inspect daily signal values');
      chart.appendChild(readoutText);

      const legend = [{ label: 'Daily close ($)', className: 'signal-lab__line--close' }];
      if (showAverages) {
        legend.push(
          { label: '20-day SMA', className: 'signal-lab__line--short' },
          { label: '50-day SMA', className: 'signal-lab__line--long' }
        );
      }
      if (showVolatility) {
        legend.push({ label: '20-day Volatility', className: 'signal-lab__line--volatility' });
      }
      legend.forEach(function (item, index) {
        const legendX = left + index * 140;
        chart.appendChild(svgElement('line', {
          x1: legendX, y1: 18, x2: legendX + 16, y2: 18, class: 'signal-lab__line ' + item.className
        }));
        addText(chart, legendX + 22, 22, item.label, 'signal-lab__axis-label');
      });

      for (let step = 0; step <= 4; step += 1) {
        const y = top + (priceBottom - top) * step / 4;
        const value = maximum + padding - ((maximum + padding) - (minimum - padding)) * step / 4;
        chart.appendChild(svgElement('line', { x1: left, y1: y, x2: right, y2: y, class: 'signal-lab__gridline' }));
        addText(chart, 6, y + 4, '$' + value.toFixed(1), 'signal-lab__axis-label');
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
            r: 6,
            class: 'signal-lab__crossover',
            tabindex: '0',
            focusable: 'true',
            role: 'img',
            'aria-label': prices[crossing.index].date + ': ' + crossing.direction
          });

          function showCrossover() {
            readoutText.textContent = prices[crossing.index].date + ' SIGNAL: ' + crossing.direction + ' at $' + movingAverage20[crossing.index].toFixed(2);
          }
          marker.addEventListener('mouseenter', showCrossover);
          marker.addEventListener('focus', showCrossover);
          chart.appendChild(marker);
        });
      }

      prices.forEach(function (item, index) {
        const ma20Val = movingAverage20[index];
        const ma50Val = movingAverage50[index];
        const volVal = volatility[index];
        const point = svgElement('circle', {
          cx: xFor(index),
          cy: yForPrice(item.close),
          r: prices.length > 100 ? 2 : 3.5,
          class: 'signal-lab__point',
          tabindex: '0',
          focusable: 'true',
          role: 'img',
          'aria-label': item.date + ', ' + ticker.symbol + ' close $' + item.close.toFixed(2)
        });

        function updateReadout() {
          let details = item.date + ' | ' + ticker.symbol + ': $' + item.close.toFixed(2);
          if (showAverages && ma20Val !== null) {
            details += ' | 20d MA: $' + ma20Val.toFixed(2);
          }
          if (showAverages && ma50Val !== null) {
            details += ' | 50d MA: $' + ma50Val.toFixed(2);
          }
          if (showVolatility && volVal !== null) {
            details += ' | 20d Vol: ' + (volVal * 100).toFixed(2) + '%';
          }
          readoutText.textContent = details;
        }

        point.addEventListener('mouseenter', updateReadout);
        point.addEventListener('focus', updateReadout);
        chart.appendChild(point);
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
            const volPoint = svgElement('circle', {
              cx: xFor(index),
              cy: yForVolatility(value),
              r: 2.5,
              class: 'signal-lab__point signal-lab__point--volatility',
              tabindex: '0',
              focusable: 'true',
              role: 'img',
              'aria-label': prices[index].date + ', 20-day rolling volatility ' + (value * 100).toFixed(3) + ' percent'
            });
            chart.appendChild(volPoint);
          });
        } else {
          addText(chart, left, 254, 'At least 21 daily closes are needed for a 20-day return-volatility window.', 'signal-lab__axis-label');
        }
      }

      const first = prices[0];
      const last = prices[prices.length - 1];
      const changePercent = (last.close / first.close - 1) * 100;
      const crossovers = findCrossovers(movingAverage20, movingAverage50);
      const latestMA20 = movingAverage20[movingAverage20.length - 1];
      const latestMA50 = movingAverage50[movingAverage50.length - 1];
      const latestVol = volatility[volatility.length - 1];

      let regimeState = 'Consolidation / Transition';
      if (latestMA20 && latestMA50) {
        if (latestMA20 > latestMA50) {
          regimeState = 'Bullish Trend Alignment (20-day SMA > 50-day SMA)';
        } else {
          regimeState = 'Corrective / Bearish Trend Alignment (20-day SMA < 50-day SMA)';
        }
      }

      summary.replaceChildren();

      const summaryHeadline = document.createElement('div');
      summaryHeadline.style.marginBottom = '8px';
      summaryHeadline.style.fontWeight = '600';
      summaryHeadline.style.color = 'var(--ink)';
      summaryHeadline.textContent = ticker.symbol + ' (' + (ticker.name || ticker.symbol) + '): ' +
        prices.length + ' trading sessions from ' + first.date + ' to ' + last.date + '.';
      summary.appendChild(summaryHeadline);

      const statsGrid = document.createElement('div');
      statsGrid.style.display = 'grid';
      statsGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(180px, 1fr))';
      statsGrid.style.gap = '8px 16px';
      statsGrid.style.margin = '10px 0 14px';
      statsGrid.style.fontSize = '12px';

      const statItems = [
        { label: 'Latest Close', val: '$' + last.close.toFixed(2) },
        { label: 'Period Change', val: (changePercent >= 0 ? '+' : '') + changePercent.toFixed(2) + '%' },
        { label: 'Market Regime', val: regimeState },
        { label: '20-day Volatility', val: Number.isFinite(latestVol) ? (latestVol * 100).toFixed(2) + '%' : 'N/A' },
        { label: 'Observed Crossovers', val: crossovers.length + ' event' + (crossovers.length === 1 ? '' : 's') }
      ];

      statItems.forEach(function (stat) {
        const card = document.createElement('div');
        card.style.padding = '6px 10px';
        card.style.background = 'var(--paper)';
        card.style.border = '1px solid var(--line)';
        card.style.borderRadius = '3px';
        card.innerHTML = '<strong style="color:var(--muted);display:block;font-size:10px;text-transform:uppercase;font-family:var(--mono);">' +
          stat.label + '</strong><span style="font-weight:600;color:var(--ink);">' + stat.val + '</span>';
        statsGrid.appendChild(card);
      });
      summary.appendChild(statsGrid);

      if (ticker.thesis) {
        const thesisBox = document.createElement('div');
        thesisBox.style.padding = '12px 14px';
        thesisBox.style.background = 'var(--paper-deep)';
        thesisBox.style.borderLeft = '3px solid var(--violet)';
        thesisBox.style.borderRadius = '0 3px 3px 0';
        thesisBox.style.marginTop = '10px';
        thesisBox.style.fontSize = '12px';
        thesisBox.style.lineHeight = '1.6';
        thesisBox.innerHTML = '<strong style="color:var(--violet);display:block;margin-bottom:3px;font-family:var(--mono);text-transform:uppercase;letter-spacing:0.04em;">Jal\'s Analytical Thesis &amp; Market Perspective</strong>' +
          '<span style="color:var(--ink);">' + ticker.thesis + '</span>';
        summary.appendChild(thesisBox);
      }
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
        showLoadError('Unable to request the local price file: ' + error.message, error);
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
        option.textContent = ticker.symbol + ' — ' + (ticker.name || ticker.symbol);
        tickerSelect.appendChild(option);
      });
      controls.disabled = false;
      status.innerHTML = '<strong>Live Market Signals:</strong> Curated daily closes across AI infrastructure, macro index regimes, and mega-cap tech. No remote tracking.';
      renderChart();
    }

    tickerSelect.addEventListener('change', renderChart);
    crossoverToggle.addEventListener('change', renderChart);
    volatilityToggle.addEventListener('change', renderChart);
    loadData();
  }

  /* --------------------------------------------------------------------------
     2. IN-PAGE PROJECT ARCHITECTURE & DEEP DIVE EXPANDER
     Enhances project cards so visitors can explore technical architecture
     directly on the portfolio page without navigating to separate pages.
     -------------------------------------------------------------------------- */
  const projectDetails = {
    kairon: {
      title: 'Kairon — Architecture & Technical Scope',
      stack: 'FastAPI · React · TypeScript · Supabase · Python · Scikit-Learn',
      summary: 'Retention intelligence platform analyzing multi-signal customer behavior for explainable churn risk scoring.',
      points: [
        '<strong>Signal Pipeline:</strong> Ingests telemetry across usage frequency, payment history, account tenure, NPS scores, and feature-adoption velocity.',
        '<strong>Explainable Risk Engine:</strong> Computes probabilistic risk scores with feature-attribution weights, helping customer success teams pinpoint why an account is at risk.',
        '<strong>Cohort & Batch Processing:</strong> Supports scheduled batch predictions and cohort clustering to track health shifts across account tiers.'
      ],
      repoUrl: 'https://github.com/Special258/Kairon'
    },
    janus: {
      title: 'Janus — Autonomous Task Agent Architecture',
      stack: 'Node.js · Webhooks · n8n · REST APIs · Asynchronous Pipelines',
      summary: 'Autonomous task orchestration agent translating unstructured event triggers into verified multi-step executions.',
      points: [
        '<strong>Trigger Gateway:</strong> Captures incoming event payloads via secure webhook endpoints with automated payload validation.',
        '<strong>Stateful Execution:</strong> Dispatches tasks into conditional branches, executing API calls and maintaining execution checkpoints.',
        '<strong>Resilience & Observability:</strong> Logs structured state transitions to handle cold starts and API rate limits cleanly.'
      ],
      repoUrl: 'https://github.com/Special258/Janus'
    },
    hive: {
      title: 'Hive — Community Platform Architecture',
      stack: 'Node.js · Express · MongoDB / PostgreSQL · Render · WebSockets',
      summary: 'Collaborative peer-to-peer knowledge and skill exchange platform built for real-time community interaction.',
      points: [
        '<strong>Skill Matching Algorithm:</strong> Connects learners with community mentors based on proficiency tags and availability windows.',
        '<strong>Real-Time Messaging:</strong> Socket-based collaboration rooms with message persistence and event notifications.',
        '<strong>Production Deployment:</strong> Hosted with containerized microservices on Render with automated environment diagnostics.'
      ],
      repoUrl: 'https://github.com/Special258/Hive'
    }
  };

  const caseLinks = document.querySelectorAll('.project-case-link');
  caseLinks.forEach(function (link) {
    const href = link.getAttribute('href') || '';
    let projectId = null;
    if (href.includes('kairon')) projectId = 'kairon';
    else if (href.includes('janus')) projectId = 'janus';
    else if (href.includes('hive')) projectId = 'hive';

    if (!projectId || !projectDetails[projectId]) return;

    const data = projectDetails[projectId];
    const projectCard = link.closest('.project-card');
    if (!projectCard) return;

    // Turn the link into an in-page interactive architecture viewer button
    link.setAttribute('role', 'button');
    link.setAttribute('aria-expanded', 'false');
    link.innerHTML = 'Explore architecture &amp; technical scope <span aria-hidden="true">↓</span>';

    // Create inline expandable container
    const drawer = document.createElement('div');
    drawer.className = 'project-inline-deepdive';
    drawer.style.display = 'none';
    drawer.style.marginTop = '18px';
    drawer.style.padding = '18px 20px';
    drawer.style.background = 'var(--paper-deep)';
    drawer.style.border = '1px solid var(--line)';
    drawer.style.borderRadius = '4px';
    drawer.style.fontSize = '13px';
    drawer.style.lineHeight = '1.6';

    drawer.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:10px;">' +
        '<div>' +
          '<strong style="font-size:14px;color:var(--ink);display:block;">' + data.title + '</strong>' +
          '<span style="font-family:var(--mono);font-size:11px;color:var(--violet);display:block;margin-top:2px;">' + data.stack + '</span>' +
        '</div>' +
        '<button type="button" class="deepdive-close" style="background:none;border:none;cursor:pointer;font-family:var(--mono);font-size:12px;color:var(--muted);padding:2px 6px;">✕ Close</button>' +
      '</div>' +
      '<p style="margin:0 0 10px;color:var(--ink-soft);">' + data.summary + '</p>' +
      '<ul style="margin:0 0 12px;padding-left:18px;color:var(--ink-soft);">' +
        data.points.map(function (pt) { return '<li style="margin-bottom:6px;">' + pt + '</li>'; }).join('') +
      '</ul>' +
      '<div style="display:flex;gap:12px;align-items:center;padding-top:8px;border-top:1px solid var(--line);">' +
        '<a href="' + data.repoUrl + '" target="_blank" rel="noopener noreferrer" style="font-family:var(--mono);font-size:11px;font-weight:600;color:var(--forest);text-decoration:none;">View on GitHub ↗</a>' +
        '<a href="' + href + '" style="font-family:var(--mono);font-size:11px;color:var(--muted);text-decoration:none;">Open full standalone case study ↗</a>' +
      '</div>';

    const closeBtn = drawer.querySelector('.deepdive-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        drawer.style.display = 'none';
        link.setAttribute('aria-expanded', 'false');
        link.innerHTML = 'Explore architecture &amp; technical scope <span aria-hidden="true">↓</span>';
        link.focus();
      });
    }

    link.addEventListener('click', function (event) {
      // Allow modifier clicks (Ctrl/Cmd) to open the URL in a new tab if desired
      if (event.ctrlKey || event.metaKey || event.shiftKey) return;
      event.preventDefault();

      const isOpen = drawer.style.display !== 'none';
      if (isOpen) {
        drawer.style.display = 'none';
        link.setAttribute('aria-expanded', 'false');
        link.innerHTML = 'Explore architecture &amp; technical scope <span aria-hidden="true">↓</span>';
      } else {
        drawer.style.display = 'block';
        link.setAttribute('aria-expanded', 'true');
        link.innerHTML = 'Hide architecture breakdown <span aria-hidden="true">↑</span>';
        drawer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });

    projectCard.appendChild(drawer);
  });

}());
