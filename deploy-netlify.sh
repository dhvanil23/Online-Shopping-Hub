#!/bin/bash

set -e

echo "🚀 Deploying to Netlify..."

# Build frontend
echo "🏗️ Building frontend..."
cd frontend
npm install
npm run build
cd ..

# Deploy to Netlify
echo "🌐 Deploying to Netlify..."
npx netlify-cli deploy --prod --dir=frontend/dist

echo "✅ Deployment complete!"