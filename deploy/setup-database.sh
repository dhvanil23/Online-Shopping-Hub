#!/bin/bash

set -e

echo "Setting up database..."

# Get RDS endpoint
RDS_ENDPOINT=$(aws rds describe-db-instances --db-instance-identifier ecommerce-db --query "DBInstances[0].Endpoint.Address" --output text)

echo "Connecting to RDS: $RDS_ENDPOINT"

# Setup database schema
PGPASSWORD=SecurePass123 psql -h $RDS_ENDPOINT -U postgres -d postgres -c "CREATE DATABASE ecommerce_db;"

# Run initialization script
PGPASSWORD=SecurePass123 psql -h $RDS_ENDPOINT -U postgres -d ecommerce_db -f ../scripts/init.sql

echo "✅ Database setup completed!"