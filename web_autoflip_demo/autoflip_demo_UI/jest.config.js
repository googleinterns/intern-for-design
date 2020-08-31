const merge = require('merge');
const ts_preset = require('ts-jest/jest-preset');
const puppeteer_preset = require('jest-puppeteer/jest-preset');

module.exports = merge.recursive(puppeteer_preset, ts_preset, {
  globals: {
    PATH: 'http://localhost:4444',
  },
  testTimeout: 20000,
});
