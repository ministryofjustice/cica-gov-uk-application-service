'use strict';

const PDFDocument = require('pdfkit');
const wkhtmltopdf = require('wkhtmltopdf');
const fs = require('fs');

function createPdfService(opts) {
    const {logger} = opts;
    delete opts.logger;

    async function writeJSONToPDF(json, pdfLoc) {
        const pdfDoc = new PDFDocument();
        const pdfLocHtml = `${pdfLoc.slice(0, -4)}html${pdfLoc.slice(-4)}`;
        const stream = fs.createWriteStream(pdfLoc);
        pdfDoc.pipe(stream);

        function writeHTML(html) {
            logger.info('HTML being written:');
            logger.info(html);
            const stream2 = fs.createWriteStream(pdfLocHtml);
            wkhtmltopdf(html).pipe(stream2);
        }

        function addPDFSubquestion(question) {
            pdfDoc
                .fontSize(12.5)
                .font('Helvetica-Bold')
                .text(question.label, {indent: 30})
                .font('Helvetica')
                .text(question.valueLabel || question.value, {indent: 30});
        }

        function addPDFQuestion(question) {
            if (question.id === 'q-applicant-declaration') {
                writeHTML(question.label);
                pdfDoc
                    .fontSize(12.5)
                    .font('Helvetica')
                    .text(question.valueLabel || question.value);
            } else if (question.type === 'simple') {
                pdfDoc
                    .fontSize(12.5)
                    .font('Helvetica-Bold')
                    .text(question.label)
                    .font('Helvetica')
                    .text(question.valueLabel || question.value);
            } else {
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

        function writeHeader() {
            pdfDoc
                .fontSize(10)
                .font('Helvetica')
                .fillColor('#808080')
                .text('Protect-Personal', {align: 'center'})
                .image('resources/cicaLogo.png', 450, 80, {width: 80})
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
            pdfDoc.moveDown();
        });

        pdfDoc.end();

        logger.info('PDF Finished');
        return true;
    }

    return Object.freeze({
        writeJSONToPDF
    });
}

module.exports = createPdfService;
