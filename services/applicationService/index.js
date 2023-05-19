'use strict';

const createS3Service = require('../s3');
const createSqsService = require('../sqs');
const createPdfService = require('../pdf');

/** Runs the application service */
async function applicationService() {
    const bucket = 'application-bucket';

    const sendInput = {
        QueueUrl: 'http://localhost:4566/000000000000/TempusQueue'
    };

    const receiveInput = {
        QueueUrl: 'http://localhost:4566/000000000000/ACQueue',
        MaxNumberOfMessages: 10
    };

    const sqsService = createSqsService();
    const responseMessage = await sqsService.receiveSQS(receiveInput);
    const jsonKey = responseMessage.Body;
    const pdfLocation = 'stream-stream-test5.pdf';

    const deleteInput = {
        QueueUrl: receiveInput.QueueUrl,
        ReceiptHandle: responseMessage.ReceiptHandle
    };

    await sqsService.deleteSQS(deleteInput);

    const s3Service = createS3Service();
    const s3Json = await s3Service.getFromS3(bucket, jsonKey);

    const pdfService = createPdfService();
    await pdfService.writeJSONToPDF(s3Json, pdfLocation);

    await s3Service.putInS3(bucket, pdfLocation);

    const sendObject = `{ pdfKey : ${pdfLocation}, jsonKey : ${jsonKey}}`;

    sqsService.sendSQS(sendInput, sendObject);
}

module.exports = applicationService;
