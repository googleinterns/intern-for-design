/**
 * Copyright 2020 Google LLC
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
