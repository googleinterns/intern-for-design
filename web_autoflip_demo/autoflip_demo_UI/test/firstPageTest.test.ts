import { Page } from 'puppeteer';

const puppeteer = require('puppeteer');
let page: Page;
describe('Test header and title of the page', () => {
  beforeAll(async () => {
    const browser = await puppeteer.launch({
      executablePath: '/usr/bin/google-chrome-stable',
    });
    page = await browser.newPage();
    await page.goto(PATH);
  });
  test('Demo Button of the page', async () => {
    const demoButtonText = await page.$eval('#start-demo', (e) => e.innerHTML);
    expect(demoButtonText.trim()).toBe('Try our demo!');
  });

  test('should change display on click', async () => {
    const isNotHidden = await page.$eval('#card1', (elem) => {
      return (<HTMLDivElement>elem).style.display !== 'none';
    });
    expect(isNotHidden).toBe(true);
    const demoBtn = await page.$('button#start-demo');
    demoBtn?.click();
    await page.waitFor(3000);
    const isHidden = await page.$eval('#card1', (elem) => {
      return (<HTMLDivElement>elem).style.display === 'none';
    });
    expect(isHidden).toBe(true);
  });
  /*
  test('Demo Button of the page', async () => {
    await expect(page).toClick('button', { text: 'Try our demo!' });
  });

  test('Aspect ratio form of the page', async () => {
    await expect(page).toFillForm('form[name="aspect-ratio-from"]', {
      aspectW: '1',
      aspectH: '1',
    });
  });
  test('Check showing card1 of the page', async () => {
    const isNotHidden = await page.$eval('#card1', (elem) => {
      return (<HTMLDivElement>elem).style.display !== 'none';
    });
    expect(isNotHidden).toBe(true);
  });
  test('Check showing card2 of the page', async () => {
    const isHidden = await page.$eval('#card2', (elem) => {
      return (<HTMLDivElement>elem).style.display === 'none';
    });
    expect(isHidden).toBe(true);
  });
  */
});
