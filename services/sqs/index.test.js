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
        const testMessage = fs.readFileSync('resources/testing/sqsMessage.json');
        sqsMock.on(ReceiveMessageCommand).resolves(testMessage);

        // Act
        const sqsService = createSQSService();
        const response = await sqsService.receiveSQS({
            QueueUrl: 'Queue',
            MaxNumberOfMessages: 10
        });

        // Assert
        expect(Object.keys(JSON.parse(response))).toContain('Messages');
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
        expect(response).toBe('Message Deleted');
    });
});
