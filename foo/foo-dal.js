/* eslint-disable no-unused-vars */

'use strict';

const defaults = {};
defaults.VError = require('verror');
defaults.createDBQuery = require('../db');

function createFooDAL({
    logger,
    VError = defaults.VError,
    createDBQuery = defaults.createDBQuery
} = {}) {
    const db = createDBQuery({logger});

    async function createFoo(uuidV4, foo) {
        // DO SOME ACTUAL DATABASE STUFF
        //
        // const result = await db.query(
        //     'INSERT INTO foo (id, foo, created, modified) VALUES($1, $2, current_timestamp, current_timestamp)',
        //     [uuidV4, foo]
        // );
        //
        // return result;

        return {created: true};
    }

    async function getFoo(fooId) {
        // DO SOME ACTUAL DATABASE STUFF
        //
        // const result = await db.query('SELECT foo FROM foos WHERE id = $1', [fooId]);
        //
        // if (result.rowCount === 0) {
        //     // No instance was found
        //     throw new VError(
        //         {
        //             name: 'ResourceNotFound'
        //         },
        //         `Foo "${fooId}" not found`
        //     );
        // }
        //
        // return result.rows[0].foo;

        return {
            'biz-attribute': 'No',
            'baz-attribute': true
        };
    }

    return Object.freeze({
        createFoo,
        getFoo
    });
}

module.exports = createFooDAL;
