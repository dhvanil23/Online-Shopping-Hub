#!/bin/bash

# Kubernetes deployment script
set -e

echo "Deploying E-Commerce Microservices to Kubernetes..."

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "kubectl is not installed. Please install kubectl first."
    exit 1
fi

# Check if cluster is accessible
if ! kubectl cluster-info &> /dev/null; then
    echo "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
    exit 1
fi

# Create namespace
echo "Creating namespace..."
kubectl apply -f infrastructure/kubernetes/namespace.yaml

# Deploy infrastructure components
echo "Deploying infrastructure components..."
kubectl apply -f infrastructure/kubernetes/configmap.yaml
kubectl apply -f infrastructure/kubernetes/infrastructure.yaml

# Wait for infrastructure to be ready
echo "Waiting for infrastructure to be ready..."
kubectl wait --for=condition=ready pod -l app=postgres -n ecommerce --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n ecommerce --timeout=300s
kubectl wait --for=condition=ready pod -l app=rabbitmq -n ecommerce --timeout=300s
kubectl wait --for=condition=ready pod -l app=consul -n ecommerce --timeout=300s

# Deploy microservices
echo "Deploying microservices..."
kubectl apply -f infrastructure/kubernetes/auth-service.yaml
kubectl apply -f infrastructure/kubernetes/api-gateway.yaml

# Deploy additional services (create similar YAML files)
services=("product-service" "order-service" "payment-service" "notification-service")
for service in "${services[@]}"; do
    if [ -f "infrastructure/kubernetes/$service.yaml" ]; then
        kubectl apply -f "infrastructure/kubernetes/$service.yaml"
    else
        echo "Warning: $service.yaml not found, skipping..."
    fi
done

# Deploy monitoring
echo "Deploying monitoring..."
kubectl apply -f infrastructure/monitoring/prometheus.yaml

# Wait for services to be ready
echo "Waiting for services to be ready..."
kubectl wait --for=condition=ready pod -l app=api-gateway -n ecommerce --timeout=300s

# Get service URLs
echo "Getting service information..."
kubectl get services -n ecommerce

echo "Deployment completed successfully!"
echo ""
echo "Access your services:"
echo "- API Gateway: kubectl port-forward svc/api-gateway 8080:80 -n ecommerce"
echo "- Prometheus: kubectl port-forward svc/prometheus 9090:9090 -n ecommerce"
echo "- RabbitMQ Management: kubectl port-forward svc/rabbitmq 15672:15672 -n ecommerce"
echo ""
echo "To check pod status: kubectl get pods -n ecommerce"
echo "To check logs: kubectl logs -f deployment/api-gateway -n ecommerce"