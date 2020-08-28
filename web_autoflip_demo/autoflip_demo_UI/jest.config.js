module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globals: {
    URL: 'http://localhost:4444',
  },
  testMatch: ['**/test/**/*.test.js'],
  verbose: true,
};
