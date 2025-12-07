export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^#config/(.*)$': '<rootDir>/src/config/$1',
    '^#types/(.*)$': '<rootDir>/src/types/$1',
    '^#services/(.*)$': '<rootDir>/src/services/$1',
    '^#utils/(.*)$': '<rootDir>/src/utils/$1',
    '^#middleware/(.*)$': '<rootDir>/src/middleware/$1',
    '^#models/(.*)$': '<rootDir>/src/models/$1',
    '^#routes/(.*)$': '<rootDir>/src/routes/$1',
    '^#graphs/(.*)$': '<rootDir>/src/graphs/$1',
    '^#nodes/(.*)$': '<rootDir>/src/nodes/$1',
    '^#core/(.*)$': '<rootDir>/src/core/$1',
    '^#shared/(.*)$': '<rootDir>/src/shared/$1',
    '^#domains/(.*)$': '<rootDir>/src/domains/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  roots: ['<rootDir>/test/e2e'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
  ],
  coverageDirectory: 'coverage/e2e',
  verbose: true,
  testTimeout: 120000,
  setupFilesAfterEnv: ['<rootDir>/test/e2e/setup.ts'],
};
