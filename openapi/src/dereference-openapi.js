'use strict';

// eslint-disable-next-line import/no-extraneous-dependencies
const $RefParser = require('json-schema-ref-parser');
const fs = require('fs');

(async () => {
    const dereferencedContract = await $RefParser.dereference('openapi/openapi.json');

    fs.writeFile('openapi/openapi.json', JSON.stringify(dereferencedContract, null, 4), err => {
        // throws an error, you could also catch it here
        if (err) {
            throw err;
        }

        // success case, the file was saved
        // eslint-disable-next-line
        console.log('dereferenced contract saved');
    });
})();
