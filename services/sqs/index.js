'use strict';

const {
    SQSClient,
    ReceiveMessageCommand,
    SendMessageCommand,
    DeleteMessageCommand
} = require('@aws-sdk/client-sqs');

function createSqsService(opts) {
    const {logger} = opts;
    delete opts.logger;

    const client = new SQSClient({region: 'eu-west-2', endpoint: 'http://localhost:4566'});

    async function sendSQS(input, message) {
        logger.info('SQS Message Sending');
        input.MessageBody = message;
        const command = new SendMessageCommand(input);
        const response = await client.send(command);
        return response;
    }

    async function deleteSQS(input) {
        const command = new DeleteMessageCommand(input);
        const response = await client.send(command);
        logger.info('SQS Message Deleted');
        logger.info(response);
    }

    async function receiveSQS(input) {
        while (true) {
            const command = new ReceiveMessageCommand(input);
            const response = client.send(command);
            if (response.Messages) {
                logger.info('SQS Message Received:');
                logger.info(response);
                return response.Messages[0];
            }
        }
    }

    return Object.freeze({
        sendSQS,
        deleteSQS,
        receiveSQS
    });
}

module.exports = createSqsService;
