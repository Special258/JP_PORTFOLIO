'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const root = path.join(__dirname, '..');
const publicDirectory = path.join(root, 'public');

function listEntries(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(function (entry) {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? [entryPath, ...listEntries(entryPath)] : [entryPath];
  });
}

test('deployment output excludes private files, dependencies, and tests', function () {
  const entries = listEntries(publicDirectory);

  entries.forEach(function (entryPath) {
    const name = path.basename(entryPath);
    assert.doesNotMatch(name, /^\.env/i, `${entryPath} must not be published`);
    assert.notEqual(name.toLowerCase(), 'profile.pdf', `${entryPath} must not be published`);
    assert.notEqual(name.toLowerCase(), 'node_modules', `${entryPath} must not be published`);
    assert.doesNotMatch(name, /\.test\.js$/i, `${entryPath} must not be published`);
  });
});

test('deployment ignore files and environment example exist at the repository root', function () {
  const expectedFiles = process.env.VERCEL
    ? ['.gitignore', '.vercelignore']
    : ['.gitignore', '.vercelignore', '.env.example'];

  for (const name of expectedFiles) {
    assert.ok(fs.existsSync(path.join(root, name)), `${name} must exist with its leading dot`);
  }

  for (const name of ['.gitignore', '.vercelignore']) {
    const contents = fs.readFileSync(path.join(root, name), 'utf8');
    assert.match(contents, /^\.env\*/m, `${name} must exclude environment files`);
    assert.match(contents, /^\/?Profile\.pdf$/m, `${name} must exclude Profile.pdf`);
    assert.match(contents, /^node_modules\/?$/m, `${name} must exclude node_modules`);
  }
});
