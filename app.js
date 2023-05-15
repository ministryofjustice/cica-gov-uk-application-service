'use strict';

const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const path = require('path');
const OpenApiValidator = require('express-openapi-validator');
const pino = require('pino-http');
const errorHandler = require('./middleware/error-handler');
const docsRouter = require('./docs/routes');
const fooRouter = require('./foo/foo-routes');
const createS3Service = require('./services/s3');
const createSqsService = require('./services/sqs');
const createPdfService = require('./services/pdf');

process.env.DCS_LOG_LEVEL = 'debug';

const app = express();
const logger = pino({
    level: process.env.DCS_LOG_LEVEL,
    redact: {
        paths: ['req.headers.authorization'],
        censor: unredactedValue => {
            const authorizationHeaderParts = unredactedValue.split('.');
            return authorizationHeaderParts.length > 1
                ? `Bearer REDACTED.${authorizationHeaderParts[1]}.REDACTED`
                : 'REDACTED';
        }
    },
    prettyPrint:
        process.env.NODE_ENV === 'production'
            ? false
            : {
                  levelFirst: true,
                  colorize: true,
                  translateTime: true
                  // errorProps: 'req,res'
              },
    customLogLevel: (res, err) => {
        if (res.statusCode >= 400 && res.statusCode < 500) {
            return 'warn';
        }

        if (res.statusCode >= 500 || err) {
            return 'error';
        }

        return 'info';
    }
});

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

// logging
app.use(logger);
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

const sendInput = {
    QueueUrl: 'http://localhost:4566/000000000000/TempusQueue'
};

const receiveInput = {
    QueueUrl: 'http://localhost:4566/000000000000/ACQueue',
    MaxNumberOfMessages: 10
};

const pdfLocation = 'freshTest.pdf';
const bucket = 'application-bucket';

async function applicationService() {
    const sqsService = createSqsService({logger});
    logger.info('Testing logger');
    const responseMessage = await sqsService.receiveSQS(receiveInput);
    const jsonKey = responseMessage.Body;

    await sqsService.deleteSQS({
        QueueUrl: receiveInput.QueueUrl,
        ReceiptHandle: responseMessage.ReceiptHandle
    });

    const s3Service = createS3Service({logger});
    const s3Json = await s3Service.getFromS3(bucket, jsonKey);

    const pdfService = createPdfService({logger});
    await pdfService.writeJSONToPDF(s3Json, pdfLocation);

    await s3Service.putInS3(bucket, pdfLocation);

    sqsService.sendSQS(sendInput, pdfLocation);
    sqsService.sendSQS(sendInput, jsonKey);
}

applicationService();
