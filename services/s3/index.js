'use strict';

const fs = require('fs');
const {GetObjectCommand, PutObjectCommand, S3Client} = require('@aws-sdk/client-s3');

function createS3Service(opts) {
    const {logger} = opts;
    delete opts.logger;

    const s3client = new S3Client({region: 'eu-west-2', endpoint: 'http://localhost:4566'});

    async function getFromS3(bucket, key) {
        const content = {
            Bucket: bucket,
            Key: `${bucket}/${key}`
        };

        try {
            logger.info('Getting from S3');
            const response = await s3client.send(new GetObjectCommand(content));
            logger.info('Got from S3:');
            const str = await response.Body.transformToString();
            const json = JSON.parse(str);
            logger.info(json);
            return json;
        } catch (err) {
            logger.error(err);
        }
        return false;
    }

    async function putInS3(bucket, pdf) {
        logger.info('Putting in S3');
        fs.readFile(`./${pdf}`, async function(err, data) {
            if (err) {
                console.error(err);
            }
            const command = new PutObjectCommand({
                Bucket: bucket,
                Key: `${bucket}/${pdf}`,
                Body: data,
                contentType: 'application/pdf'
            });

            try {
                const response = await s3client.send(command);
                return response;
            } catch (errr) {
                console.error(errr);
                return {};
            }
        });
    }

    return Object.freeze({
        getFromS3,
        putInS3
    });
}

module.exports = createS3Service;
