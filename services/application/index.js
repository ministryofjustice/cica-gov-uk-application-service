'use strict';

const fs = require('fs');
const path = require('path');
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
    const key = messageBody.applicationJSONDocumentSummaryKey;

    if (!key.endsWith('.json')) {
        throw new Error('Application JSON document location is not in a valid format (.json)');
    }

    return key;
}

/**
 * Gets the full S3 URI of the split JSON file
 * @param {string} key - The original filename for the base JSON.
 */
function getSplitJsonFilename(key) {
    return `${path.parse(key).dir}/${path.parse(key).name}-split${path.parse(key).ext}`;
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
 * Generates, uploads and sends an associated SQS message for an application PDF summary
 * @param {obj} applicationJson - the application JSON data retrieved from S3
 * @param {string} jsonKey - the location of the application data in S3 to forward on to SQS
 * @param {string} temporaryLocation - a temporary local location to save the PDF to until it is uploaded
 */
async function processPdf(applicationJson, jsonKey, temporaryLocation) {
    const pdfService = createPdfService();
    const s3Service = createS3Service();
    const sqsService = createSqsService();

    const pdfLocation = generatePDFLocation(applicationJson);
    await pdfService.writeJSONToPDF(applicationJson, `${temporaryLocation}/summary.pdf`);

    // Upload the PDF document to S3
    await s3Service.putInS3(bucket, `${temporaryLocation}/summary.pdf`, pdfLocation);

    // Write message to Tempus queue for further processing
    const sqsInput = {
        QueueUrl: tempusQueue
    };
    const sqsBody = `{
        "applicationPDFDocumentSummaryKey": "${pdfLocation}",
        "applicationJSONDocumentSummaryKey": "${jsonKey}"
    }`;
    sqsService.sendSQS(sqsInput, sqsBody);
}

/**
 * For the purposes of split fatal applications, this duplicates the original JSON
 * updates the caseReference and splitFuneral metadata
 * and saves this file to a temporary location
 * @param {json} applicationJson - the application JSON data retrieved from S3
 * @param {string} temporaryLocation - a temporary local location to save the PDF to until it is uploaded
 */
async function duplicateJson(applicationJson, temporaryLocation) {
    applicationJson.meta.caseReference = applicationJson.meta.funeralReference;
    applicationJson.meta.splitFuneral = true;

    return new Promise((resolve, reject) => {
        fs.writeFile(temporaryLocation, JSON.stringify(applicationJson), err => {
            if (err) {
                reject(err);
            } else {
                resolve(true);
            }
        });
    });
}

/**
 * Processes a json message through the application service, prodcuing the pdf and
 *  sending a message to the Tempus queue when done.
 * @param {string} message - The message picked up from the queue
 */
async function processMessage(message) {
    // Initialise services
    const s3Service = createS3Service();
    const sqsService = createSqsService();

    // Retrieve the JSON data from S3
    const jsonKey = parseJSONLocation(message);
    const applicationJson = await s3Service.getFromS3(bucket, jsonKey);

    // Generate the PDF location and document itself
    const temporaryLocation = './temp';
    if (!fs.existsSync(temporaryLocation)) {
        fs.mkdirSync(temporaryLocation);
    }

    await processPdf(applicationJson, jsonKey, temporaryLocation);

    // If there is a secondary CRN for an associated funeral expenses application
    // we need to process a second PDF after having updated some of the JSON data
    if (applicationJson.meta.caseReference) {
        // Modify and duplicate JSON
        const duplicateKey = getSplitJsonFilename(jsonKey);
        const tempPath = `${temporaryLocation}/duplicate.json`;
        await duplicateJson(applicationJson, tempPath);

        // Upload the new JSON to S3 for the Tempus Broker to process as a separate application
        await s3Service.putInS3(bucket, tempPath, jsonKey);

        // Generate and upload a second PDF and SQS
        await processPdf(applicationJson, duplicateKey, temporaryLocation);
    }

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
            await processMessage(message);
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
        await handleMessage(response);
    }, 30000);
}

module.exports = {
    applicationService,
    generatePDFLocation,
    parseJSONLocation,
    processMessage,
    processPdf,
    handleMessage,
    duplicateJson,
    getSplitJsonFilename
};
