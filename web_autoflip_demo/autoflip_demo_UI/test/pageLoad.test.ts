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
declare let PATH: string;
describe('Test header and title of the page', () => {
  beforeAll(async () => {
    await page.goto(PATH);
  });
  test('Title of the page', async () => {
    const title = await page.title();
    expect(title).toBe('Autoflip Web Demo');
  });
  test('Header of the page', async () => {
    await expect(page).toMatch('AutoFlip');
  });
  test('Headline of the page', async () => {
    const headlines = await page.$$('h1');
    expect(headlines.length).toBe(2);
  });
  test('Card1 is visible on the page', async () => {
    const isNotHidden = await page.$eval('#card1', (elem) => {
      return (<HTMLDivElement>elem).style.display !== 'none';
    });
    expect(isNotHidden).toBe(true);
  });
  test('Card2 is not on the page', async () => {
    const isHidden = await page.$eval('#card2', (elem) => {
      return (<HTMLDivElement>elem).style.display === 'none';
    });
    expect(isHidden).toBe(true);
  });
  test('Card3 exist on the page', async () => {
    const isHidden = await page.$eval('#card3', (elem) => {
      return (<HTMLDivElement>elem).style.display === 'none';
    });
    expect(isHidden).toBe(true);
  });
  test('Card4 exist on the page', async () => {
    const isHidden = await page.$eval('#card4', (elem) => {
      return (<HTMLDivElement>elem).style.display === 'none';
    });
    expect(isHidden).toBe(true);
  });
});
