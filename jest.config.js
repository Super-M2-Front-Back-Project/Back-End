module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'services/**/*.js',
    'utils/**/*.js',
    'controller/**/*.js',
    '!**/node_modules/**',
    '!**/coverage/**'
  ],
  testMatch: ['**/__tests__/**/*.test.js'],
  verbose: true,
  testTimeout: 10000,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};
