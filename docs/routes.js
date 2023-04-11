'use strict';

const express = require('express');
const swaggerUi = require('swagger-ui-express');

const swaggerDocument = require('../openapi/openapi.json');

const router = express.Router();

// Ensure JWT is valid
// router.use(validateJWT({secret: process.env.SECRET}));
router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(swaggerDocument));

module.exports = router;
