const PDFDocument = require('pdfkit');
var wkhtmltopdf = require('wkhtmltopdf');
const fs = require('fs');
const PDFMerger = require('pdf-merger-js');

async function writeJSONToPDF(json, pdfLoc){
    var pdfDoc = new PDFDocument;
    var pdfLocHtml = pdfLoc.slice(0,-4)+"html"+pdfLoc.slice(-4);
    var stream = fs.createWriteStream(pdfLoc);
    pdfDoc.pipe(stream);

    writeHeader();

    for (var t in json) {
        var theme = json[t];
        pdfDoc
            .fontSize(17.5)
            .fillColor("#444444")
            .font('Helvetica-Bold')
            .text(theme.title, { underline: true });
        for (var question in theme.values) {
            addPDFQuestion(theme.values[question])
        }
        pdfDoc.moveDown()
    }
    
    
    pdfDoc.end();

    //mergePDFs(pdfLoc, pdfLocHtml);

    console.log("PDF Finished!");
    return true;

    function addPDFQuestion(question) {
        //console.log(question);
        if (question.id == "q-applicant-declaration"){
            writeHTML(question.label);
        }
        else 
        if (question.type == "simple") {
            pdfDoc
                .fontSize(12.5)
                .font('Helvetica-Bold')
                .text(question.label)
                .font('Helvetica')
                .text(question.valueLabel || question.value);
        }
        else {
            pdfDoc
                .fontSize(12.5)
                .font('Helvetica-Bold')
                .text(question.label)
            for (var q in question.values) {
                addPDFSubquestion(question.values[q])
            }
        }
    }

    function addPDFSubquestion(question) {
        pdfDoc
            .fontSize(12.5)
            .font('Helvetica-Bold')
            .text(question.label, {indent: 30})
            .font('Helvetica')
            .text(question.valueLabel || question.value, {indent: 30});
    }

    function writeHTML(html) {
        console.log(html);
        var stream2 = fs.createWriteStream(pdfLocHtml);
        wkhtmltopdf(html).pipe(stream2);
    }

    function writeHeader() {
        pdfDoc
            .fontSize(10)
            .font('Helvetica')
            .fillColor("#808080")
            .text("Protect-Personal", {align: "center"})
            .image("cicaLogo.png", 450, 80, {width: 80})
            .text("Tel: 0300 003 3601")
            .text("CICA, Alexander Bain House")
            .text("Atlantic Quay, 15 York Street")
            .text("Glasgow G2 8JQ")
            .text("www.cica.gov.uk")
            .moveDown()
            .fillColor("#444444")
            .fontSize(25)
            .font('Helvetica-Bold')
            .text("CICA Summary Application Form")
            .fontSize(10)
            .moveDown()
            .font('Helvetica')
            .fillColor("#808080")
            .text("This document provides a summary of the information supplied to CICA in your application form. Please contact us aon 0300 003 3601 if you require any changes to be made.")
            .moveDown()
    }
}

module.exports = {writeJSONToPDF};