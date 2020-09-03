/**
 * Copyright 2020 Google LLC
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @jest-environment jsdom
 */

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

  test('Click demo button for showing video Player', async () => {
    await expect(page).toClick('button', { text: 'Try our demo!' });
    await page.waitFor(1000);
  });

  test('PutMiddle should place the video Player vertically in middle', async () => {
    const topOffset = await page.$eval('#video-section', (elem) => {
      return parseFloat((<HTMLVideoElement>elem).style.marginTop);
    });
    const videoHeight = await page.$eval('#video-preview', (elem) => {
      return (<HTMLVideoElement>elem).offsetHeight;
    });
    expect(videoHeight).toBe(225);
    const topOffsetControl = await page.$eval('#video-play-control', (elem) => {
      return (<HTMLVideoElement>elem).offsetTop;
    });
    expect(topOffsetControl).toBe(350);
    expect(topOffsetControl - videoHeight - topOffset).toBe(topOffset);
  });

  test('PutMiddle should place the video Player horizontally in middle', async () => {
    const leftOffset = await page.$eval('#video-section', (elem) => {
      return parseFloat((<HTMLVideoElement>elem).style.marginLeft);
    });
    const videoWidth = await page.$eval('#video-preview', (elem) => {
      return (<HTMLVideoElement>elem).offsetWidth;
    });
    expect(videoWidth).toBe(400);
    const wapperWidth = await page.$eval('#card31', (elem) => {
      return (<HTMLVideoElement>elem).offsetWidth;
    });
    expect(wapperWidth - videoWidth - leftOffset).toBe(leftOffset);
  });
});
