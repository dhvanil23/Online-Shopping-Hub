#!/bin/bash

# Build script for all microservices
set -e

echo "Building all microservices..."

# Define services
services=("api-gateway" "auth-service" "product-service" "order-service" "payment-service" "notification-service")

# Docker registry (change this to your registry)
REGISTRY=${DOCKER_REGISTRY:-"ecommerce"}
TAG=${BUILD_TAG:-"latest"}

# Build each service
for service in "${services[@]}"; do
    echo "Building $service..."
    
    # Create Dockerfile for each service
    cat > "services/$service/Dockerfile" << EOF
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY shared/ ./shared/

# Install dependencies
RUN npm ci --only=production

# Copy service code
COPY services/$service/ ./services/$service/

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 300${service: -1}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:300${service: -1}/health || exit 1

# Start the service
CMD ["node", "services/$service/server.js"]
EOF

    # Build Docker image
    docker build -t "$REGISTRY/$service:$TAG" -f "services/$service/Dockerfile" .
    
    echo "$service built successfully!"
done

echo "All services built successfully!"

# Optional: Push to registry
if [ "$PUSH_TO_REGISTRY" = "true" ]; then
    echo "Pushing images to registry..."
    for service in "${services[@]}"; do
        docker push "$REGISTRY/$service:$TAG"
    done
    echo "All images pushed to registry!"
fi