'use strict';

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

function decodePng(buffer) {
  // Check PNG signature
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i++) {
    if (buffer[i] !== sig[i]) throw new Error('Not a valid PNG');
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }

  const compressed = Buffer.concat(idatChunks);
  const decompressed = zlib.inflateSync(compressed);

  let bytesPerPixel = 4; // RGBA
  if (colorType === 2) bytesPerPixel = 3; // RGB
  else if (colorType === 0) bytesPerPixel = 1; // Grayscale
  else if (colorType === 6) bytesPerPixel = 4; // RGBA
  else if (colorType === 4) bytesPerPixel = 2; // Grayscale + Alpha

  const stride = 1 + width * bytesPerPixel;
  const rgba = Buffer.alloc(width * height * 4);

  // Unfilter scanlines
  let prevRow = Buffer.alloc(width * bytesPerPixel);
  for (let y = 0; y < height; y++) {
    const filterType = decompressed[y * stride];
    const currentRow = decompressed.subarray(y * stride + 1, (y + 1) * stride);
    const unfilteredRow = Buffer.alloc(width * bytesPerPixel);

    for (let x = 0; x < width * bytesPerPixel; x++) {
      const bpp = bytesPerPixel;
      const left = x >= bpp ? unfilteredRow[x - bpp] : 0;
      const up = prevRow[x];
      const upLeft = x >= bpp ? prevRow[x - bpp] : 0;

      let val = currentRow[x];
      if (filterType === 0) {
        // None
      } else if (filterType === 1) {
        // Sub
        val = (val + left) & 0xff;
      } else if (filterType === 2) {
        // Up
        val = (val + up) & 0xff;
      } else if (filterType === 3) {
        // Average
        val = (val + Math.floor((left + up) / 2)) & 0xff;
      } else if (filterType === 4) {
        // Paeth
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        let pr;
        if (pa <= pb && pa <= pc) pr = left;
        else if (pb <= pc) pr = up;
        else pr = upLeft;
        val = (val + pr) & 0xff;
      }
      unfilteredRow[x] = val;
    }

    // Convert row to RGBA
    for (let x = 0; x < width; x++) {
      const outIdx = (y * width + x) * 4;
      const inIdx = x * bytesPerPixel;
      if (bytesPerPixel === 4) {
        rgba[outIdx] = unfilteredRow[inIdx];
        rgba[outIdx + 1] = unfilteredRow[inIdx + 1];
        rgba[outIdx + 2] = unfilteredRow[inIdx + 2];
        rgba[outIdx + 3] = unfilteredRow[inIdx + 3];
      } else if (bytesPerPixel === 3) {
        rgba[outIdx] = unfilteredRow[inIdx];
        rgba[outIdx + 1] = unfilteredRow[inIdx + 1];
        rgba[outIdx + 2] = unfilteredRow[inIdx + 2];
        rgba[outIdx + 3] = 255;
      }
    }
    prevRow = unfilteredRow;
  }

  return { width, height, data: rgba };
}

function compareImages(img1Buffer, img2Buffer, toleranceThreshold = 0) {
  const img1 = decodePng(img1Buffer);
  const img2 = decodePng(img2Buffer);

  if (img1.width !== img2.width || img1.height !== img2.height) {
    return {
      match: false,
      diffPercentage: 100,
      diffPixels: Math.max(img1.width * img1.height, img2.width * img2.height),
      totalPixels: Math.max(img1.width * img1.height, img2.width * img2.height),
      dimensionMismatch: true,
      dim1: `${img1.width}x${img1.height}`,
      dim2: `${img2.width}x${img2.height}`
    };
  }

  const totalPixels = img1.width * img1.height;
  let diffPixels = 0;

  for (let i = 0; i < totalPixels * 4; i += 4) {
    const dr = Math.abs(img1.data[i] - img2.data[i]);
    const dg = Math.abs(img1.data[i + 1] - img2.data[i + 1]);
    const db = Math.abs(img1.data[i + 2] - img2.data[i + 2]);
    const da = Math.abs(img1.data[i + 3] - img2.data[i + 3]);

    if (dr > toleranceThreshold || dg > toleranceThreshold || db > toleranceThreshold || da > toleranceThreshold) {
      diffPixels++;
    }
  }

  const diffPercentage = (diffPixels / totalPixels) * 100;
  return {
    match: diffPixels === 0,
    diffPixels,
    totalPixels,
    diffPercentage: Number(diffPercentage.toFixed(4))
  };
}

function compareDirectories(dirA, dirB) {
  const filesA = fs.readdirSync(dirA).filter((f) => f.endsWith('.png'));
  const results = [];

  for (const file of filesA) {
    const pathA = path.join(dirA, file);
    const pathB = path.join(dirB, file);

    if (!fs.existsSync(pathB)) {
      results.push({ file, match: false, reason: 'Missing in comparison directory' });
      continue;
    }

    const bufA = fs.readFileSync(pathA);
    const bufB = fs.readFileSync(pathB);
    const diff = compareImages(bufA, bufB);
    results.push({ file, ...diff });
  }

  return results;
}

if (require.main === module) {
  const dirA = process.argv[2] || 'baseline';
  const dirB = process.argv[3];

  if (!dirB) {
    console.log('Usage: node tools/pixel-diff.js <dirA> <dirB>');
    process.exit(1);
  }

  const results = compareDirectories(dirA, dirB);
  let failed = 0;
  for (const r of results) {
    if (!r.match) {
      failed++;
      console.log(`FAIL: ${r.file} - diff: ${r.diffPercentage}% (${r.diffPixels}/${r.totalPixels} px)`);
    } else {
      console.log(`PASS: ${r.file} - 0% diff`);
    }
  }

  console.log(`\nTotal: ${results.length}, Mismatched: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

module.exports = { decodePng, compareImages, compareDirectories };
