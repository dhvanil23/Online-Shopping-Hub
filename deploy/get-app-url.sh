#!/bin/bash

echo "Getting application URL..."

# Get running task ARN
TASK_ARN=$(aws ecs list-tasks --cluster ecommerce-cluster --service-name ecommerce-service --query "taskArns[0]" --output text --region us-east-1)

if [ "$TASK_ARN" = "None" ] || [ -z "$TASK_ARN" ]; then
    echo "❌ No running tasks found. Check ECS service status."
    exit 1
fi

echo "Task ARN: $TASK_ARN"

# Get network interface ID
ENI_ID=$(aws ecs describe-tasks --cluster ecommerce-cluster --tasks $TASK_ARN --query "tasks[0].attachments[0].details[?name=='networkInterfaceId'].value" --output text --region us-east-1)

# Get public IP
PUBLIC_IP=$(aws ec2 describe-network-interfaces --network-interface-ids $ENI_ID --query "NetworkInterfaces[0].Association.PublicIp" --output text --region us-east-1)

echo ""
echo "🚀 Your application is deployed!"
echo "📱 Frontend: http://$PUBLIC_IP"
echo "🔗 Backend API: http://$PUBLIC_IP:3000/api"
echo ""
echo "🔐 Demo credentials:"
echo "   Customer: customer@demo.com / password123"
echo "   Admin: admin@demo.com / password123"