/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.cjs"],
  roots: ["<rootDir>/tests/unit"],
  testMatch: ["**/*.spec.ts", "**/*.test.tsx"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          jsx: "react-jsx",
          esModuleInterop: true,
          module: "commonjs",
          moduleResolution: "node",
        },
      },
    ],
  },
  collectCoverageFrom: [
    "services/**/*.ts",
    "components/templates/**/*.tsx",
    "domain/**/*.ts",
    "!services/index.ts",
    "!components/templates/index.ts",
    "!domain/index.ts",
  ],
  coverageDirectory: "<rootDir>/coverage",
};
