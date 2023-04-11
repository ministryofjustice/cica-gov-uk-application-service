'use strict';

const jwtAuthz = require('express-jwt-authz');

// express-jwt-authz doesnt allow the "failWithError" opt to be set globally,
// wrap it to avoid passing it in manually on every call
function permissions(...scopes) {
    // This returns a middleware function
    return jwtAuthz(scopes, {failWithError: true, customUserKey: 'auth'});
}

module.exports = permissions;
