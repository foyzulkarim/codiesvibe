export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    // Strip .js extension from # imports (must be before the main # mappings)
    '^#config/(.*)\\.js$': '<rootDir>/src/config/$1',
    '^#types/(.*)\\.js$': '<rootDir>/src/types/$1',
    '^#services/(.*)\\.js$': '<rootDir>/src/services/$1',
    '^#utils/(.*)\\.js$': '<rootDir>/src/utils/$1',
    '^#middleware/(.*)\\.js$': '<rootDir>/src/middleware/$1',
    '^#models/(.*)\\.js$': '<rootDir>/src/models/$1',
    '^#routes/(.*)\\.js$': '<rootDir>/src/routes/$1',
    '^#graphs/(.*)\\.js$': '<rootDir>/src/graphs/$1',
    '^#nodes/(.*)\\.js$': '<rootDir>/src/nodes/$1',
    '^#core/(.*)\\.js$': '<rootDir>/src/core/$1',
    '^#shared/(.*)\\.js$': '<rootDir>/src/shared/$1',
    '^#domains/(.*)\\.js$': '<rootDir>/src/domains/$1',
    '^#controllers/(.*)\\.js$': '<rootDir>/src/controllers/$1',
    '^#validation/(.*)\\.js$': '<rootDir>/src/validation/$1',
    '^#schemas/(.*)\\.js$': '<rootDir>/src/schemas/$1',
    // Main # mappings (without .js)
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
    '^#controllers/(.*)$': '<rootDir>/src/controllers/$1',
    '^#validation/(.*)$': '<rootDir>/src/validation/$1',
    '^#schemas/(.*)$': '<rootDir>/src/schemas/$1',
    // Strip .js from relative imports
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
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.spec.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/mocks/',
    '/__tests__/fixtures/',
    '/__tests__/setup.ts'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/test/**',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json'
  ],
  coverageThreshold: {
    global: {
      branches: 65,
      functions: 75,
      lines: 70,
      statements: 70
    }
  },
  // setupFiles runs BEFORE test framework - sets env vars before dotenv loads
  setupFiles: ['<rootDir>/src/__tests__/setup-env.ts'],
  // setupFilesAfterEnv runs AFTER test framework - sets up mocks and utilities
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  verbose: true,
  testTimeout: 10000,
  clearMocks: true,
  restoreMocks: true
};
