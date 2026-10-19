module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  watchman: false,
  testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }]
  },
  verbose: true,
  forceExit: true,
  clearMocks: true,
  testTimeout: 60000
};
