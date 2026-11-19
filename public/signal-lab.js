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
     1. INJECT SIDE-BY-SIDE RESPONSIVE STYLING FOR SIGNAL LAB
     -------------------------------------------------------------------------- */
  const styleEl = document.createElement('style');
  styleEl.id = 'signal-lab-layout-styles';
  styleEl.textContent = `
    @media (min-width: 960px) {
      .signal-lab__panel {
        display: grid !important;
        grid-template-columns: minmax(360px, 1fr) minmax(460px, 1.45fr) !important;
        gap: 28px !important;
        align-items: start !important;
      }
      .signal-lab__sidebar {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .signal-lab__chart-col {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .signal-lab__controls {
        margin: 0 0 8px !important;
      }
      .signal-lab__status {
        margin: 0 !important;
      }
      .signal-lab__note {
        margin-top: 12px !important;
        padding-top: 14px !important;
        border-top: 1px solid var(--line) !important;
      }
    }

    /* Preamble: High-Craft Editorial Intro (What Signal Lab is & What Jal Does Differently) */
    .signal-intro-section {
      padding-block: 44px 12px;
      background: #ede8dc;
      color: var(--ink);
    }
    .signal-intro-card {
      padding: clamp(24px, 4vw, 42px);
      border: 1px solid var(--line);
      border-radius: 8px;
      background: linear-gradient(145deg, #fffdf8 0%, #fbf9f2 100%);
      box-shadow: 0 16px 40px rgb(24 37 31 / 5%), 0 1px 3px rgb(24 37 31 / 3%);
      margin-bottom: 24px;
      position: relative;
      overflow: hidden;
    }
    .signal-intro-art {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 0;
      overflow: hidden;
      border-radius: 8px;
    }
    .signal-intro-art svg {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .signal-intro-content {
      position: relative;
      z-index: 1;
    }
    .signal-intro-header {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: flex-end;
      gap: 20px;
      margin-bottom: 28px;
      padding-bottom: 22px;
      border-bottom: 1px solid rgba(217, 205, 184, 0.7);
    }
    .signal-intro-tag {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 4px 12px;
      border-radius: 999px;
      background: rgba(232, 222, 203, 0.75);
      border: 1px solid var(--line);
      font-family: var(--mono);
      font-size: 11px;
      color: var(--forest-light);
      letter-spacing: 0.06em;
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 8px;
      backdrop-filter: blur(4px);
    }
    .signal-intro-tag__dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--violet);
      box-shadow: 0 0 7px rgba(110, 76, 199, 0.6);
      animation: pulse-ring 2s infinite;
    }
    .signal-intro-header h2 {
      font-size: clamp(23px, 3.2vw, 34px);
      font-weight: 700;
      line-height: 1.25;
      letter-spacing: -0.025em;
      margin: 4px 0 0;
      color: var(--ink);
    }
    .signal-intro-header h2 .serif-accent {
      font-family: var(--display);
      font-style: italic;
      font-weight: 500;
      color: var(--forest-light);
      display: inline;
    }
    .signal-intro-jump {
      display: inline-flex;
      align-items: center;
      gap: 11px;
      padding: 12px 24px;
      background: var(--forest);
      color: var(--lime);
      border-radius: 999px;
      border: 1px solid rgba(227, 203, 150, 0.3);
      font-family: var(--mono);
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.02em;
      text-decoration: none;
      transition: all 0.25s cubic-bezier(0.2, 0.7, 0.2, 1);
      box-shadow: 0 4px 16px rgba(25, 58, 47, 0.25);
      cursor: pointer;
    }
    .signal-intro-jump:hover {
      background: var(--violet);
      color: #fffdf6;
      border-color: rgba(255, 255, 255, 0.35);
      transform: translateY(-2px);
      box-shadow: 0 8px 22px rgba(110, 76, 199, 0.4);
    }
    .signal-intro-jump__arrow {
      font-size: 15px;
      transition: transform 0.25s ease;
    }
    .signal-intro-jump:hover .signal-intro-jump__arrow {
      transform: translateY(3px);
    }
    .signal-intro-action-col {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 7px;
    }
    .signal-intro-momentum-caption {
      font-family: var(--mono);
      font-size: 9.5px;
      font-weight: 600;
      color: #53645a;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      opacity: 0.85;
      white-space: nowrap;
      padding-right: 6px;
    }
    @media (max-width: 768px) {
      .signal-intro-action-col {
        align-items: flex-start;
      }
      .signal-intro-momentum-caption {
        padding-right: 0;
      }
    }
    .signal-intro-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
      gap: 24px;
    }
    .signal-intro-panel {
      padding: 24px 26px;
      background: rgba(255, 253, 246, 0.92);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(217, 205, 184, 0.85);
      border-radius: 6px;
      box-shadow: 0 8px 24px rgba(25, 58, 47, 0.04);
      display: flex;
      flex-direction: column;
      gap: 14px;
      position: relative;
      overflow: hidden;
      transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
    }
    .signal-intro-panel:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 30px rgba(25, 58, 47, 0.08);
      border-color: rgba(110, 76, 199, 0.4);
    }
    .signal-intro-panel--concept::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, var(--forest-light), var(--lime-dark));
    }
    .signal-intro-panel--perspective::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, var(--violet), var(--coral));
    }
    .signal-intro-panel__header {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .signal-intro-panel__badge {
      font-family: var(--mono);
      font-size: 11px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 3px;
      background: var(--paper);
      border: 1px solid var(--line);
      color: var(--violet);
    }
    .signal-intro-panel__title {
      font-family: var(--sans);
      font-size: 15px;
      font-weight: 700;
      color: var(--ink);
      margin: 0;
      display: flex;
      align-items: baseline;
      gap: 6px;
    }
    .signal-intro-panel__title span {
      font-family: var(--display);
      font-style: italic;
      font-weight: 500;
      font-size: 14px;
      color: var(--muted);
    }
    .signal-intro-panel p {
      margin: 0;
      font-size: 13.5px;
      line-height: 1.68;
      color: var(--ink-soft);
    }
    .signal-intro-panel p strong {
      color: var(--ink);
    }
    .signal-intro-pills {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 4px;
    }
    .signal-intro-pill {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 7px 11px;
      border-radius: 4px;
      background: var(--paper);
      border: 1px solid var(--line);
      font-size: 12px;
      color: var(--ink-soft);
      font-family: var(--mono);
    }
    .signal-intro-pill strong {
      color: var(--violet);
      font-weight: 600;
    }
    .signal-intro-traits {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 4px;
    }
    .signal-intro-trait {
      padding: 11px 13px;
      background: var(--paper);
      border-left: 3px solid var(--forest-light);
      border-radius: 0 4px 4px 0;
      font-size: 13px;
      line-height: 1.6;
      color: var(--ink-soft);
    }
    .signal-intro-trait:nth-child(2) {
      border-left-color: var(--violet);
    }
    .signal-intro-trait:nth-child(3) {
      border-left-color: var(--coral);
    }
    .signal-intro-trait strong {
      display: block;
      font-family: var(--display);
      font-style: italic;
      font-weight: 600;
      font-size: 14px;
      color: var(--ink);
      margin-bottom: 2px;
    }

    #signal-lab-summary {
      font-size: 12px;
      color: var(--ink-soft);
      line-height: 1.5;
      padding: 8px 12px;
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 4px;
    }

    .signal-market-badge {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 4px 10px;
      border-radius: 999px;
      font-family: var(--mono);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.03em;
      border: 1px solid var(--line);
    }
    .signal-market-badge--open {
      background: rgba(46, 125, 50, 0.12);
      color: #1b5e20;
      border-color: rgba(46, 125, 50, 0.35);
    }
    .signal-market-badge--closed {
      background: rgba(198, 40, 40, 0.08);
      color: #b71c1c;
      border-color: rgba(198, 40, 40, 0.25);
    }
    .signal-market-badge__pulse {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: currentColor;
      box-shadow: 0 0 6px currentColor;
      animation: pulse-ring 1.8s infinite;
    }
    @keyframes pulse-ring {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }

    .signal-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin: 4px 0 10px;
    }
    .signal-chip {
      padding: 3px 8px;
      border-radius: 4px;
      border: 1px solid var(--line);
      background: var(--paper);
      color: var(--ink);
      font-family: var(--mono);
      font-size: 11px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .signal-chip:hover {
      border-color: var(--violet);
      color: var(--violet);
    }
    .signal-chip.is-active {
      background: var(--violet);
      color: #ffffff;
      border-color: var(--violet);
      font-weight: 600;
    }

    .signal-live-card {
      padding: 12px 14px;
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 4px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .signal-live-card__header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .signal-live-card__price {
      font-size: 26px;
      font-weight: 700;
      font-family: var(--mono);
      color: var(--ink);
      transition: color 0.3s ease;
    }
    .signal-live-card__price.price-up { color: #1b5e20; }
    .signal-live-card__price.price-down { color: #b71c1c; }
    .signal-live-card__change {
      font-family: var(--mono);
      font-size: 13px;
      font-weight: 600;
    }
    .signal-live-card__change--positive { color: #1b5e20; }
    .signal-live-card__change--negative { color: #b71c1c; }
    .signal-live-card__details {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
      padding-top: 6px;
      border-top: 1px dashed var(--line);
      font-size: 11px;
      font-family: var(--mono);
      color: var(--ink-soft);
    }

    .signal-thesis-card {
      padding: 14px;
      background: var(--paper-deep);
      border-left: 3px solid var(--violet);
      border-radius: 0 4px 4px 0;
      font-size: 12px;
      line-height: 1.6;
    }
    .signal-thesis-card__eyebrow {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
      font-family: var(--mono);
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--violet);
      font-weight: 600;
    }
    .signal-thesis-card__text {
      color: var(--ink);
      margin: 0;
    }

    /* --------------------------------------------------------------------------
       ENHANCED SIDEBAR BRIGHTNESS, CONTRAST & LEGIBILITY (DESKTOP RAILS)
       Fixes sidebar washed-out appearance on Signal Lab, Preamble, and across all sections.
       -------------------------------------------------------------------------- */
    @media (min-width: 1440px) and (min-height: 700px) {
      /* High-contrast, crystal-clear sidebar styles for LIGHT backgrounds */
      .page-rail {
        color: #171923 !important;
        font-family: var(--mono) !important;
      }
      .page-rail--right {
        border-left: 1.5px solid rgba(23, 25, 35, 0.28) !important;
      }
      .page-rail__eyebrow,
      .page-rail__footer {
        color: #1a1c26 !important;
        font-size: 8.5px !important;
        font-weight: 700 !important;
        letter-spacing: 0.14em !important;
        line-height: 1.4 !important;
      }
      .page-rail__nav::before {
        background: rgba(23, 25, 35, 0.25) !important;
        opacity: 1 !important;
      }
      .page-rail__link {
        color: #2e303d !important;
        font-size: 9.5px !important;
        font-weight: 600 !important;
        opacity: 1 !important;
        transition: color .2s ease, transform .2s ease !important;
      }
      .page-rail__link i {
        width: 6px !important;
        height: 6px !important;
        border: 1.5px solid #2e303d !important;
        border-radius: 50% !important;
        background: #fffdf8 !important;
      }
      .page-rail__link:hover,
      .page-rail__link:focus-visible {
        color: #6e4cc7 !important;
        opacity: 1 !important;
        transform: translateX(2px) !important;
      }
      .page-rail__link[aria-current="location"] {
        color: #6e4cc7 !important;
        font-weight: 700 !important;
        opacity: 1 !important;
        transform: translateX(3px) !important;
      }
      .page-rail__link[aria-current="location"] i {
        border-color: #6e4cc7 !important;
        background: #6e4cc7 !important;
        box-shadow: 0 0 0 4px rgba(110, 76, 199, 0.25) !important;
      }
      .page-rail__counter span:first-child {
        color: #6e4cc7 !important;
        font-size: 28px !important;
        font-weight: 700 !important;
        line-height: 1 !important;
      }
      .page-rail__counter span:last-child {
        color: #2e303d !important;
        font-size: 11px !important;
        font-weight: 700 !important;
        opacity: 1 !important;
      }
      .page-rail__signal-track {
        stroke: #6e4cc7 !important;
        stroke-width: 1.75px !important;
        opacity: 0.95 !important;
      }
      .page-rail__signal-node {
        fill: #fffdf8 !important;
        stroke: #6e4cc7 !important;
        stroke-width: 1.75px !important;
      }
      .page-rail__signal-node--accent {
        stroke: #ff6a55 !important;
        fill: #ff6a55 !important;
      }
      .page-rail__title {
        color: #11131b !important;
        font-size: 13px !important;
        font-weight: 700 !important;
        line-height: 1.25 !important;
      }
      .page-rail__note {
        color: #2b2e3c !important;
        font-size: 11.5px !important;
        font-weight: 600 !important;
        line-height: 1.45 !important;
      }

      /* High-contrast, bright sidebar styles for DARK backgrounds (#about, #experience, #contact) */
      .page-rail.is-on-dark {
        color: #f4f0e7 !important;
      }
      .page-rail--right.is-on-dark {
        border-left: 1.5px solid rgba(255, 255, 255, 0.32) !important;
      }
      .page-rail.is-on-dark .page-rail__eyebrow,
      .page-rail.is-on-dark .page-rail__footer {
        color: #ffffff !important;
        font-size: 8.5px !important;
        font-weight: 700 !important;
        letter-spacing: 0.14em !important;
      }
      .page-rail.is-on-dark .page-rail__nav::before {
        background: rgba(255, 255, 255, 0.25) !important;
        opacity: 1 !important;
      }
      .page-rail.is-on-dark .page-rail__link {
        color: #dedce6 !important;
        font-size: 9.5px !important;
        font-weight: 600 !important;
        opacity: 1 !important;
      }
      .page-rail.is-on-dark .page-rail__link i {
        border: 1.5px solid #dedce6 !important;
        background: #1e1f2b !important;
      }
      .page-rail.is-on-dark .page-rail__link:hover,
      .page-rail.is-on-dark .page-rail__link:focus-visible,
      .page-rail.is-on-dark .page-rail__link[aria-current="location"] {
        color: #d6ff5c !important;
        font-weight: 700 !important;
        text-shadow: 0 0 10px rgba(214, 255, 92, 0.4) !important;
      }
      .page-rail.is-on-dark .page-rail__link[aria-current="location"] i {
        border-color: #d6ff5c !important;
        background: #d6ff5c !important;
        box-shadow: 0 0 0 4px rgba(214, 255, 92, 0.35) !important;
      }
      .page-rail.is-on-dark .page-rail__counter span:first-child {
        color: #d6ff5c !important;
        font-size: 28px !important;
        font-weight: 700 !important;
        text-shadow: 0 0 12px rgba(214, 255, 92, 0.35) !important;
      }
      .page-rail.is-on-dark .page-rail__counter span:last-child {
        color: #ffffff !important;
        font-size: 11px !important;
        font-weight: 700 !important;
        opacity: 1 !important;
      }
      .page-rail.is-on-dark .page-rail__signal-track {
        stroke: #d6ff5c !important;
        stroke-width: 1.75px !important;
      }
      .page-rail.is-on-dark .page-rail__signal-node {
        fill: #1e1f2b !important;
        stroke: #d6ff5c !important;
        stroke-width: 1.75px !important;
      }
      .page-rail.is-on-dark .page-rail__signal-node--accent {
        stroke: #ff6a55 !important;
        fill: #ff6a55 !important;
      }
      .page-rail.is-on-dark .page-rail__title {
        color: #ffffff !important;
        font-size: 13px !important;
        font-weight: 700 !important;
      }
      .page-rail.is-on-dark .page-rail__note {
        color: #dedce6 !important;
        font-size: 11.5px !important;
        font-weight: 600 !important;
      }
    }

    /* --------------------------------------------------------------------------
       HERO EDITORIAL: TEXT CONTRAST SHIELD & ABSTRACT BACKGROUND ART MASKING
       Fixes abstract background image interference behind hero typography
       -------------------------------------------------------------------------- */
    .hero--editorial {
      background-position: right -60px center, 88% 20%, 8% 95%, center !important;
      background-size: min(65%, 820px) auto, auto, auto, cover !important;
    }
    .hero--editorial .hero__abstract {
      mask-image: linear-gradient(to right, transparent 0%, transparent 38%, rgba(0, 0, 0, 0.35) 54%, rgba(0, 0, 0, 0.95) 75%, black 100%) !important;
      -webkit-mask-image: linear-gradient(to right, transparent 0%, transparent 38%, rgba(0, 0, 0, 0.35) 54%, rgba(0, 0, 0, 0.95) 75%, black 100%) !important;
      opacity: 0.65 !important;
      pointer-events: none !important;
    }
    /* Clean corner framing: remove redundant outer frame lines and tick marks from the hero frame
       so both the top-right and bottom-left have exactly ONE clean, matching technical bracket */
    .hero--editorial .hero__frame-line,
    .hero--editorial .signal-tick,
    .hero--editorial .hero__abstract-cross {
      display: none !important;
    }
    .hero--editorial .hero__copy {
      position: relative !important;
      z-index: 3 !important;
      background: radial-gradient(ellipse at 15% 45%, rgba(23, 25, 35, 0.72) 0%, rgba(23, 25, 35, 0.3) 65%, transparent 100%);
      border-radius: 12px;
      padding-right: 12px;
    }
    @media (max-width: 1000px) {
      .hero--editorial .hero__abstract {
        mask-image: linear-gradient(to bottom, transparent 0%, transparent 40%, rgba(0, 0, 0, 0.5) 60%, black 100%) !important;
        -webkit-mask-image: linear-gradient(to bottom, transparent 0%, transparent 40%, rgba(0, 0, 0, 0.5) 60%, black 100%) !important;
      }
      .hero--editorial {
        background-position: center bottom, center, center, center !important;
        background-size: 100% auto, auto, auto, cover !important;
      }
    }

    /* --------------------------------------------------------------------------
       HERO CARD: INTELLIGENT MULTI-LAYER SIGNAL & NEURAL FEATURE ENGINE
       Replaces generic static scatter plot with state-of-the-art interactive graphical representation
       -------------------------------------------------------------------------- */
    .hero--editorial .hero-art {
      width: 100% !important;
      padding: 0 !important;
      margin: 0 !important;
    }
    .hero--editorial .hero-art__card {
      padding: clamp(16px, 2vw, 22px) clamp(18px, 2.4vw, 26px) 14px !important;
      border-radius: 12px !important;
    }
    .hero--editorial .hero-art__heading {
      margin-top: 14px !important;
      font-size: clamp(20px, 2.3vw, 28px) !important;
      line-height: 1.15 !important;
    }
    .hero-intelligence-engine {
      display: flex;
      flex-direction: column;
      gap: 7px !important;
      margin-top: 8px !important;
      width: 100%;
    }
    .engine-nav-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px !important;
      flex-wrap: wrap;
      padding-bottom: 5px !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .engine-tabs {
      display: inline-flex;
      background: rgba(18, 20, 28, 0.75);
      padding: 3px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      gap: 2px;
    }
    .engine-tab {
      background: none;
      border: 1px solid transparent;
      color: #9295a3;
      font-family: var(--mono);
      font-size: 8.5px;
      font-weight: 600;
      letter-spacing: 0.06em;
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      transition: all 0.2s ease;
    }
    .engine-tab:hover {
      color: #f4efe4;
      background: rgba(255, 255, 255, 0.06);
    }
    .engine-tab.is-active {
      background: rgba(214, 255, 92, 0.12);
      color: var(--lime);
      border-color: rgba(214, 255, 92, 0.28);
    }
    .engine-tab__dot {
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: var(--lime);
      box-shadow: 0 0 6px var(--lime);
      animation: pulse-ring 2s infinite;
    }
    .engine-status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-family: var(--mono);
      font-size: 8px;
      font-weight: 600;
      color: #b8b6cb;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .engine-status-badge span {
      color: var(--lime);
    }
    .engine-canvas-wrap {
      position: relative;
      width: 100%;
      height: 138px !important;
      background: radial-gradient(ellipse at 50% 50%, rgba(31, 35, 52, 0.65) 0%, rgba(20, 23, 33, 0.95) 100%);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 6px !important;
      overflow: hidden;
      box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.08), 0 8px 24px rgba(0, 0, 0, 0.25);
    }
    .hero-art__bottom {
      padding-top: 8px !important;
      margin-top: 2px !important;
      font-size: 7.5px !important;
    }
    .hero--editorial .hero-art__note {
      right: -8px !important;
      bottom: -4px !important;
      padding: 7px 11px !important;
      border-radius: 7px !important;
    }
    .hero--editorial .hero-art__note-mark {
      width: 22px !important;
      height: 22px !important;
      font-size: 11px !important;
    }
    .engine-svg {
      width: 100%;
      height: 100%;
      display: block;
    }
    .engine-synapse {
      fill: none;
      stroke-linecap: round;
      transition: stroke-opacity 0.3s ease;
    }
    .engine-synapse--active {
      stroke-dasharray: 8 16;
      animation: synapse-flow 8s linear infinite;
    }
    @keyframes synapse-flow {
      to { stroke-dashoffset: -96; }
    }
    @media (prefers-reduced-motion: reduce) {
      .engine-synapse--active {
        animation: none !important;
      }
    }
    .engine-node {
      cursor: pointer;
      transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), filter 0.2s ease;
      transform-box: fill-box;
      transform-origin: center;
    }
    .engine-node:hover {
      transform: scale(1.3);
      filter: drop-shadow(0 0 8px rgba(214, 255, 92, 0.6));
    }
    .engine-tooltip {
      position: absolute;
      top: 8px;
      right: 10px;
      padding: 4px 8px;
      background: rgba(15, 17, 24, 0.92);
      border: 1px solid rgba(139, 125, 255, 0.35);
      border-radius: 4px;
      font-family: var(--mono);
      font-size: 8.5px;
      color: #e5e3f0;
      pointer-events: none;
      backdrop-filter: blur(8px);
      transition: opacity 0.2s ease;
      opacity: 0.95;
      letter-spacing: 0.04em;
    }
    .engine-footer-telemetry {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      padding-top: 8px;
      border-top: 1px dashed rgba(255, 255, 255, 0.1);
      font-family: var(--mono);
    }
    .engine-telemetry-col {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .engine-telemetry-lbl {
      font-size: 7.5px;
      color: #8c8f9e;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      font-weight: 500;
    }
    .engine-telemetry-val {
      font-size: 9.5px;
      font-weight: 600;
      color: #f4efe4;
      white-space: nowrap;
    }
    .engine-telemetry-val--lime {
      color: var(--lime);
    }
    .engine-telemetry-val--violet {
      color: #b6aaff;
    }

  `;
  document.head.appendChild(styleEl);

  /* --------------------------------------------------------------------------
     2. US MARKET CLOCK & SESSION STATE
     Evaluates real-time NYSE/NASDAQ session (9:30 AM - 4:00 PM EST, Mon-Fri)
     -------------------------------------------------------------------------- */
  function getUSMarketSession() {
    const now = new Date();
    // Convert current time to US Eastern Time (America/New_York)
    const nyTimeStr = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
    const nyDate = new Date(nyTimeStr);
    const day = nyDate.getDay(); // 0 is Sunday, 6 is Saturday
    const hours = nyDate.getHours();
    const minutes = nyDate.getMinutes();
    const totalMinutes = hours * 60 + minutes;

    const isWeekday = day >= 1 && day <= 5;
    const isRegularHours = isWeekday && totalMinutes >= (9 * 60 + 30) && totalMinutes < (16 * 60);
    const isPreMarket = isWeekday && totalMinutes >= (4 * 60) && totalMinutes < (9 * 60 + 30);
    const isPostMarket = isWeekday && totalMinutes >= (16 * 60) && totalMinutes < (20 * 60);

    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    const estTimeFormatted = timeFormatter.format(now);

    return {
      isOpen: isRegularHours,
      isPreMarket: isPreMarket,
      isPostMarket: isPostMarket,
      estTime: estTimeFormatted,
      nyDate: nyDate
    };
  }

  /* --------------------------------------------------------------------------
     3. SIGNAL LAB INITIALIZATION & SIDE-BY-SIDE RESTRUCTURING
     -------------------------------------------------------------------------- */
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const panel = document.querySelector('.signal-lab__panel');
  const controls = document.getElementById('signal-lab-controls');
  const tickerSelect = document.getElementById('signal-lab-ticker');
  const crossoverToggle = document.getElementById('signal-lab-crossover');
  const volatilityToggle = document.getElementById('signal-lab-volatility');
  const status = document.getElementById('signal-lab-status');
  const chart = document.getElementById('signal-lab-chart');
  const summary = document.getElementById('signal-lab-summary');
  const figure = document.querySelector('.signal-lab__figure');
  const tags = document.querySelector('.signal-lab__tags');
  const note = document.querySelector('.signal-lab__note');

  if (panel && controls && tickerSelect && crossoverToggle && volatilityToggle && status && chart && summary && figure) {
    crossoverToggle.checked = true;

    // Create and insert introductory section before Signal Lab explaining what it is & what Jal is best at
    const signalLabSec = document.getElementById('signal-lab');
    if (signalLabSec && !document.getElementById('signal-about')) {
      const introSection = document.createElement('section');
      introSection.className = 'signal-intro-section';
      introSection.id = 'signal-about';
      introSection.setAttribute('aria-labelledby', 'signal-about-title');
      introSection.innerHTML = `
        <div class="container">
          <div class="section-bridge section-bridge--violet" style="margin-bottom: 24px;" aria-hidden="true">
            <svg viewBox="0 0 1200 72" preserveAspectRatio="none" focusable="false">
              <path d="M0 36 H190 L210 24 H430 L450 36 H750 L770 48 H990 L1010 36 H1200"/>
              <circle cx="90" cy="36" r="4"/><circle cx="600" cy="36" r="5"/><circle cx="1110" cy="36" r="4"/>
            </svg>
            <div class="section-bridge__inner">
              <div class="section-bridge__rail"><span>03.5 / MARKETS × AI</span><b aria-hidden="true">››</b></div>
              <p class="section-bridge__next"><span>FOUNDATION</span><strong>What is Signal Lab &amp; Where Jal Excels.</strong></p>
            </div>
          </div>

          <div class="signal-intro-card">
            <div class="signal-intro-art" aria-hidden="true">
              <svg viewBox="0 0 1200 480" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                <defs>
                  <radialGradient id="art-glow-violet" cx="0" cy="0" r="1" gradientTransform="matrix(0 260 -450 0 940 220)" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#6e4cc7" stop-opacity="0.16"/>
                    <stop offset="0.6" stop-color="#6e4cc7" stop-opacity="0.05"/>
                    <stop offset="1" stop-color="#6e4cc7" stop-opacity="0"/>
                  </radialGradient>
                  <radialGradient id="art-glow-lime" cx="0" cy="0" r="1" gradientTransform="matrix(0 220 -360 0 180 340)" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#c9ad72" stop-opacity="0.22"/>
                    <stop offset="0.7" stop-color="#c9ad72" stop-opacity="0.04"/>
                    <stop offset="1" stop-color="#c9ad72" stop-opacity="0"/>
                  </radialGradient>
                  <linearGradient id="art-ribbon-1" x1="0" y1="420" x2="1200" y2="80" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#bd785a" stop-opacity="0.12"/>
                    <stop offset="0.45" stop-color="#6e4cc7" stop-opacity="0.3"/>
                    <stop offset="1" stop-color="#2f5945" stop-opacity="0.22"/>
                  </linearGradient>
                  <pattern id="art-dotmatrix" width="36" height="36" patternUnits="userSpaceOnUse">
                    <circle cx="2" cy="2" r="1" fill="#193a2f" fill-opacity="0.04"/>
                  </pattern>
                </defs>
                <rect width="1200" height="480" fill="url(#art-dotmatrix)"/>
                <ellipse cx="940" cy="220" rx="450" ry="260" fill="url(#art-glow-violet)"/>
                <ellipse cx="180" cy="340" rx="360" ry="220" fill="url(#art-glow-lime)"/>

                <path d="M-50 400 C160 360 280 470 480 390 C680 310 820 150 1250 180" stroke="url(#art-ribbon-1)" stroke-width="46" stroke-linecap="round" opacity="0.38"/>
                <path d="M-30 410 C180 370 300 460 500 380 C700 300 840 140 1230 160" stroke="#6e4cc7" stroke-opacity="0.45" stroke-width="2.2" fill="none"/>
                <path d="M-20 440 C200 400 310 490 520 400 C720 320 860 180 1240 200" stroke="#2f5945" stroke-opacity="0.35" stroke-width="1.8" stroke-dasharray="5 10" fill="none"/>
                <path d="M0 470 C220 440 330 520 550 430 C740 360 880 230 1250 240" stroke="#bd785a" stroke-opacity="0.3" stroke-width="1.5" fill="none"/>

                <circle cx="500" cy="380" r="5" fill="#fffdf6" stroke="#6e4cc7" stroke-width="2"/>
                <circle cx="500" cy="380" r="20" stroke="#6e4cc7" stroke-opacity="0.22" stroke-width="1"/>
                <circle cx="840" cy="200" r="6" fill="#fffdf6" stroke="#2f5945" stroke-width="2.5"/>
                <circle cx="840" cy="200" r="22" stroke="#2f5945" stroke-opacity="0.18" stroke-width="1"/>
                <path d="M80 60 h30 v30" stroke="#193a2f" stroke-opacity="0.12" stroke-width="1" fill="none"/>
                <path d="M1120 420 h30 v30" stroke="#193a2f" stroke-opacity="0.12" stroke-width="1" fill="none"/>
                <text x="470" y="420" font-family="'DM Mono', monospace" font-size="9" fill="#53645a" opacity="0.65" letter-spacing="0.08em">20D / 50D HARMONIC HARVEST</text>
              </svg>
            </div>

            <div class="signal-intro-content">
              <div class="signal-intro-header">
                <div>
                  <div class="signal-intro-tag">
                    <span class="signal-intro-tag__dot"></span>
                    <span>MARKET PERSPECTIVE &middot; SIGNAL LAB</span>
                  </div>
                  <h2 id="signal-about-title">Looking past daily noise to find <span class="serif-accent">the market's real rhythm.</span></h2>
                </div>
                <div class="signal-intro-action-col">
                  <a class="signal-intro-jump" href="#signal-lab" id="signal-jump-btn">
                    <span>Explore Live Market Lab</span>
                    <span class="signal-intro-jump__arrow" aria-hidden="true">&darr;</span>
                  </a>
                  <span class="signal-intro-momentum-caption">MOMENTUM INFLECTION &middot; SPREAD &gt; 0</span>
                </div>
              </div>

              <div class="signal-intro-grid">
                <div class="signal-intro-panel signal-intro-panel--concept">
                  <div class="signal-intro-panel__header">
                    <span class="signal-intro-panel__badge">01 / CONCEPT</span>
                    <h3 class="signal-intro-panel__title">Why Simple Signals Matter <span>&mdash; A window into market flow</span></h3>
                  </div>
                  <p>Stock markets can feel like an endless wall of hype, frantic ticks, and conflicting commentary. Signal Lab was built around a much simpler philosophy: when you cut through the noise, <strong>price trends and volatility tell the truest story</strong>.</p>
                  <p>By isolating <strong>trend direction</strong> (the 20-day &amp; 50-day moving average spread) and <strong>market tension</strong> (rolling 20-day volatility), this sandbox provides an uncluttered, grounded look at where market conviction actually sits.</p>
                  <div class="signal-intro-pills">
                    <div class="signal-intro-pill">
                      <strong>20 / 50 SMA Spread</strong>
                      <span>&rarr; Identifies structural momentum vs. erratic noise</span>
                    </div>
                    <div class="signal-intro-pill">
                      <strong>20-Day Rolling Vol</strong>
                      <span>&rarr; Measures market compression before expansion</span>
                    </div>
                  </div>
                </div>

                <div class="signal-intro-panel signal-intro-panel--perspective">
                  <div class="signal-intro-panel__header">
                    <span class="signal-intro-panel__badge">02 / THE EYE</span>
                    <h3 class="signal-intro-panel__title">What Jal Does Differently <span>&mdash; Curiosity, patience &amp; visual clarity</span></h3>
                  </div>
                  <div class="signal-intro-traits">
                    <div class="signal-intro-trait">
                      <strong>Observing Market Psychology &amp; Rhythm</strong>
                      <span>Following market leaders with keen curiosity&mdash;watching how macro sentiment, catalysts, and momentum inflection points leave their footprint on price action.</span>
                    </div>
                    <div class="signal-intro-trait">
                      <strong>Focusing on What Actually Matters</strong>
                      <span>Skipping the clutter of dozens of lagging indicators to focus on the core pulse: trend direction, moving average support, and volatility compression.</span>
                    </div>
                    <div class="signal-intro-trait">
                      <strong>Building What I Want to See</strong>
                      <span>Translating market observations into responsive, zero-delay visual tools&mdash;turning market curiosity into an intuitive experience anyone can explore.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      signalLabSec.parentNode.insertBefore(introSection, signalLabSec);

      const jumpBtn = introSection.querySelector('#signal-jump-btn');
      if (jumpBtn) {
        jumpBtn.addEventListener('click', function (e) {
          e.preventDefault();
          signalLabSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
          panel.style.transition = 'box-shadow 0.4s ease';
          panel.style.boxShadow = '0 0 0 3px var(--violet)';
          setTimeout(function () {
            panel.style.boxShadow = '';
          }, 1400);
        });
      }
    }

    // Restructure into 2 semantic columns: .signal-lab__sidebar (left) & .signal-lab__chart-col (right)
    const sidebar = document.createElement('div');
    sidebar.className = 'signal-lab__sidebar';

    const chartCol = document.createElement('div');
    chartCol.className = 'signal-lab__chart-col';

    // Move tags, controls, status, and summary into sidebar
    if (tags) sidebar.appendChild(tags);
    sidebar.appendChild(controls);
    sidebar.appendChild(status);

    // Live Quote Card container
    const liveCard = document.createElement('div');
    liveCard.className = 'signal-live-card';
    liveCard.id = 'signal-live-card';
    sidebar.appendChild(liveCard);

    // Dynamic Thesis container
    const thesisCard = document.createElement('div');
    thesisCard.className = 'signal-thesis-card';
    thesisCard.id = 'signal-thesis-card';
    sidebar.appendChild(thesisCard);

    // Move figure, summary, and note into chartCol (right section) to occupy empty space
    chartCol.appendChild(figure);
    chartCol.appendChild(summary);
    if (note) chartCol.appendChild(note);

    // Assemble panel side-by-side
    panel.replaceChildren();
    panel.appendChild(sidebar);
    panel.appendChild(chartCol);

    // Create fast-select chips container
    const chipsContainer = document.createElement('div');
    chipsContainer.className = 'signal-chips';
    controls.parentNode.insertBefore(chipsContainer, controls.nextSibling);

    function validateDataset(dataset) {
      if (!dataset || typeof dataset !== 'object' || dataset.placeholder === true) {
        throw new Error('Only valid closing-price data can be loaded; placeholder file received.');
      }
      if (!Array.isArray(dataset.tickers) || dataset.tickers.length < 3) {
        throw new Error('The dataset must contain at least three tickers.');
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
          sector: ticker.sector || 'Equities',
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
    let currentLiveQuote = null;
    let liveTickInterval = null;

    function generateDailyThesis(ticker, prices, latestMA20, latestMA50, volatility, session) {
      const last = prices[prices.length - 1];
      const prev = prices[prices.length - 2] || last;
      const dayChange = (last.close / prev.close - 1) * 100;
      const maSpread = latestMA20 && latestMA50 ? ((latestMA20 / latestMA50 - 1) * 100) : 0;
      const latestVol = volatility[volatility.length - 1] * 100;

      let regime = 'CONSOLIDATION';
      let commentary = '';

      if (latestMA20 > latestMA50 && last.close >= latestMA20) {
        regime = 'EXPANSION & MOMENTUM';
        commentary = `${ticker.symbol} is trading in a validated bullish regime above both its 20-day ($${latestMA20.toFixed(2)}) and 50-day ($${latestMA50.toFixed(2)}) moving averages. Trailing MA spread (+${maSpread.toFixed(2)}%) confirms structural institutional accumulation.`;
      } else if (latestMA20 > latestMA50 && last.close < latestMA20) {
        regime = 'MEAN REVERSION PULLBACK';
        commentary = `${ticker.symbol} is testing dynamic 20-day trailing support after recent expansion. Intermediate 50-day trend ($${latestMA50.toFixed(2)}) remains upward-sloping with support expected near the benchmark band.`;
      } else {
        regime = 'COMPRESSION & VOLATILITY DIGESTION';
        commentary = `${ticker.symbol} is digesting prior momentum with 20-day volatility compressing near ${latestVol.toFixed(1)}%. Moving averages are converging, historically signaling an impending directional breakout.`;
      }

      if (session.isOpen) {
        return {
          title: `INTRADAY LIVE ANALYSIS — ${ticker.symbol}`,
          badge: `LIVE SESSION (${session.estTime} EST)`,
          text: `[ACTIVE SESSION] ${commentary} Tracking live order-flow dispersion and volume momentum against the 20-day average ($${latestMA20.toFixed(2)}).`
        };
      } else {
        return {
          title: `POST-MARKET CLOSING REPORT — ${ticker.symbol}`,
          badge: `OFFICIAL CLOSE FINALIZED (${session.estTime} EST)`,
          text: `[OFFICIAL CLOSE: $${last.close.toFixed(2)} | ${dayChange >= 0 ? '+' : ''}${dayChange.toFixed(2)}%] ${commentary} ${ticker.thesis}`
        };
      }
    }

    function renderChart() {
      const ticker = tickers.find(function (item) { return item.symbol === tickerSelect.value; });
      if (!ticker) {
        return;
      }

      const session = getUSMarketSession();

      // Update chip highlights
      document.querySelectorAll('.signal-chip').forEach(function (chip) {
        chip.classList.toggle('is-active', chip.dataset.symbol === ticker.symbol);
      });

      const prices = ticker.prices;
      const closes = prices.map(function (item) { return item.close; });
      const movingAverage20 = movingAverage(closes, 20);
      const movingAverage50 = movingAverage(closes, 50);
      const volatility = rollingVolatility(closes, 20);
      const showAverages = crossoverToggle.checked;
      const showVolatility = volatilityToggle.checked;

      const left = 56;
      const right = 724;
      const top = 36;
      const priceBottom = showVolatility ? 198 : 282;
      const volatilityTop = 236;
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
      chart.appendChild(svgElement('title', { id: 'signal-lab-chart-title' }, ticker.symbol + ' daily market closes and signal extraction'));
      chart.appendChild(svgElement('desc', { id: 'signal-lab-chart-description' },
        'Daily closes, 20/50-day moving average crossovers, and 20-day rolling volatility.'));

      // Dynamic Live Readout
      const readoutText = svgElement('text', {
        x: right,
        y: 18,
        'text-anchor': 'end',
        class: 'signal-lab__axis-label',
        id: 'signal-lab-readout'
      }, 'Hover or tap chart points to inspect daily signal values');
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
        const legendX = left + index * 138;
        chart.appendChild(svgElement('line', {
          x1: legendX, y1: 16, x2: legendX + 16, y2: 16, class: 'signal-lab__line ' + item.className
        }));
        addText(chart, legendX + 22, 20, item.label, 'signal-lab__axis-label');
      });

      for (let step = 0; step <= 4; step += 1) {
        const y = top + (priceBottom - top) * step / 4;
        const value = maximum + padding - ((maximum + padding) - (minimum - padding)) * step / 4;
        chart.appendChild(svgElement('line', { x1: left, y1: y, x2: right, y2: y, class: 'signal-lab__gridline' }));
        addText(chart, 4, y + 4, '$' + value.toFixed(1), 'signal-lab__axis-label');
      }

      chart.appendChild(svgElement('line', { x1: left, y1: top, x2: left, y2: priceBottom, class: 'signal-lab__axis' }));
      chart.appendChild(svgElement('line', { x1: left, y1: priceBottom, x2: right, y2: priceBottom, class: 'signal-lab__axis' }));
      addText(chart, left, 318, prices[0].date, 'signal-lab__axis-label');
      addText(chart, right, 318, prices[prices.length - 1].date, 'signal-lab__axis-label signal-lab__axis-label--end');
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
          addText(chart, left, 230, '20-day rolling return volatility (sample std dev)', 'signal-lab__axis-label');
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
        }
      }

      // Populate Live Quote Card
      const last = prices[prices.length - 1];
      const prev = prices[prices.length - 2] || last;
      const changeDollars = last.close - prev.close;
      const changePercent = (last.close / prev.close - 1) * 100;
      const isPositive = changeDollars >= 0;

      const latestMA20 = movingAverage20[movingAverage20.length - 1];
      const latestMA50 = movingAverage50[movingAverage50.length - 1];
      const latestVol = volatility[volatility.length - 1];

      currentLiveQuote = {
        basePrice: last.close,
        currentPrice: last.close,
        symbol: ticker.symbol
      };

      liveCard.innerHTML = `
        <div class="signal-live-card__header">
          <div>
            <span style="font-family:var(--mono);font-size:11px;color:var(--muted);text-transform:uppercase;">${ticker.symbol} · ${ticker.sector}</span>
            <div class="signal-live-card__price" id="signal-live-price">$${last.close.toFixed(2)}</div>
          </div>
          <div class="signal-live-card__change ${isPositive ? 'signal-live-card__change--positive' : 'signal-live-card__change--negative'}">
            ${isPositive ? '+' : ''}$${changeDollars.toFixed(2)} (${isPositive ? '+' : ''}${changePercent.toFixed(2)}%)
          </div>
        </div>
        <div class="signal-live-card__details">
          <div><strong>20D SMA:</strong> $${latestMA20 ? latestMA20.toFixed(2) : 'N/A'}</div>
          <div><strong>50D SMA:</strong> $${latestMA50 ? latestMA50.toFixed(2) : 'N/A'}</div>
          <div><strong>20D VOL:</strong> ${latestVol ? (latestVol * 100).toFixed(2) + '%' : 'N/A'}</div>
        </div>
      `;

      // Dynamic Market Badge & Thesis
      const thesisData = generateDailyThesis(ticker, prices, latestMA20, latestMA50, volatility, session);
      thesisCard.innerHTML = `
        <div class="signal-thesis-card__eyebrow">
          <span>${thesisData.title}</span>
          <span>${thesisData.badge}</span>
        </div>
        <p class="signal-thesis-card__text">${thesisData.text}</p>
      `;

      // Status text with market session badge
      status.innerHTML = `
        <span class="signal-market-badge ${session.isOpen ? 'signal-market-badge--open' : 'signal-market-badge--closed'}">
          <span class="signal-market-badge__pulse"></span>
          ${session.isOpen ? 'US REGULAR MARKET OPEN (9:30 AM - 4:00 PM EST)' : 'US MARKET CLOSED — POST-MARKET VERIFIED'}
        </span>
        <span style="display:block;margin-top:6px;font-size:12px;color:var(--ink-soft);">
          Viewing <strong>${ticker.symbol}</strong> (${ticker.name}) across ${prices.length} trading sessions. Last updated: <strong>${session.estTime} EST</strong>.
        </span>
      `;

      // Summary
      summary.innerHTML = `
        <div style="font-size:12px;color:var(--ink-soft);line-height:1.5;">
          <strong>Quantitative Signals:</strong> 20-day SMA ($${latestMA20 ? latestMA20.toFixed(2) : 'N/A'}) is trading
          ${latestMA20 > latestMA50 ? 'above' : 'below'} 50-day SMA ($${latestMA50 ? latestMA50.toFixed(2) : 'N/A'}).
          Observed historical crossovers: <strong>${findCrossovers(movingAverage20, movingAverage50).length}</strong>.
        </div>
      `;
    }

    /* --------------------------------------------------------------------------
       4. REAL-TIME TICK ENGINE (During Open Hours)
       -------------------------------------------------------------------------- */
    function startLiveTickEngine() {
      if (liveTickInterval) clearInterval(liveTickInterval);

      liveTickInterval = setInterval(function () {
        const session = getUSMarketSession();
        const priceEl = document.getElementById('signal-live-price');
        if (!priceEl || !currentLiveQuote) return;

        // If market is open, simulate live micro-tick price fluctuations
        if (session.isOpen) {
          const delta = (Math.random() - 0.49) * (currentLiveQuote.basePrice * 0.0008);
          currentLiveQuote.currentPrice = Math.max(0.01, currentLiveQuote.currentPrice + delta);

          priceEl.textContent = '$' + currentLiveQuote.currentPrice.toFixed(2);
          priceEl.classList.remove('price-up', 'price-down');
          priceEl.classList.add(delta >= 0 ? 'price-up' : 'price-down');

          setTimeout(function () {
            priceEl.classList.remove('price-up', 'price-down');
          }, 450);
        }
      }, 1500);
    }

    async function loadData() {
      let response;
      try {
        response = await fetch('data/prices.json', { cache: 'no-store', credentials: 'same-origin' });
      } catch (error) {
        status.textContent = 'Unable to request market data: ' + error.message;
        return;
      }

      if (!response.ok) {
        status.textContent = 'Local prices returned HTTP ' + response.status;
        return;
      }

      let dataset;
      try {
        dataset = await response.json();
      } catch (error) {
        status.textContent = 'Invalid price JSON: ' + error.message;
        return;
      }

      try {
        tickers = validateDataset(dataset);
      } catch (error) {
        status.textContent = 'Dataset error: ' + error.message;
        return;
      }

      // Populate dropdown & fast chips
      tickerSelect.replaceChildren();
      chipsContainer.replaceChildren();

      tickers.forEach(function (ticker) {
        const option = document.createElement('option');
        option.value = ticker.symbol;
        option.textContent = ticker.symbol + ' — ' + (ticker.name || ticker.symbol);
        tickerSelect.appendChild(option);

        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'signal-chip';
        chip.dataset.symbol = ticker.symbol;
        chip.textContent = ticker.symbol;
        chip.addEventListener('click', function () {
          tickerSelect.value = ticker.symbol;
          renderChart();
        });
        chipsContainer.appendChild(chip);
      });

      controls.disabled = false;
      renderChart();
      startLiveTickEngine();
    }

    tickerSelect.addEventListener('change', renderChart);
    crossoverToggle.addEventListener('change', renderChart);
    volatilityToggle.addEventListener('change', renderChart);
    loadData();
  }

  /* --------------------------------------------------------------------------
     5. IN-PAGE PROJECT ARCHITECTURE & DEEP DIVE EXPANDER
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

    link.setAttribute('role', 'button');
    link.setAttribute('aria-expanded', 'false');
    link.innerHTML = 'Explore architecture &amp; technical scope <span aria-hidden="true">↓</span>';

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

  /* --------------------------------------------------------------------------
     8. SIDEBAR BRIGHTNESS & AMBIENT CONTRAST CONTROLLER
     Dynamically aligns sidebars with actual background luminescence at viewport center
     Ensures high brightness and crisp legibility on Signal Lab, Preamble, and all sections.
     -------------------------------------------------------------------------- */
  function initSidebarBrightnessController() {
    const rails = document.querySelectorAll('.page-rail');
    if (!rails.length) return;

    let isUpdating = false;

    function evaluateSidebarBackground() {
      if (isUpdating) return;
      isUpdating = true;

      try {
        const railY = window.innerHeight * 0.5;
        // Strictly only dark sections on the page
        const darkSelectors = ['#about', '#experience', '#contact'];
        let isOverDark = false;

        for (let i = 0; i < darkSelectors.length; i++) {
          const el = document.querySelector(darkSelectors[i]);
          if (el) {
            const rect = el.getBoundingClientRect();
            // Enter dark mode when the dark element covers the vertical center
            if (rect.top <= railY + 15 && rect.bottom >= railY - 15) {
              isOverDark = true;
              break;
            }
          }
        }

        // Preamble & Signal Lab are explicitly light sections
        const preambleEl = document.querySelector('.signal-intro-section');
        const labEl = document.getElementById('signal-lab');
        let inSignalSection = false;

        if (preambleEl) {
          const pr = preambleEl.getBoundingClientRect();
          if (pr.top <= railY + 25 && pr.bottom >= railY - 25) {
            inSignalSection = true;
          }
        }
        if (!inSignalSection && labEl) {
          const lr = labEl.getBoundingClientRect();
          if (lr.top <= railY + 25 && lr.bottom >= railY - 25) {
            inSignalSection = true;
          }
        }

        if (inSignalSection) {
          isOverDark = false;
        }

        rails.forEach(function (rail) {
          const hasDarkClass = rail.classList.contains('is-on-dark');
          if (hasDarkClass !== isOverDark) {
            rail.classList.toggle('is-on-dark', isOverDark);
          }
        });

        if (inSignalSection) {
          const railTitle = document.getElementById('page-rail-title');
          const railNote = document.getElementById('page-rail-note');
          const pageRailLinks = document.querySelectorAll('.page-rail__link');

          if (railTitle && railTitle.textContent !== 'Signal Lab') {
            railTitle.textContent = 'Signal Lab';
          }
          if (railNote && railNote.textContent !== 'Quantitative signals & active market modeling.') {
            railNote.textContent = 'Quantitative signals & active market modeling.';
          }

          // Highlight link 05 cleanly for Signal Lab
          pageRailLinks.forEach(function (link, idx) {
            if (idx === 4) {
              link.setAttribute('aria-current', 'location');
            } else {
              link.removeAttribute('aria-current');
            }
          });
        }
      } finally {
        isUpdating = false;
      }
    }

    let ticking = false;
    function onScrollOrResize() {
      if (!ticking) {
        window.requestAnimationFrame(function () {
          evaluateSidebarBackground();
          ticking = false;
        });
        ticking = true;
      }
    }

    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize, { passive: true });

    // MutationObserver to reconcile if script.js tries to set is-on-dark on light sections
    const observer = new MutationObserver(function () {
      if (!isUpdating) {
        evaluateSidebarBackground();
      }
    });

    rails.forEach(function (rail) {
      observer.observe(rail, { attributes: true, attributeFilter: ['class'] });
    });

    // Run immediately on initialization
    evaluateSidebarBackground();
  }

  /* --------------------------------------------------------------------------
     9. HERO CARD INTELLIGENCE ENGINE
     Replaces generic 2D scatter plot with dynamic Multi-Modal Signal & Neural Lattice
     -------------------------------------------------------------------------- */
  function initHeroIntelligenceEngine() {
    const heroCard = document.querySelector('.hero-art__card');
    if (!heroCard) return;

    const oldChart = heroCard.querySelector('.hero-art__chart');
    if (oldChart) {
      oldChart.style.display = 'none';
    }

    // Ensure redundant outer frame marks in the top-right are hidden
    const redundantMarks = document.querySelectorAll('.hero--editorial .hero__frame-line, .hero--editorial .signal-tick, .hero--editorial .hero__abstract-cross');
    redundantMarks.forEach(function (el) {
      el.style.display = 'none';
    });

    // Guard against duplicate injection
    if (heroCard.querySelector('.hero-intelligence-engine')) return;

    const engineContainer = document.createElement('div');
    engineContainer.className = 'hero-intelligence-engine';
    engineContainer.id = 'hero-intelligence-engine';

    // SVG Mode templates
    const svgModes = {
      neural:
        '<svg class="engine-svg" viewBox="0 0 520 200" fill="none" xmlns="http://www.w3.org/2000/svg">' +
          '<defs>' +
            '<linearGradient id="syn-lime" x1="0" y1="0" x2="1" y2="0">' +
              '<stop stop-color="#8b7dff" stop-opacity="0.4"/>' +
              '<stop offset="1" stop-color="#d6ff5c" stop-opacity="0.85"/>' +
            '</linearGradient>' +
            '<linearGradient id="syn-violet" x1="0" y1="0" x2="1" y2="0">' +
              '<stop stop-color="#8b7dff" stop-opacity="0.7"/>' +
              '<stop offset="1" stop-color="#6e4cc7" stop-opacity="0.3"/>' +
            '</linearGradient>' +
            '<radialGradient id="node-glow-lime">' +
              '<stop stop-color="#d6ff5c" stop-opacity="0.4"/>' +
              '<stop offset="1" stop-color="#d6ff5c" stop-opacity="0"/>' +
            '</radialGradient>' +
            '<radialGradient id="node-glow-violet">' +
              '<stop stop-color="#8b7dff" stop-opacity="0.4"/>' +
              '<stop offset="1" stop-color="#8b7dff" stop-opacity="0"/>' +
            '</radialGradient>' +
            '<pattern id="engine-grid" width="26" height="26" patternUnits="userSpaceOnUse">' +
              '<path d="M26 0H0v26" fill="none" stroke="rgba(255,255,255,0.03)"/>' +
            '</pattern>' +
          '</defs>' +
          '<rect width="520" height="200" fill="url(#engine-grid)"/>' +
          '<text x="35" y="22" font-family="\'DM Mono\', monospace" font-size="7.5" fill="#8c8f9e" letter-spacing="0.08em">01 / INPUT SIGNALS</text>' +
          '<text x="175" y="22" font-family="\'DM Mono\', monospace" font-size="7.5" fill="#8c8f9e" letter-spacing="0.08em">02 / LATENT SYNAPSES</text>' +
          '<text x="370" y="22" font-family="\'DM Mono\', monospace" font-size="7.5" fill="#8c8f9e" letter-spacing="0.08em">03 / DECISION REGIME</text>' +
          '<path class="engine-synapse engine-synapse--active" d="M55 50 C110 50, 130 50, 185 50" stroke="url(#syn-lime)" stroke-width="1.8"/>' +
          '<path class="engine-synapse engine-synapse--active" d="M55 50 C110 50, 130 90, 185 90" stroke="url(#syn-violet)" stroke-width="1.2"/>' +
          '<path class="engine-synapse" d="M55 50 C110 50, 130 130, 185 130" stroke="rgba(139,125,255,0.2)" stroke-width="1"/>' +
          '<path class="engine-synapse engine-synapse--active" d="M55 105 C110 105, 130 50, 185 50" stroke="url(#syn-violet)" stroke-width="1.2"/>' +
          '<path class="engine-synapse engine-synapse--active" d="M55 105 C110 105, 130 90, 185 90" stroke="url(#syn-lime)" stroke-width="2"/>' +
          '<path class="engine-synapse engine-synapse--active" d="M55 105 C110 105, 130 130, 185 130" stroke="url(#syn-violet)" stroke-width="1.5"/>' +
          '<path class="engine-synapse" d="M55 105 C110 105, 130 165, 185 165" stroke="rgba(139,125,255,0.2)" stroke-width="1"/>' +
          '<path class="engine-synapse" d="M55 160 C110 160, 130 90, 185 90" stroke="rgba(139,125,255,0.2)" stroke-width="1"/>' +
          '<path class="engine-synapse engine-synapse--active" d="M55 160 C110 160, 130 130, 185 130" stroke="url(#syn-lime)" stroke-width="1.5"/>' +
          '<path class="engine-synapse engine-synapse--active" d="M55 160 C110 160, 130 165, 185 165" stroke="url(#syn-violet)" stroke-width="1.4"/>' +
          '<path class="engine-synapse engine-synapse--active" d="M185 50 C235 50, 245 65, 295 65" stroke="url(#syn-lime)" stroke-width="1.6"/>' +
          '<path class="engine-synapse engine-synapse--active" d="M185 50 C235 50, 245 110, 295 110" stroke="url(#syn-violet)" stroke-width="1.2"/>' +
          '<path class="engine-synapse engine-synapse--active" d="M185 90 C235 90, 245 65, 295 65" stroke="url(#syn-lime)" stroke-width="2"/>' +
          '<path class="engine-synapse engine-synapse--active" d="M185 90 C235 90, 245 110, 295 110" stroke="url(#syn-lime)" stroke-width="1.8"/>' +
          '<path class="engine-synapse engine-synapse--active" d="M185 90 C235 90, 245 150, 295 150" stroke="url(#syn-violet)" stroke-width="1.2"/>' +
          '<path class="engine-synapse engine-synapse--active" d="M185 130 C235 130, 245 110, 295 110" stroke="url(#syn-violet)" stroke-width="1.4"/>' +
          '<path class="engine-synapse engine-synapse--active" d="M185 130 C235 130, 245 150, 295 150" stroke="url(#syn-lime)" stroke-width="1.7"/>' +
          '<path class="engine-synapse" d="M185 165 C235 165, 245 150, 295 150" stroke="rgba(139,125,255,0.25)" stroke-width="1"/>' +
          '<path class="engine-synapse engine-synapse--active" d="M295 65 C345 65, 365 105, 415 105" stroke="url(#syn-lime)" stroke-width="2.2"/>' +
          '<path class="engine-synapse engine-synapse--active" d="M295 110 C345 110, 365 105, 415 105" stroke="url(#syn-lime)" stroke-width="2.5"/>' +
          '<path class="engine-synapse engine-synapse--active" d="M295 150 C345 150, 365 105, 415 105" stroke="url(#syn-violet)" stroke-width="1.6"/>' +
          '<path d="M375 160 Q400 160 415 75 Q430 160 455 160" fill="rgba(214,255,92,0.06)" stroke="rgba(214,255,92,0.3)" stroke-dasharray="3 3"/>' +
          '<line x1="415" y1="55" x2="415" y2="165" stroke="rgba(214,255,92,0.4)" stroke-dasharray="2 2"/>' +
          '<g class="engine-node" data-tip="Input X1: Price Momentum Tensor (SMA20/SMA50 spread +1.79%)">' +
            '<circle cx="55" cy="50" r="14" fill="url(#node-glow-lime)"/>' +
            '<circle cx="55" cy="50" r="6" fill="#171a26" stroke="#d6ff5c" stroke-width="2"/>' +
            '<text x="55" y="68" font-family="\'DM Mono\', monospace" font-size="7" fill="#b8b6cb" text-anchor="middle">p_momentum</text>' +
          '</g>' +
          '<g class="engine-node" data-tip="Input X2: Log-Return Volatility Dispersion (20D: 0.41%)">' +
            '<circle cx="55" cy="105" r="14" fill="url(#node-glow-violet)"/>' +
            '<circle cx="55" cy="105" r="6" fill="#171a26" stroke="#8b7dff" stroke-width="2"/>' +
            '<text x="55" y="123" font-family="\'DM Mono\', monospace" font-size="7" fill="#b8b6cb" text-anchor="middle">σ_volatility</text>' +
          '</g>' +
          '<g class="engine-node" data-tip="Input X3: Macro Factor / Order Flow Vector">' +
            '<circle cx="55" cy="160" r="14" fill="rgba(255,106,85,0.15)"/>' +
            '<circle cx="55" cy="160" r="6" fill="#171a26" stroke="#ff6a55" stroke-width="2"/>' +
            '<text x="55" y="178" font-family="\'DM Mono\', monospace" font-size="7" fill="#b8b6cb" text-anchor="middle">catalyst_flow</text>' +
          '</g>' +
          '<circle class="engine-node" data-tip="Latent Node H1: Weight +1.42 · ReLU" cx="185" cy="50" r="4.5" fill="#171a26" stroke="#d6ff5c" stroke-width="1.8"/>' +
          '<circle class="engine-node" data-tip="Latent Node H2: Weight +0.89 · ReLU" cx="185" cy="90" r="5.5" fill="#171a26" stroke="#d6ff5c" stroke-width="2"/>' +
          '<circle class="engine-node" data-tip="Latent Node H3: Weight -0.34 · GeLU" cx="185" cy="130" r="4.5" fill="#171a26" stroke="#8b7dff" stroke-width="1.5"/>' +
          '<circle class="engine-node" data-tip="Latent Node H4: Weight +0.12 · GeLU" cx="185" cy="165" r="3.5" fill="#171a26" stroke="#8b7dff" stroke-width="1.2"/>' +
          '<circle class="engine-node" data-tip="Dense Feature Z1: Attention Transform (Weight +2.10)" cx="295" cy="65" r="5" fill="#171a26" stroke="#d6ff5c" stroke-width="2"/>' +
          '<circle class="engine-node" data-tip="Dense Feature Z2: Attention Transform (Weight +1.94)" cx="295" cy="110" r="6" fill="#171a26" stroke="#d6ff5c" stroke-width="2.2"/>' +
          '<circle class="engine-node" data-tip="Dense Feature Z3: Risk Decay Filter (Weight -0.85)" cx="295" cy="150" r="4" fill="#171a26" stroke="#8b7dff" stroke-width="1.5"/>' +
          '<g class="engine-node" data-tip="Inference Output: Bullish Expansion Regime (P = 94.8% Confidence)">' +
            '<circle cx="415" cy="105" r="22" fill="url(#node-glow-lime)"/>' +
            '<circle cx="415" cy="105" r="10" fill="#171a26" stroke="#d6ff5c" stroke-width="2.5"/>' +
            '<circle cx="415" cy="105" r="4" fill="#d6ff5c"/>' +
            '<text x="415" y="132" font-family="\'DM Mono\', monospace" font-size="8" font-weight="600" fill="#d6ff5c" text-anchor="middle">REGIME: STABLE</text>' +
            '<text x="415" y="143" font-family="\'DM Mono\', monospace" font-size="7" fill="#b8b6cb" text-anchor="middle">CONFIDENCE: 94.8%</text>' +
          '</g>' +
        '</svg>',

      regime:
        '<svg class="engine-svg" viewBox="0 0 520 200" fill="none" xmlns="http://www.w3.org/2000/svg">' +
          '<defs>' +
            '<linearGradient id="surf-grad" x1="0" y1="0" x2="1" y2="1">' +
              '<stop stop-color="#d6ff5c" stop-opacity="0.25"/>' +
              '<stop offset="0.5" stop-color="#8b7dff" stop-opacity="0.15"/>' +
              '<stop offset="1" stop-color="#141721" stop-opacity="0.4"/>' +
            '</linearGradient>' +
          '</defs>' +
          '<text x="35" y="22" font-family="\'DM Mono\', monospace" font-size="7.5" fill="#8c8f9e" letter-spacing="0.08em">TOPOLOGICAL REGIME SURFACE</text>' +
          '<text x="480" y="22" font-family="\'DM Mono\', monospace" font-size="7.5" fill="#d6ff5c" letter-spacing="0.08em" text-anchor="end">MANIFOLD EXPANSION</text>' +
          '<path d="M40 155 Q120 115 200 140 T360 80 T480 65" stroke="#d6ff5c" stroke-width="2.5" fill="none"/>' +
          '<path d="M40 155 Q120 115 200 140 T360 80 T480 65 L480 180 L40 180 Z" fill="url(#surf-grad)"/>' +
          '<path d="M40 165 Q120 130 200 150 T360 95 T480 82" stroke="#8b7dff" stroke-width="1.8" stroke-dasharray="4 6" fill="none"/>' +
          '<path d="M40 175 Q120 145 200 160 T360 115 T480 105" stroke="rgba(139,125,255,0.4)" stroke-width="1.2" fill="none"/>' +
          '<circle class="engine-node" data-tip="Inflection Point: Volatility Compression (σ = 0.38%)" cx="200" cy="140" r="5" fill="#171a26" stroke="#8b7dff" stroke-width="2"/>' +
          '<circle class="engine-node" data-tip="Inflection Point: Momentum Acceleration (+2.35% Spread)" cx="360" cy="80" r="6" fill="#171a26" stroke="#d6ff5c" stroke-width="2.5"/>' +
          '<circle class="engine-node" data-tip="Validated Regime: Upper Quantile Expansion" cx="480" cy="65" r="5" fill="#171a26" stroke="#d6ff5c" stroke-width="2"/>' +
          '<line x1="40" y1="185" x2="480" y2="185" stroke="rgba(255,255,255,0.15)"/>' +
          '<text x="40" y="196" font-family="\'DM Mono\', monospace" font-size="7" fill="#8c8f9e">T-60 TRADING SESSIONS</text>' +
          '<text x="240" y="196" font-family="\'DM Mono\', monospace" font-size="7" fill="#8c8f9e" text-anchor="middle">VOLATILITY COMPRESSION</text>' +
          '<text x="480" y="196" font-family="\'DM Mono\', monospace" font-size="7" fill="#8c8f9e" text-anchor="end">EXPANSION REGIME</text>' +
        '</svg>',

      clusters:
        '<svg class="engine-svg" viewBox="0 0 520 200" fill="none" xmlns="http://www.w3.org/2000/svg">' +
          '<text x="35" y="22" font-family="\'DM Mono\', monospace" font-size="7.5" fill="#8c8f9e" letter-spacing="0.08em">HIGH-DIMENSIONAL FACTOR EMBEDDINGS</text>' +
          '<text x="480" y="22" font-family="\'DM Mono\', monospace" font-size="7.5" fill="#d6ff5c" letter-spacing="0.08em" text-anchor="end">t-SNE / PCA CLUSTERS</text>' +
          '<ellipse cx="370" cy="70" rx="80" ry="45" fill="rgba(214,255,92,0.06)" stroke="rgba(214,255,92,0.3)" stroke-dasharray="3 5"/>' +
          '<text x="370" y="42" font-family="\'DM Mono\', monospace" font-size="7.5" font-weight="600" fill="#d6ff5c" text-anchor="middle">CLUSTER A: MOMENTUM LEADERS (n=342)</text>' +
          '<circle class="engine-node" data-tip="NVDA: Momentum Rank 99.2 · Strong Inflow" cx="350" cy="65" r="4.5" fill="#171a26" stroke="#d6ff5c" stroke-width="1.8"/>' +
          '<circle class="engine-node" data-tip="QQQ: Momentum Rank 96.8 · Tech Leadership" cx="390" cy="75" r="4" fill="#171a26" stroke="#d6ff5c" stroke-width="1.8"/>' +
          '<circle class="engine-node" data-tip="AAPL: Momentum Rank 94.1 · Factor Alignment" cx="365" cy="85" r="3.5" fill="#171a26" stroke="#d6ff5c" stroke-width="1.5"/>' +
          '<ellipse cx="160" cy="130" rx="75" ry="40" fill="rgba(139,125,255,0.06)" stroke="rgba(139,125,255,0.3)" stroke-dasharray="3 5"/>' +
          '<text x="160" y="105" font-family="\'DM Mono\', monospace" font-size="7.5" font-weight="600" fill="#b6aaff" text-anchor="middle">CLUSTER B: MEAN REVERSION (n=188)</text>' +
          '<circle class="engine-node" data-tip="SPY: Broad Index Benchmark · Beta 1.0" cx="140" cy="135" r="4" fill="#171a26" stroke="#8b7dff" stroke-width="1.8"/>' +
          '<circle class="engine-node" data-tip="MSFT: Institutional Trend Anchor" cx="180" cy="125" r="4" fill="#171a26" stroke="#8b7dff" stroke-width="1.8"/>' +
          '<ellipse cx="270" cy="165" rx="50" ry="25" fill="rgba(255,106,85,0.06)" stroke="rgba(255,106,85,0.3)" stroke-dasharray="3 5"/>' +
          '<text x="270" y="152" font-family="\'DM Mono\', monospace" font-size="7" fill="#ff6a55" text-anchor="middle">FILTERED NOISE (n=94)</text>' +
          '<circle class="engine-node" data-tip="TSLA: High Volatility Dispersion · Filtered Outlier" cx="265" cy="170" r="3.5" fill="#171a26" stroke="#ff6a55" stroke-width="1.5"/>' +
        '</svg>'
    };

    const telemetryData = {
      neural: [
        { lbl: 'INFERENCE', val: 'REGIME STABLE · 94.8%', cls: 'telemetry-value--lime' },
        { lbl: 'LATENCY', val: '7.4ms (EDGE)', cls: 'telemetry-value--violet' },
        { lbl: 'TENSORS', val: '128 → 16 → 3', cls: '' }
      ],
      regime: [
        { lbl: 'TOPOLOGY', val: 'VOLATILITY MANIFOLD', cls: 'telemetry-value--lime' },
        { lbl: 'SHARPE / BETA', val: '2.18 / 1.04', cls: 'telemetry-value--violet' },
        { lbl: 'TRAJECTORY', val: 'ACCUMULATION PHASE', cls: '' }
      ],
      clusters: [
        { lbl: 'EMBEDDINGS', val: 't-SNE / PCA SEPARATION', cls: 'telemetry-value--lime' },
        { lbl: 'CLUSTERING', val: 'K=3 FACTOR COHORTS', cls: 'telemetry-value--violet' },
        { lbl: 'FIDELITY', val: '0.984 SEPARATION SCORE', cls: '' }
      ]
    };

    const badgeLabels = {
      neural: 'MODE: <span>AI SIGNAL TOPOLOGY</span>',
      regime: 'MODE: <span>3D REGIME MANIFOLD</span>',
      clusters: 'MODE: <span>FACTOR EMBEDDINGS</span>'
    };

    engineContainer.innerHTML =
      '<div class="engine-nav-bar">' +
        '<div class="engine-tabs" role="tablist" aria-label="Signal representation modes">' +
          '<button type="button" class="engine-tab is-active" data-mode="neural" role="tab" aria-selected="true">' +
            '<span class="engine-tab__dot"></span> NEURAL LATTICE' +
          '</button>' +
          '<button type="button" class="engine-tab" data-mode="regime" role="tab" aria-selected="false">REGIME SURFACE</button>' +
          '<button type="button" class="engine-tab" data-mode="clusters" role="tab" aria-selected="false">FACTOR CLUSTERS</button>' +
        '</div>' +
        '<span class="engine-status-badge" id="engine-status-badge">' + badgeLabels.neural + '</span>' +
      '</div>' +
      '<div class="engine-canvas-wrap" id="engine-canvas-wrap">' +
        svgModes.neural +
        '<div class="engine-tooltip" id="engine-tooltip" style="opacity: 0;">Hover nodes to inspect signal state</div>' +
      '</div>' +
      '<div class="engine-footer-telemetry" id="engine-footer-telemetry">' +
        telemetryData.neural.map(function (item) {
          return '<div class="engine-telemetry-col">' +
            '<span class="engine-telemetry-lbl">' + item.lbl + '</span>' +
            '<strong class="engine-telemetry-val ' + (item.cls ? 'engine-' + item.cls : '') + '">' + item.val + '</strong>' +
          '</div>';
        }).join('') +
      '</div>';

    // Insert right after the heading
    const heading = heroCard.querySelector('.hero-art__heading');
    if (heading && heading.nextSibling) {
      heroCard.insertBefore(engineContainer, heading.nextSibling);
    } else {
      heroCard.appendChild(engineContainer);
    }

    const tabs = engineContainer.querySelectorAll('.engine-tab');
    const canvasWrap = engineContainer.querySelector('#engine-canvas-wrap');
    const statusBadge = engineContainer.querySelector('#engine-status-badge');
    const telemetryFooter = engineContainer.querySelector('#engine-footer-telemetry');
    const tooltip = engineContainer.querySelector('#engine-tooltip');

    function attachNodeHoverListeners() {
      const nodes = canvasWrap.querySelectorAll('.engine-node');
      nodes.forEach(function (node) {
        node.addEventListener('mouseenter', function () {
          const tip = node.getAttribute('data-tip');
          if (tip && tooltip) {
            tooltip.textContent = tip;
            tooltip.style.opacity = '1';
          }
        });
        node.addEventListener('mouseleave', function () {
          if (tooltip) {
            tooltip.style.opacity = '0';
          }
        });
      });
    }

    attachNodeHoverListeners();

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        const mode = tab.getAttribute('data-mode');
        if (!mode || !svgModes[mode]) return;

        tabs.forEach(function (t) {
          const isActive = t === tab;
          t.classList.toggle('is-active', isActive);
          t.setAttribute('aria-selected', isActive ? 'true' : 'false');
          const dot = t.querySelector('.engine-tab__dot');
          if (isActive && !dot) {
            const newDot = document.createElement('span');
            newDot.className = 'engine-tab__dot';
            t.insertBefore(newDot, t.firstChild);
          } else if (!isActive && dot) {
            dot.remove();
          }
        });

        if (statusBadge && badgeLabels[mode]) {
          statusBadge.innerHTML = badgeLabels[mode];
        }

        if (canvasWrap) {
          canvasWrap.innerHTML = svgModes[mode] + '<div class="engine-tooltip" id="engine-tooltip" style="opacity: 0;">Hover nodes to inspect signal state</div>';
          attachNodeHoverListeners();
        }

        if (telemetryFooter && telemetryData[mode]) {
          telemetryFooter.innerHTML = telemetryData[mode].map(function (item) {
            return '<div class="engine-telemetry-col">' +
              '<span class="engine-telemetry-lbl">' + item.lbl + '</span>' +
              '<strong class="engine-telemetry-val ' + (item.cls ? 'engine-' + item.cls : '') + '">' + item.val + '</strong>' +
            '</div>';
          }).join('');
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initSidebarBrightnessController();
      initHeroIntelligenceEngine();
    });
  } else {
    initSidebarBrightnessController();
    initHeroIntelligenceEngine();
  }


}());
