declare let PATH: string;
describe('Test header and title of the page', () => {
  beforeAll(async () => {
    await page.goto(PATH, { waitUntil: 'load' });
  });
  test('Title of the page', async () => {
    const title = await page.title();
    expect(title).toBe('new version autoflip');
  });
});
