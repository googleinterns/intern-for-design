module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globalSetup: './setup.js',
  globalTeardown: './teardown.js',
  testEnvironment: './puppeteer_environment.js',
  globals: {
    URL: 'http://localhost:4444',
  },
  testMatch: ['**/test/**/*.test.js'],
  verbose: true,
};
