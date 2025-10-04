# Deployment Guide

## AWS (Enterprise-Grade)
```bash
# Complete AWS deployment
./deploy/full-deploy.sh

# Setup cost monitoring
./deploy/setup-billing-alert.sh
```
**Cost**: Free for 12 months, then ~$25/month
**Resume Impact**: ⭐⭐⭐⭐⭐ (Enterprise)
**Features**: ECS Fargate, RDS PostgreSQL, ECR, Auto-scaling

## Railway (100% Free Alternative)
```bash
# Complete Railway deployment
./deploy/railway-full-deploy.sh
```
**Cost**: $0/month forever
**Resume Impact**: ⭐⭐⭐⭐ (Modern)
**Features**: PostgreSQL included, Auto-deploy, Custom domains

## Strategy
1. **Deploy on AWS first** → Maximum resume impact
2. **Use for 12 months** → Free tier period  
3. **Switch to Railway** → When AWS starts charging
4. **Resume shows AWS experience** → You actually used it!