'use strict';

const PDFKitHTML = require('@shipper/pdfkit-html-simple');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const moment = require('moment');
// const path = require('path');
// const tree = require('tree-node-cli');
const logger = require('../logging/logger');

/** Returns PDF Service object with a function to write a JSON to a PDF */
function createPdfService() {
    /**
     * Writes a given JSON to a PDF
     * @param {object} json - The json to write
     * @param {string} pdfLoc - The name of the pdf to save the generated PDF to
     * @returns Promise that resolves when the file has finished being written to
     */
    async function writeJSONToPDF(json, pdfLoc) {
        return new Promise(res => {
            const pdfDocument = new PDFDocument();

            /**
             * Writes the main questions to the PDF
             * @param {object} question - The question to write to the PDF
             */
            async function addPDFQuestion(question, indent = 0) {
                if (question.id === 'q-applicant-declaration') {
                    // If the question has an html label, use writeHTML to write the label to the pdf
                    // await writeHTML(question.label);
                    logger.info('Keeping writing');
                } else if (question.type === 'simple') {
                    // If the question is simple then write the question to the PDF
                    pdfDocument
                        .fontSize(12.5)
                        .font('Helvetica-Bold')
                        .text(question.label, {indent})
                        .font('Helvetica');
                    if (question.format && question.format.value === 'date-time') {
                        pdfDocument.text(
                            moment(question.valueLabel || question.value).format('DD/MM/YYYY'),
                            {indent}
                        );
                    } else {
                        pdfDocument.text(question.valueLabel || question.value, {indent});
                    }
                    pdfDocument.moveDown();
                } else {
                    // Otherwise the question is composite, so write the question label and write each subquestion using addPDFSubquestion
                    pdfDocument
                        .fontSize(12.5)
                        .font('Helvetica-Bold')
                        .text(question.label);
                    Object.keys(question.values).forEach(function(q) {
                        addPDFQuestion(question.values[q], indent + 30);
                    });
                    pdfDocument.moveDown();
                }
            }

            /**
             * Writes the static PDF header
             */
            function writeHeader() {
                // const logoDir = path.join(__dirname, '../../resources/static/cicaLogo.png');

                // const directoryTree = tree(path.join(__dirname, '../../'), {
                //     exclude: [/node_modules/]
                // });
                // logger.info(directoryTree);

                pdfDocument
                    .fontSize(10)
                    .font('Helvetica')
                    .fillColor('#808080')
                    .text('Protect-Personal', {align: 'center'})
                    // .image(logoDir, 450, 80, {width: 80}) - TODO: directory resolution isn't working
                    .text('Tel: 0300 003 3601')
                    .text('CICA, Alexander Bain House')
                    .text('Atlantic Quay, 15 York Street')
                    .text('Glasgow G2 8JQ')
                    .text('www.cica.gov.uk')
                    .moveDown()
                    .fillColor('#444444')
                    .fontSize(25)
                    .font('Helvetica-Bold')
                    .text('CICA Summary Application Form')
                    .fontSize(10)
                    .moveDown()
                    .font('Helvetica')
                    .fillColor('#808080')
                    .text(
                        'This document provides a summary of the information supplied to CICA in your application form. Please contact us on 0300 003 3601 if you require any changes to be made.'
                    )
                    .moveDown();
            }

            writeHeader();

            // Loops over each theme in the json, and for each writes the header and then
            //     loops through each question in the theme, which are each written using addPDFQuestion
            Object.keys(json.themes).forEach(function(t) {
                const theme = json.themes[t];
                pdfDocument
                    .fontSize(17.5)
                    .fillColor('#444444')
                    .font('Helvetica-Bold')
                    .text(theme.title, {underline: true});
                Object.keys(theme.values).forEach(function(question) {
                    addPDFQuestion(theme.values[question]);
                });
            });

            // Get the HTML string from the consent-summary section of the application json.
            const bufStr = json.themes.find(t => t.id === 'consent-summary').values[0].label;
            const htmlBuffer = Buffer.from(bufStr, 'utf8');

            PDFKitHTML.parse(htmlBuffer)
                .then(function(transformations) {
                    return transformations.reduce(function(promise, transformation) {
                        return promise.then(transformation);
                    }, Promise.resolve(pdfDocument));
                })
                .then(function(document) {
                    return new Promise(function(resolve, reject) {
                        const buffers = [];

                        document.on('data', function(chunk) {
                            buffers.push(chunk);
                        });

                        document.on('error', reject);

                        document.on('end', function() {
                            resolve(Buffer.concat(buffers));
                        });

                        document.flushPages();
                        document.end();
                    });
                })
                .then(function(buffer) {
                    return new Promise((resolve, reject) => {
                        fs.writeFile(pdfLoc, buffer, err => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(true);
                            }
                        });
                    });
                })
                .then(() => res(true))
                .catch(error => {
                    logger.error(error);
                });
        });
    }

    return Object.freeze({
        writeJSONToPDF
    });
}

module.exports = createPdfService;
