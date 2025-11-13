module.exports = {
    "preset": "ts-jest",
    "testEnvironment": "node",
    "testMatch": [
        "**/__tests__/**/*.test.ts",
        "**/*.test.ts"
    ],
    "collectCoverageFrom": [
        "server.ts",
        "!**/*.d.ts",
        "!**/node_modules/**",
        "!**/dist/**"
    ],
    "coverageThresholds": {
        "global": {
            "branches": 70,
            "functions": 75,
            "lines": 80,
            "statements": 80
        }
    },
    "setupFilesAfterEnv": [
        "<rootDir>/jest.setup.ts"
    ],
    "testTimeout": 30000,
    "verbose": true,
    "forceExit": true,
    "detectOpenHandles": true,
    "maxWorkers": 1
};
export {};
//# sourceMappingURL=jest.config.js.map