// https://kulshekhar.github.io/ts-jest/docs/getting-started/presets
import { createDefaultPreset, pathsToModuleNameMapper } from 'ts-jest';
import type { JestConfigWithTsJest } from 'ts-jest';
import { compilerOptions } from './tsconfig.json';

const defaultPreset = createDefaultPreset();

// https://kulshekhar.github.io/ts-jest/docs/getting-started/paths-mapping
const jestConfig: JestConfigWithTsJest = {
  testEnvironment: "node",
  ...defaultPreset,
  roots: ['<rootDir>'],
  modulePaths: [compilerOptions.baseUrl], // <-- This will be set to 'baseUrl' value
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths /*, { prefix: '<rootDir>/' } */),
};

export default jestConfig;