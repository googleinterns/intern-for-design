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

  test('video play is paused without source', async () => {
    const videoState = await page.$eval('#video-preview', (elem) => {
      return (<HTMLVideoElement>elem).paused;
    });
    expect(videoState).toBeTruthy();
  });

  test('Video player source is empty before upload', async () => {
    const videoSource = await page.$eval('#video-preview', (elem) => {
      return (<HTMLVideoElement>elem).src;
    });
    expect(videoSource.length).toBe(0);
  });

  test('Click demo button for upload video', async () => {
    await expect(page).toClick('button', { text: 'Try our demo!' });
    await page.waitFor(1000);
  });

  test('Demo button click for video file upload', async () => {
    const videoSource = await page.$eval('#video-preview', (elem) => {
      return (<HTMLVideoElement>elem).src;
    });
    expect(videoSource.length).not.toBe(0);
  });

  test('Demo button click for video play', async () => {
    const videoState = await page.$eval('#video-preview', (elem) => {
      return (<HTMLVideoElement>elem).paused;
    });
    expect(videoState).toBeFalsy();
  });
});
