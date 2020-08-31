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

  test('input form value starts as 1:1', async () => {
    const inputWidth = await page.$eval(
      '#aspect-width',
      (e) => (<HTMLInputElement>e).value,
    );
    expect(inputWidth).toBe('1');
    const inputHeight = await page.$eval(
      '#aspect-height',
      (e) => (<HTMLInputElement>e).value,
    );
    expect(inputHeight).toBe('1');
  });

  test('Aspect ratio form of the page', async () => {
    await expect(page).toFillForm('form[name="aspect-ratio-from"]', {
      aspectW: '2',
      aspectH: '3',
    });
  });

  test('input form value change as 2:3', async () => {
    const inputWidth = await page.$eval(
      '#aspect-width',
      (e) => (<HTMLInputElement>e).value,
    );
    expect(inputWidth).toBe('2');
    const inputHeight = await page.$eval(
      '#aspect-height',
      (e) => (<HTMLInputElement>e).value,
    );
    expect(inputHeight).toBe('3');
  });

  test('Click demo button for submit inputs', async () => {
    await expect(page).toClick('button', { text: 'Try our demo!' });
    await page.waitFor(1000);
  });

  test('create history button with inputs as 2:3', async () => {
    const historyButtonText = await page.$eval(
      '#history-2-3',
      (e) => (<HTMLButtonElement>e).innerText,
    );
    expect(historyButtonText).toBe('2 : 3 0%');
  });
});
