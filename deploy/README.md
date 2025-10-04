# Deployment Guide

## 🎯 Render (Permanently Free)
```bash
./deploy/render-auto-deploy.sh
```
**Cost**: $0/month forever
**Features**: PostgreSQL included, SSL, Custom domains
**Limits**: 750 hours/month (24/7 uptime)
**Best for**: Zero cost deployment

## ⭐ AWS Free Tier (Resume Builder)
```bash
./deploy/aws-free-tier.sh
./deploy/setup-billing-alert.sh
```
**Cost**: Free for 12 months, then ~$25/month
**Features**: ECS Fargate, RDS PostgreSQL, ECR
**Best for**: Enterprise resume experience

## Strategy
1. **Start with Render** → Immediate $0 deployment
2. **Try AWS** → For resume building
3. **Use AWS for 12 months** → Free tier period
4. **Switch back to Render** → When AWS starts charging