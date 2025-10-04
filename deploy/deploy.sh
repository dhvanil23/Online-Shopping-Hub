#!/bin/bash

set -e

echo "Building and pushing Docker images..."

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION="us-east-1"

echo "AWS Account: $AWS_ACCOUNT_ID, Region: $AWS_REGION"

# Login to ECR
echo "Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Build and push backend
echo "Building backend image..."
docker build -t ecommerce-backend ../backend
docker tag ecommerce-backend:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/ecommerce-backend:latest
echo "Pushing backend image..."
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/ecommerce-backend:latest

# Build and push frontend
echo "Building frontend image..."
docker build -t ecommerce-frontend ../frontend
docker tag ecommerce-frontend:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/ecommerce-frontend:latest
echo "Pushing frontend image..."
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/ecommerce-frontend:latest

echo "✅ Images pushed to ECR successfully!"