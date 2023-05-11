pip install localstack

start:
 docker run --name localstack-s3 -p 4566:4566 -e SERVICES=s3 -e DEFAULT_REGION=eu-west-2 localstack/localstack
docker start localstack-s3

create-bucket:
 aws --endpoint-url=http://localhost:4566 s3 mb s3://application-bucket

create-queues:
 aws --endpoint-url=http://localhost:4566 sqs create-queue --queue-name firstqueue
 aws --endpoint-url=http://localhost:4566 sqs create-queue --queue-name secondqueue
