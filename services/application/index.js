'use strict';

const createS3Service = require('../s3');
const createSqsService = require('../sqs');
const createPdfService = require('../pdf');

const dcsQueue = process.env.APPLICATION_QUEUE_ID;
const tempusQueue = process.env.TEMPUS_QUEUE_ID;
const bucket = process.env.S3_BUCKET;

/**
 * Extracts the S3 location as a string form the SQS message.
 * @param {string} body - The message body from the SQS message.
 */
function parseJSONLocation(body) {
    return body.applicationJSONDocumentSummaryKey;
}

/**
 * Uses the case reference number from the application json to determine the upload
 * location of the generaed PDF summary form.
 * @param {string} applicationJson - The full application JSON from S3.
 */
function generatePDFLocation(applicationJson) {
    // Restructures case reference number to be - separated instead of \ separated.
    const refArr = applicationJson.meta['case-reference'].split('\\');
    const refNumber = `${refArr[0]}-${refArr[refArr.length - 1]}`;

    return `${refNumber}/summary-form.pdf`;
}

/**
 * Processes a json message through the application service, prodcuing the pdf and
 *  sending a message to the Tempus queue when done.
 * @param {string} responseMessage - The message picked up from the queue
 */
async function processMessage(responseMessage) {
    // Initialise services
    const s3Service = createS3Service();
    const pdfService = createPdfService();
    const sqsService = createSqsService();

    // Retrieve the JSON data from S3
    const jsonKey = parseJSONLocation(responseMessage.Body);
    const applicationJson = await s3Service.getFromS3(bucket, jsonKey);

    // Generate the PDF location and document itself
    const pdfLocation = generatePDFLocation(applicationJson);
    await pdfService.writeJSONToPDF(applicationJson, pdfLocation);

    // Upload the PDF document to S3
    await s3Service.putInS3(bucket, pdfLocation);

    // Write message to Tempus queue for further processing
    const sqsInput = {
        QueueUrl: tempusQueue
    };
    const sqsBody = {
        applicationPDFDocumentSummaryKey: pdfLocation,
        applicationJSONDocumentSummaryKey: jsonKey
    };

    sqsService.sendSQS(sqsInput, sqsBody);
}

/** Runs the application service */
async function applicationService() {
    const sqsService = createSqsService();

    setInterval(async function pollSqs() {
        const receiveInput = {
            QueueUrl: dcsQueue,
            MaxNumberOfMessages: 10
        };
        const response = await sqsService.receiveSQS(receiveInput);
        if (response.Messages) {
            response.Messages.forEach(element => {
                processMessage(element.Body);
            });
        }
    }, 10000);
}

module.exports = applicationService;
