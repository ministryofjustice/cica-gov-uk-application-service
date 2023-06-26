'use strict';

const {
    SQSClient,
    ReceiveMessageCommand,
    SendMessageCommand,
    DeleteMessageCommand
} = require('@aws-sdk/client-sqs');
const logger = require('../logging/logger');

/** Returns SQS Service object with functions to send, delete and receive messages from a SQS queue */
function createSqsService() {
    const client = new SQSClient({
        region: 'eu-west-2',
        credentials: {
            accessKeyId: process.env.ACCESS_KEY,
            secretAccessKey: process.env.SECRET_ACCESS_KEY
        },
        endpoint: process.env.NODE_ENV === 'local' ? 'http://localhost:4566' : undefined
    });

    /**
     * Sends a given message to a given SQS queue
     * @param {object} input - The queue details
     * @param {string} message - The message to send to the queue
     * @returns SendMessageCommandOutput equal to the output given by the queue for the send command
     */
    async function sendSQS(input, message) {
        logger.info('SQS Message Sending');
        input.MessageBody = message;
        const command = new SendMessageCommand(input);
        const response = await client.send(command);
        logger.info(response);
        return response;
    }

    /**
     * Deletes a given message from a given SQS queue
     * @param {object} input - Contains the details of the queue and message to delete
     */
    async function deleteSQS(input) {
        const command = new DeleteMessageCommand(input);
        const response = await client.send(command);
        logger.info(response);
        return response;
    }

    /**
     * Validates that the keys received from the queue are all json keys
     * @param {object} keys - Contains the keys retrieved from the queue
     */
    function validateS3Keys(keys) {
        logger.info(keys);
        Object.values(keys).forEach(value => {
            if (value.endsWith('.json')) {
                logger.info(`S3 Key received from application queue: ${value}`);
            } else {
                throw new Error(
                    'Application queue message held an invalid file type, only .json is supported'
                );
            }
        });
    }

    /**
     * Receives the next message from a given queue
     * @param {object} input - The details of the queue to receive from
     * @returns Message received from the queue
     */
    async function receiveSQS(input) {
        const command = new ReceiveMessageCommand(input);
        const response = await client.send(command);
        const s3Keys = JSON.parse(response);
        validateS3Keys(s3Keys);
        return s3Keys;
    }

    return Object.freeze({
        sendSQS,
        deleteSQS,
        receiveSQS
    });
}

module.exports = createSqsService;
