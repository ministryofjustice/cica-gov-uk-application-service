'use strict';

const express = require('express');
const {expressjwt: validateJWT} = require('express-jwt');

const permissions = require('../middleware/route-permissions');
const createFooService = require('./foo-service');

// TODO: DO NOT PUT THE SECRET HERE!!!!! FOR DEMO PURPOSES ONLY
process.env.DCS_JWT_SECRET = '';
// JWT using above secret

const router = express.Router();

// Ensure JWT is valid
router.use(validateJWT({secret: process.env.DCS_JWT_SECRET, algorithms: ['HS256']}));

router
    .route('/')
    .post(permissions('read:questionnaires', 'read:answers'), async (req, res, next) => {
        try {
            const barAttribute = req.body?.data?.attributes?.['bar-attribute'];
            const fooService = createFooService({logger: req.log});
            const resource = await fooService.createFoo(barAttribute);

            res.status(200).json({
                data: resource
            });
        } catch (err) {
            next(err);
        }
    });

router
    .route('/:fooId')
    .get(permissions('read:questionnaires', 'read:answers'), async (req, res, next) => {
        try {
            const {fooId} = req.params;
            const resourceVersion = req.get('Accept-Version');
            const fooService = createFooService({logger: req.log});
            const resource = await fooService.getResource(fooId, resourceVersion);

            res.header('Content-Version', resourceVersion);
            res.status(200).json({
                data: resource
            });
        } catch (err) {
            next(err);
        }
    });

module.exports = router;
