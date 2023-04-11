'use strict';

const fs = require('fs');
const {Pool} = require('pg');

const cert = fs.readFileSync(`${process.cwd()}/ca/rds-combined-ca-bundle.pem`).toString();
const pool = new Pool({
    connectionString: process.env.DATABASE_URL_WITH_CREDENTIALS,
    ssl: process.env.NODE_ENV === 'production' ? {ca: cert} : false
});

function createDBQuery(spec) {
    const {logger} = spec;

    // https://node-postgres.com/guides/project-structure
    async function query(text, params) {
        const hrstart = process.hrtime();
        const results = await pool.query(text, params);
        const hrend = process.hrtime(hrstart);
        const executionTime = {
            seconds: hrend[0],
            milliseconds: hrend[1] / 1000000
        };
        const duration = `${executionTime.seconds}s ${executionTime.milliseconds}ms`;

        logger.info(
            {query: {text, duration, executionTime, rows: results.rowCount}},
            'DB QUERY EXECUTED'
        );

        return results;
    }

    return Object.freeze({
        query
    });
}

module.exports = createDBQuery;
