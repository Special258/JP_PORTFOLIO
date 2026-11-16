'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

function parseCsvRow(line, lineNumber) {
  const fields = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (quoted) {
      if (character === '"' && line[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === ',' && !quoted) {
      fields.push(field.trim());
      field = '';
    } else if (character === '"' && field.trim() === '') {
      quoted = true;
    } else {
      field += character;
    }
  }
  if (quoted) {
    throw new Error('Unclosed quoted field on CSV line ' + lineNumber + '.');
  }
  fields.push(field.trim());
  return fields;
}

function isValidDate(date) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    Number.isFinite(Date.parse(date)) &&
    new Date(date + 'T00:00:00Z').toISOString().slice(0, 10) === date;
}

function convertCsv(csv) {
  const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/).filter(function (line) {
    return line.trim() !== '';
  });
  if (lines.length < 2) {
    throw new Error('CSV must include a header and at least one price row.');
  }

  const headers = parseCsvRow(lines[0], 1).map(function (header) { return header.toLowerCase(); });
  const dateIndex = headers.indexOf('date');
  const tickerIndex = headers.indexOf('ticker');
  const closeIndex = headers.indexOf('close');
  if (dateIndex < 0 || tickerIndex < 0 || closeIndex < 0) {
    throw new Error('CSV header must contain date,ticker,close columns.');
  }

  const grouped = new Map();
  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const fields = parseCsvRow(lines[lineIndex], lineIndex + 1);
    if (fields.length !== headers.length) {
      throw new Error('CSV line ' + (lineIndex + 1) + ' has a different number of columns than the header.');
    }

    const date = fields[dateIndex];
    const symbol = fields[tickerIndex].toUpperCase();
    const closeText = fields[closeIndex];
    const close = Number(closeText);
    if (!isValidDate(date)) {
      throw new Error('CSV line ' + (lineIndex + 1) + ' must use a real YYYY-MM-DD date.');
    }
    if (!/^[A-Z0-9.^-]{1,15}$/.test(symbol)) {
      throw new Error('CSV line ' + (lineIndex + 1) + ' has an invalid ticker symbol.');
    }
    if (closeText === '' || !Number.isFinite(close) || close <= 0) {
      throw new Error('CSV line ' + (lineIndex + 1) + ' must have a positive numeric close.');
    }

    if (!grouped.has(symbol)) {
      grouped.set(symbol, []);
    }
    grouped.get(symbol).push({ date: date, close: close });
  }

  if (grouped.size !== 3) {
    throw new Error('CSV must contain exactly three unique ticker symbols; found ' + grouped.size + '.');
  }

  const tickers = Array.from(grouped.keys()).sort().map(function (symbol) {
    const prices = grouped.get(symbol).sort(function (left, right) { return left.date.localeCompare(right.date); });
    for (let index = 1; index < prices.length; index += 1) {
      if (prices[index - 1].date === prices[index].date) {
        throw new Error(symbol + ' has duplicate closing-price dates.');
      }
    }
    return { symbol: symbol, prices: prices };
  });

  return { tickers: tickers };
}

async function main() {
  const input = process.argv[2];
  if (!input || process.argv.length > 4) {
    throw new Error('Usage: node tools/csv-to-prices.js <export.csv> [output.json]');
  }

  const inputPath = path.resolve(input);
  const outputPath = path.resolve(process.argv[3] || path.join(__dirname, '..', 'public', 'data', 'prices.json'));
  const csv = await fs.readFile(inputPath, 'utf8');
  const dataset = convertCsv(csv);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(dataset, null, 2) + '\n', 'utf8');
  process.stdout.write('Wrote ' + dataset.tickers.length + ' tickers to ' + outputPath + '.\n');
}

if (require.main === module) {
  main().catch(function (error) {
    process.stderr.write(error.message + '\n');
    process.exitCode = 1;
  });
}

module.exports = { convertCsv: convertCsv };
