#!/bin/bash

echo "🔧 Database Setup"
echo "================"

# Start containers
docker-compose -f docker-compose.dev.yml up -d postgres redis

# Wait for PostgreSQL
echo "⏳ Waiting for database..."
sleep 10

until docker exec scalable-ecommerce-backend-postgres-1 pg_isready -U postgres; do
  sleep 2
done

# Setup database
docker exec scalable-ecommerce-backend-postgres-1 createdb -U postgres ecommerce_db 2>/dev/null || true

# Update schema
docker exec scalable-ecommerce-backend-postgres-1 psql -U postgres -d ecommerce_db -c "
ALTER TABLE \"Users\" 
ADD COLUMN IF NOT EXISTS \"emailVerified\" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS \"lastLogin\" TIMESTAMP;

ALTER TABLE \"Products\" 
ADD COLUMN IF NOT EXISTS \"sku\" VARCHAR(100),
ADD COLUMN IF NOT EXISTS \"images\" TEXT[],
ADD COLUMN IF NOT EXISTS \"tags\" TEXT[],
ADD COLUMN IF NOT EXISTS \"isFeatured\" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS \"weight\" DECIMAL(8,2),
ADD COLUMN IF NOT EXISTS \"dimensions\" JSONB,
ADD COLUMN IF NOT EXISTS \"rating\" DECIMAL(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS \"reviewCount\" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS \"image\" VARCHAR(500);

UPDATE \"Products\" SET sku = 'PROD-' || id WHERE sku IS NULL;

CREATE TABLE IF NOT EXISTS \"Orders\" (
  \"id\" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  \"userId\" UUID NOT NULL,
  \"items\" JSONB NOT NULL,
  \"totalAmount\" DECIMAL(10,2) NOT NULL,
  \"status\" VARCHAR(50) DEFAULT 'pending',
  \"shippingAddress\" JSONB,
  \"createdAt\" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \"updatedAt\" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"

echo "✅ Database ready"