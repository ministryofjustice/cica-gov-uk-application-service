'use strict';

const defaults = {};
defaults.crypto = require('crypto');
defaults.createFooDAL = require('./foo-dal');

function createFooService({
    logger,
    crypto = defaults.crypto,
    createFooDAL = defaults.createFooDAL
} = {}) {
    const db = createFooDAL({logger});

    function UUIDv4() {
        return crypto.randomUUID();
    }

    function convertStringToBoolean(foo) {
        Object.entries(foo).forEach(entry => {
            const [key, value] = entry;

            if (value === 'No') {
                foo[key] = false;
            }
        });

        return foo;
    }

    async function createFoo(barAttributeValue) {
        const fooId = UUIDv4();
        const foo = {
            'bar-attribute': barAttributeValue,
            'biz-attribute': 'No',
            'baz-attribute': true
        };

        await db.createFoo(fooId, foo);

        return {
            type: 'foos',
            id: fooId,
            attributes: foo
        };
    }

    async function getResource(fooId, resourceVersion = '1.0.0') {
        const foo = await db.getFoo(fooId);

        if (resourceVersion === '1.0.0') {
            return [
                {
                    type: 'foos',
                    id: fooId,
                    attributes: foo
                }
            ];
        }

        if (resourceVersion === '2.0.0') {
            const modifiedFoo = convertStringToBoolean(foo);

            return [
                {
                    type: 'foos',
                    id: fooId,
                    attributes: modifiedFoo
                }
            ];
        }

        throw Error(`Foo resource version "${resourceVersion}" is unsupported`);
    }

    return Object.freeze({
        getResource,
        createFoo
    });
}

module.exports = createFooService;
