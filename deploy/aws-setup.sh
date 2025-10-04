#!/bin/bash

# Get default VPC and security group
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query "Vpcs[0].VpcId" --output text)
SG_ID=$(aws ec2 describe-security-groups --filters "Name=vpc-id,Values=$VPC_ID" "Name=group-name,Values=default" --query "SecurityGroups[0].GroupId" --output text)

echo "Using VPC: $VPC_ID and Security Group: $SG_ID"

# Create ECR repositories
aws ecr create-repository --repository-name ecommerce-backend
aws ecr create-repository --repository-name ecommerce-frontend

# Create RDS PostgreSQL instance
aws rds create-db-instance \
    --db-instance-identifier ecommerce-db \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --master-username postgres \
    --master-user-password YourSecurePassword123 \
    --allocated-storage 20 \
    --vpc-security-group-ids $SG_ID \
    --publicly-accessible

# Create ECS cluster
aws ecs create-cluster --cluster-name ecommerce-cluster --capacity-providers FARGATE

echo "AWS resources created successfully!"
echo "RDS Endpoint will be available in a few minutes. Check AWS Console."