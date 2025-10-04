#!/bin/bash

set -e

echo "Updating and registering task definition..."

# Get AWS Account ID and RDS endpoint
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
RDS_ENDPOINT=$(aws rds describe-db-instances --db-instance-identifier ecommerce-db --query "DBInstances[0].Endpoint.Address" --output text)

echo "AWS Account: $AWS_ACCOUNT_ID"
echo "RDS Endpoint: $RDS_ENDPOINT"

# Update task definition with actual values
sed "s/YOUR_ACCOUNT/$AWS_ACCOUNT_ID/g" ecs-task-definition-minimal.json | \
sed "s/your-rds-endpoint.amazonaws.com/$RDS_ENDPOINT/g" > ecs-task-definition-updated.json

# Register task definition
aws ecs register-task-definition --cli-input-json file://ecs-task-definition-updated.json --region us-east-1

echo "✅ Task definition registered successfully!"