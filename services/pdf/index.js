'use strict';

const PDFKitHTML = require('@shipper/pdfkit-html-simple');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const moment = require('moment');
const logger = require('../logging/logger');

/** Returns PDF Service object with a function to write a JSON to a PDF */
function createPdfService() {
    /**
     * Calculates the type of application to be displayed on the Summary form.
     * @param {JSON} applicationJson
     * @returns string representation of application type
     */
    function calculateApplicationType(applicationJson) {
        let type = 'Unknown';

        if (
            applicationJson.themes
                .find(t => t.id === 'about-application')
                .values.find(q => q.id === 'q-applicant-fatal-claim')?.value
        ) {
            if (
                applicationJson.themes
                    .find(t => t.id === 'about-application')
                    .values.find(q => q.id === 'q-applicant-claim-type')?.value ||
                applicationJson.meta?.splitFuneral
            ) {
                type = 'Funeral';
            } else {
                type = 'Fatal';
            }
        } else if (
            applicationJson.themes
                .find(t => t.id === 'crime')
                .values.find(q => q.id === 'q-applicant-did-the-crime-happen-once-or-over-time')
                ?.value === 'over-a-period-of-time'
        ) {
            type = 'Period of abuse';
        } else if (
            applicationJson.themes
                .find(t => t.id === 'crime')
                .values.find(q => q.id === 'q-applicant-did-the-crime-happen-once-or-over-time')
                ?.value === 'once'
        ) {
            type = 'Personal injury';
        }

        return type;
    }

    /**
     * Writes a given JSON to a PDF
     * @param {object} json - The json to write
     * @param {string} pdfLoc - The name of the pdf to save the generated PDF to
     * @returns Promise that resolves when the file has finished being written to
     */
    async function writeJSONToPDF(json, pdfLoc) {
        return new Promise(res => {
            // Initialise core PDF Document
            const pdfDocument = new PDFDocument({bufferPages: true});

            /**
             * Writes a Subquestion of a composite question to the PDF
             * @param {object} question - The sub question to write to the PDF
             */
            function addPDFSubquestion(question) {
                pdfDocument.fontSize(12.5).font('Helvetica');
                if (question.format && question.format.value === 'date-time') {
                    pdfDocument.text(
                        moment(question.valueLabel || question.value).format('DD/MM/YYYY'),
                        {indent: 30}
                    );
                } else {
                    pdfDocument.text(question.valueLabel || question.value, {indent: 30});
                }
            }

            /**
             * Writes the main questions to the PDF
             * @param {object} question - The question to write to the PDF
             */
            async function addPDFQuestion(question) {
                if (question.id === 'q-applicant-physical-injuries') {
                    pdfDocument
                        .fontSize(12.5)
                        .font('Helvetica-Bold')
                        .fillColor('#444444')
                        .text('Physical injuries')
                        .font('Helvetica');
                    pdfDocument.text(question.valueLabel.join('\n'));
                    pdfDocument.moveDown();
                } else if (question.type === 'simple') {
                    // If the question is simple then write the question to the PDF
                    pdfDocument
                        .fontSize(12.5)
                        .font('Helvetica-Bold')
                        .fillColor('#444444')
                        .text(question.label)
                        .font('Helvetica');
                    if (question.format && question.format.value === 'date-time') {
                        pdfDocument.text(
                            moment(question.valueLabel || question.value).format('DD/MM/YYYY')
                        );
                    } else {
                        pdfDocument.text(question.valueLabel || question.value);
                    }
                    pdfDocument.moveDown();
                } else {
                    // Otherwise the question is composite, so write the question label and write each subquestion using addPDFSubquestion
                    pdfDocument
                        .fontSize(12.5)
                        .font('Helvetica-Bold')
                        .fillColor('#444444')
                        .text(question.label);
                    Object.keys(question.values).forEach(function(q) {
                        addPDFSubquestion(question.values[q]);
                    });
                    pdfDocument.moveDown();
                }
            }

            /**
             * Writes the static PDF header
             */
            function writeHeader() {
                pdfDocument
                    .fontSize(10)
                    .font('Helvetica')
                    .fillColor('#808080')
                    .text('Protect-Personal', {align: 'center'})
                    .image('./public/cicaLogo.png', 450, 80, {width: 80})
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

            /**
             * Writes footer to given document (called per page via buffer)
             * @param {PDFDocument} document
             */
            function writeFooter(document) {
                // Need to set the bottom margin to zero to allow writing the footer into the margin
                const {bottom} = document.page.margins;
                document.page.margins.bottom = 0;

                const date = moment().format('DD/MM/YYYY hh:mm A');
                document
                    .fontSize(10)
                    .font('Helvetica')
                    .fillColor('#808080')
                    .text(
                        `Case reference no.:         ${json.meta.caseReference}        Submitted on:        ${date}`,
                        0,
                        document.page.height - 25,
                        {
                            align: 'center',
                            lineBreak: false,
                            width: document.page.width
                        }
                    );
                // Reset text writer position
                document.text('', 50, 50);
                // Reset the bottom margin back to what it was
                document.page.margins.bottom = bottom;
            }

            /**
             * Calculates the application type and writes it to the document
             */
            function writeApplicationType() {
                const type = calculateApplicationType(json);

                pdfDocument
                    .fontSize(12.5)
                    .font('Helvetica-Bold')
                    .fillColor('#444444')
                    .text('Application Type')
                    .font('Helvetica');
                pdfDocument.text(type);
                pdfDocument.moveDown();
            }

            // Write the main header to the beginning of the document
            writeHeader();

            // Write the Application Type to the beginning of the document
            writeApplicationType();

            // Loops over each theme in the json, and for each writes the header and then
            //     loops through each question in the theme, which are each written using addPDFQuestion
            Object.keys(json.themes).forEach(function(t) {
                const bottomMargin = pdfDocument.page.margins.bottom;
                const bottomBorder = pdfDocument.page.height;
                const yPos = pdfDocument.y;
                const lineHeight = pdfDocument.currentLineHeight();

                // If we are too close to the bottom of the page, start writing the header
                // to the top of a new page instead. This is calculated based on the current Y position
                // in relation to the bottom border of the page, with a buffer of (25 + line height)
                /* istanbul ignore next */

                if (yPos > bottomBorder - bottomMargin - lineHeight - 25) {
                    pdfDocument.addPage();
                }

                const theme = json.themes[t];
                pdfDocument.fontSize(14.5).font('Helvetica-Bold');

                const height = pdfDocument.currentLineHeight();
                pdfDocument
                    .rect(pdfDocument.x - 5, pdfDocument.y - 6, 480, height + 10)
                    .fill('#000');

                pdfDocument.fillColor('#FFF').text(theme.title, {underline: false});

                pdfDocument.moveDown();

                Object.keys(theme.values).forEach(function(question) {
                    if (!theme.values[question].meta?.integration?.hideOnSummary) {
                        addPDFQuestion(theme.values[question]);
                    }
                });
            });

            pdfDocument.fillColor('#444444');

            // Consent summary header
            pdfDocument.fontSize(14.5).font('Helvetica-Bold');
            const height = pdfDocument.currentLineHeight();
            pdfDocument.rect(pdfDocument.x - 5, pdfDocument.y - 6, 480, height + 10).fill('#000');
            pdfDocument.fillColor('#FFF').text('Consent & Declaration', {underline: false});
            pdfDocument.moveDown();

            pdfDocument.fillColor('#444444');

            // Get the HTML string from the declaration section of the application json.
            let bufStr = json.declaration.label;
            bufStr = `
                <style>p { margin: 10px;}</style>
                ${bufStr}
                <p style="font-weight: bold;">Date: ${moment(json.meta.submittedDate).format(
                    'DD/MM/YYYY'
                )}</p>
                <p style="font-weight: bold;">${json.declaration.valueLabel}</p>
                `;
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

                        const pages = document.bufferedPageRange();
                        for (let i = 0; i < pages.count; i += 1) {
                            document.switchToPage(i);
                            writeFooter(document);
                        }

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
        writeJSONToPDF,
        calculateApplicationType
    });
}

module.exports = createPdfService;
