'use strict';

const {mockClient} = require('aws-sdk-client-mock');
const {
    SendMessageCommand,
    ReceiveMessageCommand,
    DeleteMessageCommand,
    SQSClient
} = require('@aws-sdk/client-sqs');
const fs = require('fs');
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
        const testMessage = fs.readFileSync('resources/testing/queueMessage.json');
        sqsMock.on(ReceiveMessageCommand).resolves(testMessage);

        // Act
        const sqsService = createSQSService();
        const response = await sqsService.receiveSQS({
            QueueUrl: 'Queue',
            MaxNumberOfMessages: 10
        });

        // Assert
        logger.info(response);
        expect(Object.keys(response)).toContain('S3Key');
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

    it('Should throw an error if the file types are wrong', async () => {
        // Arrange
        const testMessage = fs.readFileSync('resources/testing/invalidQueueMessage.json');
        sqsMock.on(ReceiveMessageCommand).resolves(testMessage);

        // Act and Assert
        const sqsService = createSQSService();
        await expect(sqsService.receiveSQS(testMessage)).rejects.toThrowError(
            'Application queue message held an invalid file type, only .json is supported'
        );
    });

    it('Should error if file is not valid json', async () => {
        // Arrange
        const testMessage = fs.readFileSync('resources/testing/invalidJson.txt');
        sqsMock.on(ReceiveMessageCommand).resolves(testMessage);

        // Act and Assert
        const sqsService = createSQSService();
        await expect(sqsService.receiveSQS(testMessage)).rejects.toThrowError(SyntaxError);
    });
});
