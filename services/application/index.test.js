'use strict';

const fs = require('fs');
const applicationService = require('.');

describe('Application Service', () => {
    it('Should generate a valid PDF location based on the case reference', async () => {
        // Arrange
        const stream = fs.readFileSync('resources/testing/checkYourAnswers.json');

        // Act
        const location = applicationService.generatePDFLocation(JSON.parse(stream));

        // Assert
        expect(location).toEqual('23-700001/application-summary.pdf');
    });

    it('Should parse the JSON location from an SQS message', async () => {
        // Arrange
        const stream = fs.readFileSync('resources/testing/sqsMessage.json');

        // Act
        const location = applicationService.parseJSONLocation(JSON.parse(stream).Messages[0]);

        // Assert
        expect(location).toEqual('test/sample-location.json');
    });

    it('Should throw an error if the file types are wrong', async () => {
        // Arrange
        const stream = fs.readFileSync('resources/testing/invalidSqsMessage.json');

        // Act and Assert
        expect(() => {
            applicationService.parseJSONLocation(JSON.parse(stream).Messages[0]);
        }).toThrowError('Application JSON document location is not in a valid format (.json)');
    });
});
