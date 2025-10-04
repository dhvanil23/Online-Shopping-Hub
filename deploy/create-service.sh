#!/bin/bash

set -e

echo "Creating ECS service..."

# Get default VPC subnets and security group
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query "Vpcs[0].VpcId" --output text)
SUBNETS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query "Subnets[0:2].SubnetId" --output text | tr '\t' ',')
SG_ID=$(aws ec2 describe-security-groups --filters "Name=vpc-id,Values=$VPC_ID" "Name=group-name,Values=default" --query "SecurityGroups[0].GroupId" --output text)

echo "VPC: $VPC_ID"
echo "Subnets: $SUBNETS"
echo "Security Group: $SG_ID"

# Create ECS service
aws ecs create-service \
    --cluster ecommerce-cluster \
    --service-name ecommerce-service \
    --task-definition ecommerce-app:1 \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[$SUBNETS],securityGroups=[$SG_ID],assignPublicIp=ENABLED}" \
    --region us-east-1

echo "✅ ECS service created successfully!"
echo "🚀 Your app will be available in 2-3 minutes"