// Mock Chrome API
global.chrome = {
    runtime: {
        sendMessage: jest.fn(),
        onMessage: {
            addListener: jest.fn(),
        },
    },
    storage: {
        local: {
            get: jest.fn(),
            set: jest.fn(),
        },
        sync: {
            get: jest.fn(),
            set: jest.fn(),
        },
    },
};

// Mock DOM elements/API if needed
global.console = {
    ...console,
    // error: jest.fn(), // Uncomment to silence errors
    log: jest.fn(),
};

// Mock other globals if used
global.window = global;
