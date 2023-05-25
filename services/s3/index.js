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
        }
    });

    /**
     * Gets a JSON object with a key that matches the given key from a given S3 bucket
     * @param {string} bucket - The bucket to get the object from
     * @param {string} key - The key to match with a json in the bucket
     * @returns JSON object from bucket with key matching given key
     */
    async function getFromS3(bucket, key) {
        const content = {
            Bucket: bucket,
            Key: `${bucket}/${key}`
        };

        try {
            logger.info('Getting from S3');
            const response = await s3client.send(new GetObjectCommand(content));
            logger.info('Got from S3');
            const str = await response.Body.transformToString();
            const json = JSON.parse(str);
            return json;
        } catch (err) {
            logger.error(err);
        }
        return false;
    }

    /**
     * Puts given pdf in a given S3 bucket
     * @param {string} bucket - The bucket to put the pdf in
     * @param {string} pdf  - The name of the pdf to be put into S3
     */
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
