'use strict';

const PDFDocument = require('pdfkit');
const wkhtmltopdf = require('wkhtmltopdf');
const fs = require('fs');
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
            const pdfDoc = new PDFDocument();
            const stream = fs.createWriteStream(pdfLoc);
            pdfDoc.pipe(stream);
            /**
             * Writes given html to the PDF
             * @param {string} html - The html to be written to a pdf
             */
            function writeHTML(html) {
                // var stream2 = fs.createWriteStream(pdfLoc, {flags: 'a'});
                wkhtmltopdf(html).pipe(stream);
            }

            /**
             * Writes a Subquestion of a composite question to the PDF
             * @param {object} question - The sub question to write to the PDF
             */
            function addPDFSubquestion(question) {
                pdfDoc
                    .fontSize(12.5)
                    .font('Helvetica-Bold')
                    .text(question.label, {indent: 30})
                    .font('Helvetica')
                    .text(question.valueLabel || question.value, {indent: 30});
            }

            /**
             * Writes the main questions to the PDF
             * @param {object} question - The question to write to the PDF
             */
            function addPDFQuestion(question) {
                if (question.id === 'q-applicant-declaration') {
                    // If the question has an html label, use writeHTML to write the label to the pdf
                    writeHTML(question.label);
                    pdfDoc
                        .fontSize(12.5)
                        .font('Helvetica')
                        .text(question.valueLabel || question.value);
                } else if (question.type === 'simple') {
                    // If the question is simple then write the question to the PDF
                    pdfDoc
                        .fontSize(12.5)
                        .font('Helvetica-Bold')
                        .text(question.label)
                        .font('Helvetica')
                        .text(question.valueLabel || question.value);
                } else {
                    // Otherwise the question is composite, so write the question label and write each subquestion using addPDFSubquestion
                    pdfDoc
                        .fontSize(12.5)
                        .font('Helvetica-Bold')
                        .text(question.label);
                    Object.keys(question.values).forEach(function(q) {
                        addPDFSubquestion(question.values[q]);
                    });
                }
                pdfDoc.moveDown();
            }

            /**
             * Writes the static PDF header
             */
            function writeHeader() {
                pdfDoc
                    .fontSize(10)
                    .font('Helvetica')
                    .fillColor('#808080')
                    .text('Protect-Personal', {align: 'center'})
                    .image('resources/static/cicaLogo.png', 450, 80, {width: 80})
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
            Object.keys(json).forEach(function(t) {
                const theme = json[t];
                pdfDoc
                    .fontSize(17.5)
                    .fillColor('#444444')
                    .font('Helvetica-Bold')
                    .text(theme.title, {underline: true});
                Object.keys(theme.values).forEach(function(question) {
                    addPDFQuestion(theme.values[question]);
                });
            });

            pdfDoc.end();

            stream.on('finish', function() {
                logger.info('PDF finished');
                res(true);
            });
        });
    }

    return Object.freeze({
        writeJSONToPDF
    });
}

module.exports = createPdfService;
