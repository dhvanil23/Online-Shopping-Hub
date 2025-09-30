#!/bin/bash

# AWS Deployment Script for E-Commerce Microservices Platform
set -euo pipefail

# Configuration
PROJECT_NAME="ecommerce-microservices"
AWS_REGION="${AWS_REGION:-us-west-2}"
ENVIRONMENT="${ENVIRONMENT:-production}"
TERRAFORM_DIR="infrastructure/aws"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check Terraform
    if ! command -v terraform &> /dev/null; then
        log_error "Terraform is not installed. Please install it first."
        exit 1
    fi
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed. Please install it first."
        exit 1
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install it first."
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured. Please run 'aws configure'."
        exit 1
    fi
    
    log_success "All prerequisites met"
}

# Create S3 bucket for Terraform state
create_terraform_backend() {
    log_info "Setting up Terraform backend..."
    
    local bucket_name="${PROJECT_NAME}-terraform-state-$(date +%s)"
    
    # Create S3 bucket
    aws s3 mb "s3://${bucket_name}" --region "${AWS_REGION}" || {
        log_warning "Bucket might already exist or you might not have permissions"
    }
    
    # Enable versioning
    aws s3api put-bucket-versioning \
        --bucket "${bucket_name}" \
        --versioning-configuration Status=Enabled
    
    # Enable encryption
    aws s3api put-bucket-encryption \
        --bucket "${bucket_name}" \
        --server-side-encryption-configuration '{
            "Rules": [{
                "ApplyServerSideEncryptionByDefault": {
                    "SSEAlgorithm": "AES256"
                }
            }]
        }'
    
    log_success "Terraform backend created: ${bucket_name}"
    echo "Update the backend configuration in ${TERRAFORM_DIR}/main.tf with bucket: ${bucket_name}"
}

# Deploy infrastructure with Terraform
deploy_infrastructure() {
    log_info "Deploying AWS infrastructure..."
    
    cd "${TERRAFORM_DIR}"
    
    # Initialize Terraform
    terraform init
    
    # Validate configuration
    terraform validate
    
    # Plan deployment
    terraform plan -out=tfplan \
        -var="project_name=${PROJECT_NAME}" \
        -var="environment=${ENVIRONMENT}" \
        -var="aws_region=${AWS_REGION}"
    
    # Apply infrastructure
    log_info "Applying Terraform configuration..."
    terraform apply tfplan
    
    # Save outputs
    terraform output -json > ../terraform-outputs.json
    
    cd - > /dev/null
    
    log_success "Infrastructure deployed successfully"
}

# Build and push Docker images
build_and_push_images() {
    log_info "Building and pushing Docker images..."
    
    # Get ECR repository URLs from Terraform outputs
    local ecr_repos=$(cat infrastructure/terraform-outputs.json | jq -r '.ecr_repository_urls.value')
    
    # Login to ECR
    aws ecr get-login-password --region "${AWS_REGION}" | \
        docker login --username AWS --password-stdin "$(aws sts get-caller-identity --query Account --output text).dkr.ecr.${AWS_REGION}.amazonaws.com"
    
    # Services to build
    local services=("api-gateway" "auth-service" "product-service" "order-service" "payment-service" "notification-service")
    
    for service in "${services[@]}"; do
        log_info "Building ${service}..."
        
        # Get ECR URL for this service
        local ecr_url=$(echo "${ecr_repos}" | jq -r ".\"${service}\"")
        
        # Build image
        docker build -t "${service}:latest" \
            -f "services/${service}/Dockerfile" \
            --target production .
        
        # Tag for ECR
        docker tag "${service}:latest" "${ecr_url}:latest"
        docker tag "${service}:latest" "${ecr_url}:$(git rev-parse --short HEAD)"
        
        # Push to ECR
        docker push "${ecr_url}:latest"
        docker push "${ecr_url}:$(git rev-parse --short HEAD)"
        
        log_success "${service} image pushed to ECR"
    done
}

# Configure kubectl for EKS
configure_kubectl() {
    log_info "Configuring kubectl for EKS..."
    
    local cluster_name="${PROJECT_NAME}-cluster"
    
    aws eks update-kubeconfig \
        --region "${AWS_REGION}" \
        --name "${cluster_name}"
    
    # Verify connection
    kubectl cluster-info
    
    log_success "kubectl configured for EKS cluster"
}

# Deploy applications to Kubernetes
deploy_applications() {
    log_info "Deploying applications to Kubernetes..."
    
    # Update image URLs in Kubernetes manifests
    local ecr_account=$(aws sts get-caller-identity --query Account --output text)
    local ecr_base="${ecr_account}.dkr.ecr.${AWS_REGION}.amazonaws.com/${PROJECT_NAME}"
    
    # Apply Kubernetes manifests
    kubectl apply -f infrastructure/kubernetes/namespace.yaml
    kubectl apply -f infrastructure/kubernetes/configmap.yaml
    
    # Update and apply service deployments
    for manifest in infrastructure/kubernetes/*-service.yaml; do
        if [[ -f "$manifest" ]]; then
            # Replace image URLs with ECR URLs
            sed "s|ecommerce/|${ecr_base}/|g" "$manifest" | kubectl apply -f -
        fi
    done
    
    kubectl apply -f infrastructure/kubernetes/api-gateway.yaml
    kubectl apply -f infrastructure/monitoring/prometheus.yaml
    
    log_success "Applications deployed to Kubernetes"
}

# Wait for deployments to be ready
wait_for_deployments() {
    log_info "Waiting for deployments to be ready..."
    
    local deployments=("api-gateway" "auth-service" "product-service" "order-service" "payment-service" "notification-service")
    
    for deployment in "${deployments[@]}"; do
        log_info "Waiting for ${deployment}..."
        kubectl wait --for=condition=available --timeout=300s deployment/"${deployment}" -n ecommerce || {
            log_warning "Deployment ${deployment} not ready within timeout"
        }
    done
    
    log_success "All deployments are ready"
}

# Display deployment information
show_deployment_info() {
    log_info "Deployment Information:"
    
    echo ""
    echo "=== EKS Cluster ==="
    kubectl get nodes
    
    echo ""
    echo "=== Services ==="
    kubectl get services -n ecommerce
    
    echo ""
    echo "=== Pods ==="
    kubectl get pods -n ecommerce
    
    echo ""
    echo "=== Load Balancer ==="
    local alb_dns=$(cat infrastructure/terraform-outputs.json | jq -r '.alb_dns_name.value')
    echo "Application Load Balancer: ${alb_dns}"
    
    echo ""
    echo "=== Access Instructions ==="
    echo "1. API Gateway: kubectl port-forward svc/api-gateway 8080:80 -n ecommerce"
    echo "2. Prometheus: kubectl port-forward svc/prometheus 9090:9090 -n ecommerce"
    echo "3. Check logs: kubectl logs -f deployment/api-gateway -n ecommerce"
    
    log_success "Deployment completed successfully!"
}

# Cleanup function
cleanup() {
    log_info "Cleaning up temporary files..."
    rm -f "${TERRAFORM_DIR}/tfplan"
}

# Main deployment function
main() {
    log_info "Starting AWS deployment for ${PROJECT_NAME}"
    
    # Set trap for cleanup
    trap cleanup EXIT
    
    case "${1:-all}" in
        "prereq")
            check_prerequisites
            ;;
        "backend")
            create_terraform_backend
            ;;
        "infra")
            check_prerequisites
            deploy_infrastructure
            ;;
        "images")
            build_and_push_images
            ;;
        "k8s")
            configure_kubectl
            deploy_applications
            wait_for_deployments
            ;;
        "all")
            check_prerequisites
            deploy_infrastructure
            build_and_push_images
            configure_kubectl
            deploy_applications
            wait_for_deployments
            show_deployment_info
            ;;
        *)
            echo "Usage: $0 {prereq|backend|infra|images|k8s|all}"
            echo ""
            echo "Commands:"
            echo "  prereq  - Check prerequisites"
            echo "  backend - Create Terraform backend"
            echo "  infra   - Deploy AWS infrastructure"
            echo "  images  - Build and push Docker images"
            echo "  k8s     - Deploy to Kubernetes"
            echo "  all     - Run complete deployment"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"