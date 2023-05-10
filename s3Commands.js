//module.js

const { GetObjectCommand, PutObjectCommand, S3Client } = require("@aws-sdk/client-s3");
const {receiveSQS} = require('./sqsCommands');
const fs = require('fs');

// S3 bits
const s3client = new S3Client({ region: "eu-west-2", endpoint: "http://localhost:4566" });

async function getFromS3(bucket, key) {
    const content = {
      "Bucket": bucket,
      "Key": bucket + "/" + key
    };
  
    try {
      console.log("TRYING TO GET FROM S3!");
      const response = await s3client.send(new GetObjectCommand(content));
      // The Body object also has 'transformToByteArray' and 'transformToWebStream' methods.
      console.log("Got from S3!");
      const str = await response.Body.transformToString();
      const json = JSON.parse(str);
      console.log(json);
      return json;
      // THEN RUN STRING THROUGH JSON PROCESSOR THEN RUN PDF FUNCTION ON IT!!!S
    } catch (err) {
      console.error(err);
    }
};

// Put in S3 code
async function putInS3(bucket, pdf) {
    console.log("Putting in S3!");
    fs.readFile('./'+pdf, async function(err, data) {
        if (err) { console.error(err); }
        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: bucket + "/" + pdf,
            Body: data,
            contentType: 'application/pdf'
          });
        
          try {
            const response = await s3client.send(command);
            return response;
          } catch (err) {
            console.error(err);
          }
    })
};

module.exports = {putInS3, getFromS3};