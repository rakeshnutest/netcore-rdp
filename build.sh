#!/bin/bash

set -e

echo "🔨 NetCore RDP Docker - Frontend Build Script"
echo "=============================================="

# Check if we're on the correct system
if [ ! -d "/root/netcore-rdp/frontend" ]; then
    echo "❌ Error: /root/netcore-rdp/frontend not found"
    echo "   This script should be run on a VM that has both:"
    echo "   - /root/netcore-rdp (working system)"
    echo "   - /root/netcore-rdp-docker (Docker project)"
    exit 1
fi

if [ ! -d "/root/netcore-rdp-docker/frontend" ]; then
    echo "❌ Error: /root/netcore-rdp-docker/frontend not found"
    echo "   Make sure netcore-rdp-docker folder exists"
    exit 1
fi

echo "📍 Step 1: Building React frontend..."
cd /root/netcore-rdp/frontend
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed"
    exit 1
fi

echo "✅ Frontend build completed"

echo "📍 Step 2: Copying new build to Docker project..."
rm -rf /root/netcore-rdp-docker/frontend/dist
cp -r /root/netcore-rdp/frontend/dist /root/netcore-rdp-docker/frontend/

echo "📍 Step 3: Checking new asset filenames..."
cd /root/netcore-rdp-docker/frontend
echo "New assets in dist/assets/:"
ls -la dist/assets/

# Extract new filenames
JS_FILE=$(ls dist/assets/index-*.js | head -1 | xargs basename)
CSS_FILE=$(ls dist/assets/index-*.css | head -1 | xargs basename)

echo "📍 Step 4: Asset filenames detected:"
echo "   JavaScript: $JS_FILE"
echo "   CSS: $CSS_FILE"

echo ""
echo "⚠️  MANUAL STEP REQUIRED:"
echo "   Update /root/netcore-rdp-docker/frontend/index.html"
echo "   Replace the asset filenames with:"
echo "   <script type=\"module\" crossorigin src=\"/assets/$JS_FILE\"></script>"
echo "   <link rel=\"stylesheet\" crossorigin href=\"/assets/$CSS_FILE\">"
echo ""
echo "   Then run:"
echo "   cd /root/netcore-rdp-docker"
echo "   docker-compose build frontend && docker-compose up -d frontend"
echo ""
echo "🎯 Build preparation completed!"
echo "   Follow the manual steps above to complete the deployment."