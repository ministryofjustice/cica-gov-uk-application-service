'use strict';

const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const path = require('path');
const OpenApiValidator = require('express-openapi-validator');
const errorHandler = require('./middleware/error-handler');
const docsRouter = require('./docs/routes');
const fooRouter = require('./foo/foo-routes');
const applicationService = require('./services/applicationService');

process.env.DCS_LOG_LEVEL = 'debug';

const app = express();

app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", 'data:'],
                objectSrc: ["'none'"]
            }
        },
        hsts: {
            maxAge: 60 * 60 * 24 * 365 // the units is seconds.
        }
    })
);

// https://expressjs.com/en/api.html#express.json
app.use(express.json({type: 'application/vnd.api+json'}));
// https://expressjs.com/en/api.html#express.urlencoded
app.use(express.urlencoded({extended: true}));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, 'public')));

app.use('/docs', docsRouter);

app.use((req, res, next) => {
    // Default to JSON:API content type for all subsequent responses
    res.type('application/vnd.api+json');
    // https://stackoverflow.com/a/22339262/2952356
    // `process.env.npm_package_version` only works if you use npm start to run the app.
    res.set('Application-Version', process.env.npm_package_version);

    next();
});

// Install the OpenApiValidator onto express app
app.use(
    OpenApiValidator.middleware({
        apiSpec: './openapi/openapi.json',
        validateRequests: true,
        validateResponses: false,
        validateSecurity: false
    })
);

app.use('/api/v1/foos', fooRouter);

// Express doesn't treat 404s as errors. If the following handler has been reached then nothing else matched e.g. a 404
// https://expressjs.com/en/starter/faq.html#how-do-i-handle-404-responses
app.use(req => {
    const err = Error(`Endpoint ${req.url} does not exist`);
    err.name = 'HTTPError';
    err.statusCode = 404;
    err.error = '404 Not Found';
    throw err;
});

app.use((err, req, res, next) => {
    // Get pino to attach the correct error and stack trace to the log entry
    // https://github.com/pinojs/pino-http/issues/61
    res.err = {
        name: err.name,
        message: err.message,
        stack: err.stack
    };

    // forward the centralised error handler
    next(err);
});

// Central error handler
// https://www.joyent.com/node-js/production/design/errors
// https://github.com/i0natan/nodebestpractices/blob/master/sections/errorhandling/centralizedhandling.md
app.use(errorHandler);

module.exports = app;

applicationService();
