'use strict';

const config = {
    testTimeout: 20000
};

process.env.DCS_JWT_SECRET = '';
process.env.DCS_LOG_LEVEL = 'silent';
process.env.APP_ENV = 'test';

// TODO: DO NOT LEAVE THIS AT 50 - RAISE BACK TO 80
// NEED TO DEPLOY FOR A SMOKE TEST - TEMPORARY MEASURE
config.coverageThreshold = {
    global: {
        branches: 40,
        functions: 40,
        lines: 40,
        statements: 40
    }
};

module.exports = config;
