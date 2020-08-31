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

describe('Test video uplaod via demo button click', () => {
  beforeAll(async () => {
    browser = await puppeteer.launch({
      executablePath: '/usr/bin/google-chrome-stable',
    });
    page = await browser.newPage();
    await page.goto(PATH);
  });
  afterAll(async () => {
    await browser.close();
  });

  test('Demo button exist on the page', async () => {
    const demoButtonText = await page.$eval('#start-demo', (e) => e.innerHTML);
    expect(demoButtonText.trim()).toBe('Try our demo!');
  });

  test('Display card1 on the page before upload file', async () => {
    const isNotHidden = await page.$eval('#card1', (elem) => {
      return (<HTMLDivElement>elem).style.display !== 'none';
    });
    expect(isNotHidden).toBe(true);
  });

  test('Click demo button for upload video', async () => {
    await expect(page).toClick('button', { text: 'Try our demo!' });
    await page.waitFor(1000);
  });

  test('Display change after demo button click, card1 is invisible', async () => {
    const isHidden = await page.$eval('#card1', (elem) => {
      return (<HTMLDivElement>elem).style.display === 'none';
    });
    expect(isHidden).toBe(true);
  });
});
