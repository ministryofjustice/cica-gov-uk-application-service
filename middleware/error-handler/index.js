'use strict';

// TODO: make this standalone and pass it to a middleware function.

const VError = require('verror');

// Central error handler
// https://www.joyent.com/node-js/production/design/errors
// https://github.com/i0natan/nodebestpractices/blob/master/sections/errorhandling/centralizedhandling.md
module.exports = async (err, req, res, next) => {
    const error = {errors: []};

    // handle a malformed JSON request e.g. can't be parsed by the bodyparser (express.json)
    // https://github.com/expressjs/body-parser/issues/122#issuecomment-328190379
    if ('type' in err && err.type === 'entity.parse.failed') {
        error.errors.push({
            status: 400,
            title: 'Bad Request',
            detail: 'Request JSON is malformed'
        });

        return res.status(400).json(error);
    }

    // Convert express-openapi-validator errors to JSON:API format
    // express-openapi-validator errors format:
    // [
    //     {
    //         "path": "data.type",
    //         "errorCode": "enum.openapi.validation",
    //         "message": "should be equal to one of the allowed values",
    //         "location": "body"
    //     },
    //     {
    //         "path": "data.attributes.templateName",
    //         "errorCode": "type.openapi.validation",
    //         "message": "should be string",
    //         "location": "body"
    //     }
    // ]
    if (err.status === 400) {
        err.errors.forEach(errorObj => {
            error.errors.push({
                status: 400,
                title: '400 Bad Request',
                detail: errorObj.message,
                source: {pointer: `/${errorObj.path.replace(/\./g, '/')}`}
            });
        });

        return res.status(400).json(error);
    }

    // Convert ajv errors to JSON:API format
    // AJV errors format:
    // [
    //     {
    //         keyword: "additionalProperties",
    //         dataPath: "",
    //         schemaPath: "#/additionalProperties",
    //         params: {
    //         additionalProperty: "q-applicant-british-citizen-or-eu-nationalz"
    //         },
    //         message: "should NOT have additional properties"
    //     },
    //     {
    //         keyword: "additionalProperties",
    //         dataPath: "",
    //         schemaPath: "#/additionalProperties",
    //         params: {
    //         additionalProperty: "foo"
    //         },
    //         message: "should NOT have additional properties"
    //     },
    //     {
    //         keyword: "errorMessage",
    //         dataPath: "",
    //         schemaPath: "#/errorMessage",
    //         params: {
    //         errors: [
    //             {
    //             keyword: "required",
    //             dataPath: "",
    //             schemaPath: "#/required",
    //             params: {
    //                 missingProperty: "q-applicant-british-citizen-or-eu-national"
    //             },
    //             message:
    //                 "should have required property 'q-applicant-british-citizen-or-eu-national'"
    //             }
    //         ]
    //         },
    //         message: "Select yes if you are a British citizen or EU national"
    //     }
    // ]
    if (err.name === 'JSONSchemaValidationError') {
        const errorInfo = VError.info(err);
        const jsonApiErrors = errorInfo.schemaErrors.map(errorObj => ({
            status: 400,
            title: '400 Bad Request',
            detail: errorObj.message,
            code: errorObj.keyword,
            // The validation is happening on the properties of /data/attributes. This causes the dataPath
            // to be empty as it's technically the top level. Prefix all pointers with the parent path.
            source: {pointer: `/data/attributes${errorObj.dataPath}`},
            meta: {
                // include the raw ajv error
                raw: errorObj
            }
        }));

        error.errors.push(...jsonApiErrors);
        error.meta = {
            schema: errorInfo.schema,
            answers: errorInfo.coercedAnswers
        };

        return res.status(400).json(error);
    }

    // questionnaire submission bulk error response.
    // https://www.keycdn.com/support/422-unprocessable-entity
    if (err.name === 'JSONSchemaValidationErrors') {
        const errorInfo = VError.info(err);
        const jsonApiErrors = errorInfo.schemaErrors.map(errorObj => ({
            status: 422,
            title: '422 Unprocessable Entity',
            detail: errorObj[0].message,
            code: errorObj[0].keyword,
            // The validation is happening on the properties of /data/attributes. This causes the dataPath
            // to be empty as it's technically the top level. Prefix all pointers with the parent path.
            source: {pointer: `/data/attributes${errorObj[0].dataPath}`},
            meta: {
                // include the raw ajv error
                raw: errorObj[0]
            }
        }));

        error.errors.push(...jsonApiErrors);
        error.meta = {
            submissions: errorInfo.submissions
        };

        return res.status(200).json(error);
    }

    if (err.name === 'UpdateNotSuccessful') {
        error.errors.push({
            status: 500,
            title: 'UpdateNotSuccessful',
            detail: err.message
        });

        return res.status(404).json(error);
    }

    if (err.statusCode === 400) {
        error.errors.push({
            status: 400,
            title: '400 Bad Request',
            detail: err.message
        });

        return res.status(400).json(error);
    }

    if (err.statusCode === 403) {
        error.errors.push({
            status: 403,
            title: '403 Forbidden',
            detail: err.message
        });

        return res.status(403).json(error);
    }

    if (err.statusCode === 404) {
        error.errors.push({
            status: 404,
            title: '404 Not Found',
            detail: err.message
        });

        return res.status(404).json(error);
    }

    if (err.name === 'ResourceNotFound') {
        error.errors.push({
            status: 404,
            title: '404 Not Found',
            detail: err.message
        });

        return res.status(404).json(error);
    }

    if (err.statusCode === 409) {
        error.errors.push({
            status: 409,
            title: '409 Conflict',
            detail: err.message
        });

        return res.status(409).json(error);
    }

    if (err.name === 'UnauthorizedError') {
        error.errors.push({
            status: 401,
            title: '401 Unauthorized',
            detail: err.message
        });

        return res.status(401).json(error);
    }

    // Non-operational error
    return next(err);
};
