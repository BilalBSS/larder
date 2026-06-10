// / jest-expo rn harness
const expoPreset = require('jest-expo/jest-preset');

module.exports = {
  ...expoPreset,
  roots: ['<rootDir>/tests/ui'],
  setupFiles: [...(expoPreset.setupFiles ?? []), '<rootDir>/jest.env.js'],
  setupFilesAfterEnv: [...(expoPreset.setupFilesAfterEnv ?? []), '<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    ...expoPreset.moduleNameMapper,
    '^@/(.*)$': '<rootDir>/$1',
    '^@app/(.*)$': '<rootDir>/app/$1',
    '^@components/(.*)$': '<rootDir>/components/$1',
    '^@foundation/(.*)$': '<rootDir>/src/foundation/$1',
    '^@domain/(.*)$': '<rootDir>/src/domain/$1',
    '^@data/(.*)$': '<rootDir>/src/data/$1',
    '^@ui/(.*)$': '<rootDir>/src/ui/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|nativewind|react-native-css-interop|react-native-reanimated|react-native-worklets|@shopify/flash-list))',
  ],
  collectCoverageFrom: [
    'src/ui/**/*.{ts,tsx}',
    'components/shopping/**/*.{ts,tsx}',
    'components/pantry/**/*.{ts,tsx}',
    'src/foundation/context.tsx',
    'src/domain/use-cases/auth/**/*.ts',
    'app/\\(auth\\)/**/*.{ts,tsx}',
    'app/\\(tabs\\)/**/*.tsx',
    'app/add-item.tsx',
    'app/item/**/*.tsx',
    'app/currency.tsx',
    'app/scan.tsx',
    'app/add.tsx',
    'components/scan/**/*.{ts,tsx}',
    'app/join/**/*.tsx',
    'src/shell/**/*.{ts,tsx}',
    '!**/index.ts',
  ],
  coverageThreshold: {
    global: { statements: 60, branches: 60, functions: 60, lines: 60 },
  },
};
