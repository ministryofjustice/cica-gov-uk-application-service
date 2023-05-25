'use strict';

const createS3Service = require('../s3');
const createSqsService = require('../sqs');
const createPdfService = require('../pdf');

const dcsQueue = process.env.APPLICATION_QUEUE_ID;
const tempusQueue = process.env.TEMPUS_QUEUE_ID;

/**
 * Processes a json message through the application service, prodcuing the pdf and
 *  sending a message to the Tempus queue when done.
 * @param {string} responseMessage - The message picked up from the queue
 */
async function processMessage(responseMessage) {
    const bucket = process.env.S3_URL;

    const sendInput = {
        QueueUrl: tempusQueue
    };

    const jsonKey = responseMessage.Body;
    const pdfLocation = 'stream-stream-test5.pdf';

    const deleteInput = {
        QueueUrl: dcsQueue,
        ReceiptHandle: responseMessage.ReceiptHandle
    };

    const sqsService = createSqsService();
    await sqsService.deleteSQS(deleteInput);

    const s3Service = createS3Service();
    const s3Json = await s3Service.getFromS3(bucket, jsonKey);

    const pdfService = createPdfService();
    await pdfService.writeJSONToPDF(s3Json, pdfLocation);

    await s3Service.putInS3(bucket, pdfLocation);

    const sendObject = `{ pdfKey : ${pdfLocation}, jsonKey : ${jsonKey}}`;

    sqsService.sendSQS(sendInput, sendObject);
}

/** Runs the application service */
async function applicationService() {
    const sqsService = createSqsService();

    setInterval(async function() {
        const receiveInput = {
            QueueUrl: dcsQueue,
            MaxNumberOfMessages: 10
        };
        const response = await sqsService.receiveSQS(receiveInput);
        if (response.Messages) {
            processMessage(response.Messages[0]);
        }
    }, 10000);
}

module.exports = applicationService;
