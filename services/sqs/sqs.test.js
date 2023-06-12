'use strict';

const {mockClient} = require('aws-sdk-client-mock');
const {
    SendMessageCommand,
    ReceiveMessageCommand,
    DeleteMessageCommand,
    SQSClient
} = require('@aws-sdk/client-sqs');
const createSQSService = require('./index');
const logger = require('../logging/logger');

describe('SQS Service', () => {
    const sqsMock = mockClient(SQSClient);

    it('Should send a message to the queue', async () => {
        // Arrange
        sqsMock.on(SendMessageCommand).resolves('Message Sent');
        const sqsInput = {
            QueueUrl: 'Queue',
            MaxNumberOfMessages: 10
        };
        const testMessage = `{
      "applicationPDFDocumentSummaryKey": "pdfLoc",
      "applicationJSONDocumentSummaryKey": "jsonKey"
    }`;

        // Act
        const sqsService = createSQSService();
        const queueMessage = await sqsService.sendSQS(sqsInput, testMessage);

        // Assert
        expect(queueMessage).toBe('Message Sent');
    });

    it('Should receive a message from the queue', async () => {
        // Arrange
        const testMessage = {Body: '23/123456'};
        sqsMock.on(ReceiveMessageCommand).resolves(testMessage);

        // Act
        const sqsService = createSQSService();
        const queueMessage = await sqsService.receiveSQS({
            QueueUrl: 'Queue',
            MaxNumberOfMessages: 10
        });

        // Assert
        logger.info(queueMessage);
        expect(queueMessage).toBe(testMessage);
    });

    it('Should delete a message from the queue', async () => {
        // Arrange
        sqsMock.on(DeleteMessageCommand).resolves('Message Deleted');

        // Act
        const sqsService = createSQSService();
        const response = await sqsService.deleteSQS({
            QueueUrl: 'Queue',
            ReceiptHandle: 'Receipt Handle'
        });

        // Assert
        logger.info(response);
        expect(response).toBe('Message Deleted');
    });
});
