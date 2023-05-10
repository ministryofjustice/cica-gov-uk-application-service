const { SQSClient, ReceiveMessageCommand, SendMessageCommand, DeleteMessageCommand, DeleteMessageBatchCommand } = require("@aws-sdk/client-sqs");

// a client can be shared by different commands.
const client = new SQSClient({ region: "eu-west-2", endpoint: "http://localhost:4566" });

async function sendSQS(input, message) {
    console.log("Message SENDING!")
    input.MessageBody = message;
    const command = new SendMessageCommand(input);
    const response = await client.send(command);
}

async function receiveSQS(input) { 
    while (true) {
        const command = new ReceiveMessageCommand(input);
        const response = await client.send(command);
        // console.log("I RECEIVED THIS!!!");
        // console.log(response);
        if (response.Messages) {
            console.log("I RECEIVED THIS!!!");
            console.log(response);
            await deleteSQS({QueueUrl: input.QueueUrl, ReceiptHandle: response.Messages[0].ReceiptHandle});
            return response.Messages[0].Body;
        }
    }
}

async function deleteSQS(input) {
    const command = new DeleteMessageCommand(input);
    const response = await client.send(command);
    console.log("I DELETED!!!!!!!");
    console.log(response);
}

module.exports =  {sendSQS, receiveSQS};