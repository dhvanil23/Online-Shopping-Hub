#!/bin/bash

# AWS Free Tier Deployment
echo "Creating AWS resources for free tier..."

# Get default VPC info
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query "Vpcs[0].VpcId" --output text)
SG_ID=$(aws ec2 describe-security-groups --filters "Name=vpc-id,Values=$VPC_ID" "Name=group-name,Values=default" --query "SecurityGroups[0].GroupId" --output text)

echo "Using VPC: $VPC_ID, Security Group: $SG_ID"

# Create ECR repositories
echo "Creating ECR repositories..."
aws ecr create-repository --repository-name ecommerce-backend --region us-east-1
aws ecr create-repository --repository-name ecommerce-frontend --region us-east-1

# Create RDS (Free Tier: db.t3.micro, 20GB)
echo "Creating RDS PostgreSQL instance..."
aws rds create-db-instance \
    --db-instance-identifier ecommerce-db \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --engine-version 15.4 \
    --master-username postgres \
    --master-user-password SecurePass123 \
    --allocated-storage 20 \
    --storage-type gp2 \
    --vpc-security-group-ids $SG_ID \
    --publicly-accessible \
    --no-multi-az \
    --backup-retention-period 0 \
    --region us-east-1

# Create ECS cluster
echo "Creating ECS cluster..."
aws ecs create-cluster --cluster-name ecommerce-cluster --capacity-providers FARGATE --region us-east-1

echo "✅ AWS resources created successfully!"
echo "⏳ RDS will be available in 5-10 minutes"
echo "💡 Run: aws rds describe-db-instances --db-instance-identifier ecommerce-db --query 'DBInstances[0].Endpoint.Address' --output text"