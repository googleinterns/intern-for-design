import { Page, Browser } from 'puppeteer';

const puppeteer = require('puppeteer');
let page: Page;
let browser: Browser;

describe('Google', () => {
  beforeEach(async () => {
    browser = await puppeteer.launch();
    page = await browser.newPage();
    await page.goto('https://google.com', { waitUntil: 'domcontentloaded' });
  });
  afterEach(async () => {
    await browser.close();
  });

  it('should display "google" text on page', async () => {
    const text = await page.evaluate(() => document.body.textContent);
    expect(text).toContain('google');
  });
});
