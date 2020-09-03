module.exports = {
  server: {
    command: 'npm run serve',
    port: 4444,
    launchTimeout: 10000,
    debug: true,
  },
  launch: {
    dumpio: true,
    headless: process.env.HEADLESS !== 'false',
  },
  browser: 'chromium',
  browserContext: 'default',
};
