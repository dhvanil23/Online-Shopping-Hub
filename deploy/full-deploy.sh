#!/bin/bash

set -e

echo "🚀 Starting AWS Free Tier Deployment..."
echo "=================================="

# Step 1: Create AWS resources
echo "Step 1: Creating AWS resources..."
./aws-free-tier.sh

# Step 2: Wait for RDS
echo "Step 2: Waiting for RDS to be available..."
aws rds wait db-instance-available --db-instance-identifier ecommerce-db --region us-east-1
echo "✅ RDS is ready!"

# Step 3: Build and push images
echo "Step 3: Building and pushing Docker images..."
./deploy.sh

# Step 4: Register task definition
echo "Step 4: Registering ECS task definition..."
./update-task-def.sh

# Step 5: Create ECS service
echo "Step 5: Creating ECS service..."
./create-service.sh

# Step 6: Setup database
echo "Step 6: Setting up database..."
./setup-database.sh

# Step 7: Wait for service to be stable
echo "Step 7: Waiting for service to be stable..."
aws ecs wait services-stable --cluster ecommerce-cluster --services ecommerce-service --region us-east-1

# Step 8: Get application URL
echo "Step 8: Getting application URL..."
./get-app-url.sh

echo ""
echo "🎉 Deployment completed successfully!"
echo "💰 Cost: FREE (within AWS free tier limits)"
echo "📊 Resume Impact: HIGH - Full AWS cloud architecture"