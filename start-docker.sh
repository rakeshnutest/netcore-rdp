#!/bin/bash

# NetCore RDP Docker Startup Script
set -e

echo "🚀 Starting NetCore RDP Docker Solution..."

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Function to detect server IP
detect_server_ip() {
    # Try multiple methods to get the server IP
    local ip=""
    
    # Method 1: ip route (most reliable)
    ip=$(ip route get 1.1.1.1 2>/dev/null | grep -oP 'src \K\S+' | head -1)
    
    # Method 2: hostname -I (fallback)
    if [ -z "$ip" ]; then
        ip=$(hostname -I | awk '{print $1}' | head -1)
    fi
    
    # Method 3: ifconfig (fallback)
    if [ -z "$ip" ]; then
        ip=$(ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -1)
    fi
    
    # Default fallback
    if [ -z "$ip" ]; then
        ip="localhost"
    fi
    
    echo "$ip"
}

# Detect and set HOST_IP
SERVER_IP=$(detect_server_ip)
echo "📍 Detected server IP: $SERVER_IP"

# Update .env file with detected IP
if [ -f .env ]; then
    sed -i "s/HOST_IP=.*/HOST_IP=$SERVER_IP/" .env
else
    echo "❌ .env file not found!"
    exit 1
fi

# Load environment variables
source .env

echo "📋 Configuration:"
echo "   Frontend Port: $FRONTEND_PORT"
echo "   Backend Port:  $BACKEND_PORT"
echo "   Guacamole Port: $GUACAMOLE_PORT"
echo "   Server IP:     $HOST_IP"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose > /dev/null 2>&1; then
    echo "❌ Docker Compose is not installed. Please install it first."
    exit 1
fi

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose down --remove-orphans 2>/dev/null || true

# Build and start services
echo "🏗️ Building and starting services..."
docker-compose build --no-cache
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Check service status
echo "🔍 Checking service status..."
docker-compose ps

# Test services
echo "🧪 Testing services..."

# Test backend
if curl -s http://localhost:$BACKEND_PORT/api/health > /dev/null; then
    echo "✅ Backend is responding"
else
    echo "❌ Backend is not responding"
fi

# Test frontend
if curl -s http://localhost:$FRONTEND_PORT > /dev/null; then
    echo "✅ Frontend is responding"
else
    echo "❌ Frontend is not responding"
fi

# Test Guacamole
if curl -s http://localhost:$GUACAMOLE_PORT/guacamole/ > /dev/null; then
    echo "✅ Guacamole is responding"
else
    echo "❌ Guacamole is not responding"
fi

echo ""
echo "🎉 NetCore RDP Docker Solution is ready!"
echo ""
echo "🌐 Access URLs:"
echo "   Frontend:  http://$HOST_IP:$FRONTEND_PORT"
echo "   Backend:   http://$HOST_IP:$BACKEND_PORT"
echo "   Guacamole: http://$HOST_IP:$GUACAMOLE_PORT/guacamole"
echo ""
echo "📋 Docker services status:"
docker-compose ps

echo ""
echo "🔧 Useful commands:"
echo "   View logs:    docker-compose logs -f"
echo "   Stop services: docker-compose down"
echo "   Restart:      docker-compose restart"