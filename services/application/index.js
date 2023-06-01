'use strict';

const createS3Service = require('../s3');
const createSqsService = require('../sqs');
const createPdfService = require('../pdf');

const applicationQueue = process.env.APPLICATION_QUEUE_ID;
const tempusQueue = process.env.TEMPUS_QUEUE_ID;
const bucket = process.env.S3_BUCKET;

/**
 * Extracts the S3 location as a string from the SQS message.
 * @param {string} message - The SQS message received.
 */
function parseJSONLocation(message) {
    const messageBody = JSON.parse(message.Body);
    return messageBody.applicationJSONDocumentSummaryKey;
}

/**
 * Uses the case reference number from the application json to determine the upload
 * location of the generaed PDF summary form.
 * @param {string} applicationJson - The full application JSON from S3.
 */
function generatePDFLocation(applicationJson) {
    // Restructures case reference number to be - separated instead of \ separated.
    const refArr = applicationJson.meta.caseReference.split('\\');
    const refNumber = `${refArr[0]}-${refArr[refArr.length - 1]}`;

    return `${refNumber}/application-summary.pdf`;
}

/**
 * Processes a json message through the application service, prodcuing the pdf and
 *  sending a message to the Tempus queue when done.
 * @param {string} message - The message picked up from the queue
 */
async function processMessage(message) {
    // Initialise services
    const s3Service = createS3Service();
    const pdfService = createPdfService();
    const sqsService = createSqsService();

    // Retrieve the JSON data from S3
    const jsonKey = parseJSONLocation(message);
    const applicationJson = await s3Service.getFromS3(bucket, jsonKey);

    // Generate the PDF location and document itself
    const temporaryLocation = 'resources/summary.pdf';
    const pdfLocation = generatePDFLocation(applicationJson);
    await pdfService.writeJSONToPDF(applicationJson, temporaryLocation);

    // Upload the PDF document to S3
    await s3Service.putInS3(bucket, temporaryLocation, pdfLocation);

    // Write message to Tempus queue for further processing
    const sqsInput = {
        QueueUrl: tempusQueue
    };
    const sqsBody = `{
        "applicationPDFDocumentSummaryKey": "${pdfLocation}",
        "applicationJSONDocumentSummaryKey": "${jsonKey}"
    }`;
    sqsService.sendSQS(sqsInput, sqsBody);

    // Finally delete the consumed message from the Application Queue
    const deleteInput = {
        QueueUrl: applicationQueue,
        ReceiptHandle: message.ReceiptHandle
    };
    sqsService.deleteSQS(deleteInput);
}

/**
 * Handles the entire SQS response, extracting individual messages for processing.
 * @param {string} message - The raw SQS response.
 */
async function handleMessage(sqsResponse) {
    if (sqsResponse.Messages) {
        sqsResponse.Messages.forEach(async message => {
            processMessage(message);
        });
    }
}

/** Runs the application service, polling the Application Queue every 30 seconds. */
async function applicationService() {
    const sqsService = createSqsService();

    setInterval(async function pollSqs() {
        const receiveInput = {
            QueueUrl: applicationQueue,
            MaxNumberOfMessages: 10
        };
        const response = await sqsService.receiveSQS(receiveInput);
        handleMessage(response);
    }, 30000);
}

module.exports = {
    applicationService,
    generatePDFLocation,
    parseJSONLocation,
    processMessage,
    handleMessage
};
