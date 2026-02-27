#!/bin/bash

# NetCore RDP Docker Stop Script
set -e

echo "🛑 Stopping NetCore RDP Docker Solution..."

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Stop and remove containers
echo "📦 Stopping containers..."
docker-compose down --remove-orphans

# Optional: Remove volumes (uncomment if you want to reset data)
# echo "🗑️ Removing volumes..."
# docker-compose down -v

echo "✅ NetCore RDP Docker Solution stopped successfully!"

# Show remaining containers (if any)
echo ""
echo "📋 Remaining containers:"
docker-compose ps