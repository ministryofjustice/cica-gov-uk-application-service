'use strict';

const {GetObjectCommand, PutObjectCommand, S3Client} = require('@aws-sdk/client-s3');
const {sdkStreamMixin} = require('@aws-sdk/util-stream-node');
const {mockClient} = require('aws-sdk-client-mock');
const {createReadStream} = require('fs');
const createS3Service = require('./index');
const testJson = require('../../resources/testing/checkYourAnswers.json');

describe('S3 Service', () => {
    const s3Mock = mockClient(S3Client);

    it('Should get the item from the S3 bucket', async () => {
        // Arrange
        const stream = createReadStream('./resources/testing/checkYourAnswers.json');
        const sdkStream = sdkStreamMixin(stream);
        s3Mock.on(GetObjectCommand).resolves({Body: sdkStream, ContentType: 'application/json'});

        // Act
        const s3Service = createS3Service();
        const applicationJson = await s3Service.getFromS3('bucket', 'key');

        // Assert
        expect(applicationJson).toEqual(testJson);
    });

    it('Should throw an error if the object/bucket is not found', async () => {
        // Arrange
        const mockCommand = {
            Bucket: 'wrong-bucket',
            Key: 'key'
        };
        s3Mock.on(GetObjectCommand, mockCommand).rejects('The specified bucket does not exist');

        // Act and Assert
        const s3Service = createS3Service();
        await expect(() => s3Service.getFromS3('wrong-bucket', 'key')).rejects.toThrowError(
            'The specified bucket does not exist'
        );
    });

    it('Should throw an error if the content type is not supported', async () => {
        // Arrange
        const stream = createReadStream('./resources/testing/checkYourAnswers.json');
        const sdkStream = sdkStreamMixin(stream);
        const mockCommand = {
            Bucket: 'bucket',
            Key: 'key.exe'
        };
        s3Mock.on(GetObjectCommand, mockCommand).resolves({
            Body: sdkStream,
            ContentType: 'application/exe'
        });

        // Act and Assert
        const s3Service = createS3Service();
        await expect(() => s3Service.getFromS3('bucket', 'key.exe')).rejects.toThrowError(
            'application/exe content type is not supported'
        );
    });

    it('Should put the given item in the given S3 bucket', async () => {
        // Arrange
        const message = {message: 'TestMessage'};
        s3Mock.on(PutObjectCommand).resolves(message);

        // Act
        const s3Service = createS3Service();
        const res = await s3Service.putInS3('bucket', 'resources/testing/summary.pdf', 'key');

        // Assert
        expect(res).toBe(message);
    });
});
