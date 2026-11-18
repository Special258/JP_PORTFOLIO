'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { convertCsv } = require('./csv-to-prices.js');

async function main() {
  const input = process.argv[2];
  if (!input || process.argv.length > 4) {
    throw new Error('Usage: node tools/csv-to-json.js <export.csv> [output.json]');
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
