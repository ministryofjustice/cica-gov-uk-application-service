#pip install localstack

init:
	docker run --name localstack -p 4566:4566 -e SERVICES=s3 -e DEFAULT_REGION=eu-west-2 localstack/localstack

start:
	docker start localstack

create-bucket:
	aws --endpoint-url=http://localhost:4566 s3 mb s3://application-bucket

create-queues:
	aws --endpoint-url=http://localhost:4566 sqs create-queue --queue-name application-queue
	aws --endpoint-url=http://localhost:4566 sqs create-queue --queue-name tempus-queue

send-message:
	aws --endpoint-url=http://localhost:4566 sqs send-message --queue-url "http://localhost:4566/000000000000/application-queue" --message-body '{"S3Key": "23/123456.json"}'
