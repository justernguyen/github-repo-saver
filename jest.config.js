module.exports = {
    testEnvironment: 'jsdom',
    roots: ['<rootDir>/tests'],
    moduleDirectories: ['node_modules', '<rootDir>/dashboard'],
    // Setup global variables for Chrome Extension mock
    setupFiles: ['<rootDir>/tests/setup.js'],
    transform: {
        // Handle plain JS files
        '^.+\\.jsx?$': 'babel-jest',
    },
    // Since we are not using Babel yet, we might need default transforms or specific handling for ES modules if needed.
    // But for now, let's keep it simple. If Jest complains about imports, we'll fix it.
    // Actually, Jest supports CommonJS by default. Our files are "mixed" (some have exports, some use globals).
    // We might need to adjust our source code to be testable (CommonJS exports) 
    // OR use a babel setup. Let's start with a simple setup.
};
