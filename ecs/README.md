# ECS Deployment with OpenTelemetry

This directory contains the configuration files needed to deploy the backend service to AWS ECS with OpenTelemetry instrumentation.

## Directory Structure

```
ecs/
├── backend/
│   └── Dockerfile          # Dockerfile for the backend service
├── task-definitions/
│   └── backend-service.json # ECS task definition
├── iam/
│   └── task-role-policy.json # IAM policy for ECS task role
├── scripts/
│   └── deploy.sh           # Deployment script
└── README.md
```

## Prerequisites

1. AWS CLI installed and configured
2. Docker installed
3. An AWS ECR repository for the backend service
4. A Dynatrace tenant and API token
5. The following environment variables set:
   - AWS_ACCOUNT_ID
   - AWS_REGION
   - DT_TENANT_ID
   - ECR_REGISTRY
   - AWS credentials configured

## Setup Steps

1. Create the ECS task role and policy:
```bash
# Create the ECS task role
aws iam create-role --role-name ecsTaskRole --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ecs-tasks.amazonaws.com"},"Action":"sts:AssumeRole"}]}'

# Attach the task role policy
aws iam put-role-policy --role-name ecsTaskRole --policy-name TaskPolicy --policy-document file://iam/task-role-policy.json
```

2. Store the Dynatrace API token in AWS Secrets Manager:
```bash
aws secretsmanager create-secret \
    --name dynatrace-api-token \
    --secret-string "your-dynatrace-api-token"
```

3. Create an ECS cluster (if not exists):
```bash
aws ecs create-cluster --cluster-name otel-demo
```

4. Create an ECS service:
```bash
aws ecs create-service \
    --cluster otel-demo \
    --service-name backend-service \
    --task-definition backend-service \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

## Deployment

1. Set up your environment variables in a `.env` file:
```bash
AWS_ACCOUNT_ID=your-account-id
AWS_REGION=your-region
DT_TENANT_ID=your-tenant-id
ECR_REGISTRY=your-registry-url
```

2. Make the deployment script executable:
```bash
chmod +x scripts/deploy.sh
```

3. Run the deployment:
```bash
./scripts/deploy.sh
```

## Observability

- Logs are automatically sent to CloudWatch Logs under the `/ecs/backend-service` log group
- Traces are sent directly to Dynatrace using OTLP
- The backend service is auto-instrumented using OpenTelemetry

## Troubleshooting

1. Check CloudWatch Logs for application logs
2. Verify the task is running:
```bash
aws ecs list-tasks --cluster otel-demo --service-name backend-service
```

3. Check task status:
```bash
aws ecs describe-tasks --cluster otel-demo --tasks <task-id>
``` 