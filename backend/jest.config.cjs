/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: "src",
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.(t|j)s$": "ts-jest",
  },
  collectCoverageFrom: [
    "**/*.service.ts",
    "common/**/*.ts",
    "auth/password.util.ts",
    "!**/*.module.ts",
    "!main.ts",
  ],
  coverageDirectory: "../coverage",
  testEnvironment: "node",
};
