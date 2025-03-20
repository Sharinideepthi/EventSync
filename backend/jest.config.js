module.exports = {
  testEnvironment: "node",
  verbose: true,
  collectCoverage: true,
  coverageDirectory: "coverage",
  testMatch: ["**/__tests__/**/*.js", "**/?(*.)+(spec|test).js"],
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/coverage/",
    "/__tests__/fixtures/",
  ],
  testPathIgnorePatterns: [
    "__tests__/mocks/",
    "__tests__/setup.js"
  ],
  setupFilesAfterEnv: ["./__tests__/setup.js"],
};
