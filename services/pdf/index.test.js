'use strict';

const fs = require('fs');
const createPdfService = require('./index');

describe('PDF Service', () => {
    jest.setTimeout(999999);
    it('Should generate a valid PDF document', async () => {
        jest.setTimeout(999999);
        const path = 'resources/testing/output.pdf';
        const stream = fs.readFileSync('resources/testing/checkYourAnswers.json');
        const pdfService = createPdfService();
        await pdfService.writeJSONToPDF(JSON.parse(stream), path);
        expect(fs.existsSync(path)).toBeTruthy();
    });
});
