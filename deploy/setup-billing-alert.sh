#!/bin/bash

echo "Setting up billing alert for $5..."

# Create SNS topic for billing alerts
aws sns create-topic --name billing-alerts --region us-east-1

# Get topic ARN
TOPIC_ARN=$(aws sns list-topics --region us-east-1 --query "Topics[?contains(TopicArn, 'billing-alerts')].TopicArn" --output text)

# Subscribe email to topic (replace with your email)
read -p "Enter your email for billing alerts: " EMAIL
aws sns subscribe --topic-arn $TOPIC_ARN --protocol email --notification-endpoint $EMAIL --region us-east-1

# Create billing alarm
aws cloudwatch put-metric-alarm \
    --alarm-name "BillingAlert" \
    --alarm-description "Alert when charges exceed $5" \
    --metric-name EstimatedCharges \
    --namespace AWS/Billing \
    --statistic Maximum \
    --period 86400 \
    --threshold 5 \
    --comparison-operator GreaterThanThreshold \
    --dimensions Name=Currency,Value=USD \
    --evaluation-periods 1 \
    --alarm-actions $TOPIC_ARN \
    --region us-east-1

echo "✅ Billing alert set up! You'll get notified if costs exceed $5"