#!/bin/bash

# Exit on error
set -e

# Load environment variables
if [ -f ".env" ]; then
    source .env
fi

# Required environment variables
: "${AWS_ACCOUNT_ID:?Need to set AWS_ACCOUNT_ID}"
: "${AWS_REGION:?Need to set AWS_REGION}"
: "${DT_TENANT_ID:?Need to set DT_TENANT_ID}"
: "${ECR_REGISTRY:?Need to set ECR_REGISTRY}"

# ECR login
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}

# Build and push backend image
echo "Building backend image..."
docker build -t backend-service:latest -f ecs/backend/Dockerfile backend/
docker tag backend-service:latest ${ECR_REGISTRY}/backend-service:latest
docker push ${ECR_REGISTRY}/backend-service:latest

# Build and push frontend image
echo "Building frontend image..."
docker build -t frontend-service:latest -f ecs/frontend/Dockerfile frontend/
docker tag frontend-service:latest ${ECR_REGISTRY}/frontend-service:latest
docker push ${ECR_REGISTRY}/frontend-service:latest

# Build and push load generator image
echo "Building load generator image..."
docker build -t load-generator:latest -f ecs/load-generator/Dockerfile ecs/load-generator/
docker tag load-generator:latest ${ECR_REGISTRY}/load-generator:latest
docker push ${ECR_REGISTRY}/load-generator:latest

# Deploy backend service
echo "Deploying backend service..."
BACKEND_TASK_DEF_FILE="ecs/task-definitions/backend-service.json"
BACKEND_TASK_DEF_CONTENT=$(cat $BACKEND_TASK_DEF_FILE)
BACKEND_TASK_DEF_CONTENT=$(echo "$BACKEND_TASK_DEF_CONTENT" | sed "s/\${AWS_ACCOUNT_ID}/$AWS_ACCOUNT_ID/g")
BACKEND_TASK_DEF_CONTENT=$(echo "$BACKEND_TASK_DEF_CONTENT" | sed "s/\${AWS_REGION}/$AWS_REGION/g")
BACKEND_TASK_DEF_CONTENT=$(echo "$BACKEND_TASK_DEF_CONTENT" | sed "s/\${DT_TENANT_ID}/$DT_TENANT_ID/g")
BACKEND_TASK_DEF_CONTENT=$(echo "$BACKEND_TASK_DEF_CONTENT" | sed "s/\${ECR_REGISTRY}/$ECR_REGISTRY/g")

BACKEND_TASK_DEF_ARN=$(echo "$BACKEND_TASK_DEF_CONTENT" | aws ecs register-task-definition \
    --cli-input-json file:///dev/stdin \
    --query 'taskDefinition.taskDefinitionArn' \
    --output text)

aws ecs update-service \
    --cluster otel-demo \
    --service backend-service \
    --task-definition "$BACKEND_TASK_DEF_ARN" \
    --force-new-deployment

# Deploy frontend service
echo "Deploying frontend service..."
FRONTEND_TASK_DEF_FILE="ecs/task-definitions/frontend-service.json"
FRONTEND_TASK_DEF_CONTENT=$(cat $FRONTEND_TASK_DEF_FILE)
FRONTEND_TASK_DEF_CONTENT=$(echo "$FRONTEND_TASK_DEF_CONTENT" | sed "s/\${AWS_ACCOUNT_ID}/$AWS_ACCOUNT_ID/g")
FRONTEND_TASK_DEF_CONTENT=$(echo "$FRONTEND_TASK_DEF_CONTENT" | sed "s/\${AWS_REGION}/$AWS_REGION/g")
FRONTEND_TASK_DEF_CONTENT=$(echo "$FRONTEND_TASK_DEF_CONTENT" | sed "s/\${ECR_REGISTRY}/$ECR_REGISTRY/g")

FRONTEND_TASK_DEF_ARN=$(echo "$FRONTEND_TASK_DEF_CONTENT" | aws ecs register-task-definition \
    --cli-input-json file:///dev/stdin \
    --query 'taskDefinition.taskDefinitionArn' \
    --output text)

aws ecs update-service \
    --cluster otel-demo \
    --service frontend-service \
    --task-definition "$FRONTEND_TASK_DEF_ARN" \
    --force-new-deployment

# Deploy load generator
echo "Deploying load generator..."
LOAD_GEN_TASK_DEF_FILE="ecs/task-definitions/load-generator.json"
LOAD_GEN_TASK_DEF_CONTENT=$(cat $LOAD_GEN_TASK_DEF_FILE)
LOAD_GEN_TASK_DEF_CONTENT=$(echo "$LOAD_GEN_TASK_DEF_CONTENT" | sed "s/\${AWS_ACCOUNT_ID}/$AWS_ACCOUNT_ID/g")
LOAD_GEN_TASK_DEF_CONTENT=$(echo "$LOAD_GEN_TASK_DEF_CONTENT" | sed "s/\${AWS_REGION}/$AWS_REGION/g")
LOAD_GEN_TASK_DEF_CONTENT=$(echo "$LOAD_GEN_TASK_DEF_CONTENT" | sed "s/\${ECR_REGISTRY}/$ECR_REGISTRY/g")

LOAD_GEN_TASK_DEF_ARN=$(echo "$LOAD_GEN_TASK_DEF_CONTENT" | aws ecs register-task-definition \
    --cli-input-json file:///dev/stdin \
    --query 'taskDefinition.taskDefinitionArn' \
    --output text)

# Run load generator as a task (not a service)
aws ecs run-task \
    --cluster otel-demo \
    --task-definition "$LOAD_GEN_TASK_DEF_ARN" \
    --network-configuration "awsvpcConfiguration={subnets=[${SUBNET_IDS}],securityGroups=[${SECURITY_GROUP_IDS}]}" \
    --launch-type FARGATE

echo "Deployment completed successfully!" 