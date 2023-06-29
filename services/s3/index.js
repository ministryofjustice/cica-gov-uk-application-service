'use strict';

const fs = require('fs');
const {GetObjectCommand, PutObjectCommand, S3Client} = require('@aws-sdk/client-s3');
const logger = require('../logging/logger');

/** Returns S3 Service object with functions to get objects from an S3 bucket and put objects in an S3 bucket */

function createS3Service() {
    const s3client = new S3Client({
        region: 'eu-west-2',
        credentials: {
            accessKeyId: process.env.ACCESS_KEY,
            secretAccessKey: process.env.SECRET_ACCESS_KEY
        },
        endpoint: process.env.NODE_ENV === 'local' ? 'http://localhost:4566' : undefined,
        forcePathStyle: !!(process.env.NODE_ENV === 'local')
    });

    /**
     * Gets a JSON object with a key that matches the given key from a given S3 bucket
     * @param {string} bucket - The bucket to get the object from
     * @param {string} key - The key to match with a json in the bucket
     * @returns JSON object from bucket with key matching given key
     */
    async function getFromS3(bucket, key) {
        // validates that the S3 response is a JSON
        function validateS3Response(response) {
            if (response.ContentType !== 'application/json') {
                throw new Error(`${response.ContentType} content type is not supported`);
            } else {
                logger.info('File retrieved from S3 is valid');
            }
        }
        logger.info(process.env.KMS_KEY);
        const content = {
            Bucket: bucket,
            Key: `${key}`,
            ServerSideEncryption: 'aws:kms',
            SSEKMSKeyId: process.env.KMS_KEY
        };

        try {
            logger.info('Getting from S3');
            const response = await s3client.send(new GetObjectCommand(content));
            logger.info('Got from S3');
            validateS3Response(response);
            const str = await response.Body.transformToString();
            const json = JSON.parse(str);
            return json;
        } catch (err) {
            logger.error(err);
            throw err;
        }
    }

    /**
     * Puts given pdf in a given S3 bucket
     * @param {string} bucket - The bucket to put the pdf in
     * @param {string} pdf  - The name of the pdf to be put into S3
     */
    async function putInS3(bucket, object, key) {
        logger.info('Putting in S3');
        let data;
        fs.readFile(`./${object}`, function(err, file) {
            if (err) {
                logger.error(err);
            }
            data = file;
        });

        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: `${key}`,
            Body: data,
            contentType: 'application/pdf',
            ServerSideEncryption: 'aws:kms',
            SSEKMSKeyId: process.env.KMS_KEY
        });

        try {
            const response = await s3client.send(command);
            logger.info(response);
            return response;
        } catch (errr) {
            logger.error(errr);
            return {};
        }
    }

    return Object.freeze({
        getFromS3,
        putInS3
    });
}

module.exports = createS3Service;
