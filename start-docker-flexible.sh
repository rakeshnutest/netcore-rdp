#!/bin/bash

set -e

echo "🚀 Starting NetCore RDP Docker Solution (Flexible IP)"
echo "=================================================="
echo "📦 Using pre-built frontend binaries (no Node.js build required)"

# No server IP detection needed - frontend will use browser's hostname
echo "🌐 Using browser-based IP detection (no server-side IP detection)"
SERVER_IP="0.0.0.0"  # Backend binds to all interfaces

# Create/update .env file
echo "📝 Creating .env file (no HOST_IP needed - using browser detection)"
cat > .env << EOF
# NetCore RDP Docker Configuration
# HOST_IP not needed - frontend detects IP from browser

# Port Configuration (7015-7017 to avoid conflicts)
FRONTEND_PORT=7015
BACKEND_PORT=7016
GUACAMOLE_PORT=7017

# Database Configuration
POSTGRES_DB=guacamole_db
POSTGRES_USER=guacamole_user
POSTGRES_PASSWORD=guacamole_pass

# Guacamole Configuration
GUACAMOLE_SECRET_KEY=your-secret-key-here
EOF

echo "📋 Current configuration:"
cat .env
echo ""

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose down --remove-orphans 2>/dev/null || true

# Remove any orphaned containers
echo "🧹 Cleaning up Docker system..."
docker system prune -f --volumes 2>/dev/null || true

# Build and start services
echo "🔨 Building Docker images..."
docker-compose build --no-cache

echo "🚀 Starting all services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Initialize Guacamole database if needed
echo "🗄️ Initializing Guacamole database..."
if ! docker-compose exec -T postgres psql -U guacamole_user -d guacamole_db -c "SELECT 1 FROM guacamole_user LIMIT 1;" >/dev/null 2>&1; then
    echo "📋 Database schema not found, initializing..."
    
    # Generate schema
    docker run --rm guacamole/guacamole /opt/guacamole/bin/initdb.sh --postgresql > /tmp/initdb.sql 2>/dev/null
    
    # Apply schema
    if docker-compose exec -T postgres psql -U guacamole_user -d guacamole_db < /tmp/initdb.sql >/dev/null 2>&1; then
        echo "✅ Database schema initialized successfully"
        
        # Restart Guacamole to connect to initialized database
        echo "🔄 Restarting Guacamole..."
        docker-compose restart guacamole >/dev/null 2>&1
        sleep 5
    else
        echo "⚠️ Database initialization failed, but continuing..."
    fi
    
    # Cleanup
    rm -f /tmp/initdb.sql
else
    echo "✅ Database already initialized"
fi

# Check service health
echo "🔍 Checking service status..."
echo ""

# Check if containers are running
containers=(
    "netcore-rdp-docker-postgres-1"
    "netcore-rdp-docker-guacd-1" 
    "netcore-rdp-docker-guacamole-1"
    "netcore-rdp-docker-backend-1"
    "netcore-rdp-docker-frontend-1"
)

all_healthy=true
for container in "${containers[@]}"; do
    if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "$container.*Up"; then
        status=$(docker ps --format "table {{.Names}}\t{{.Status}}" | grep "$container" | awk '{print $2, $3, $4}')
        echo "✅ $container: $status"
    else
        echo "❌ $container: Not running"
        all_healthy=false
    fi
done

echo ""

if [ "$all_healthy" = true ]; then
    echo "🎉 All services are running successfully!"
    echo ""
    echo "📱 Access URLs:"
    echo "   Frontend:   http://<YOUR_VM_IP>:7015"
    echo "   Backend:    http://<YOUR_VM_IP>:7016"
    echo "   Guacamole:  http://<YOUR_VM_IP>:7017"
    echo ""
    echo "🔐 Guacamole login credentials:"
    echo "   Username: guacadmin"
    echo "   Password: guacadmin"
    echo ""
    echo "🔐 RDP connection credentials:"
    echo "   Username: <your_rdp_username>"
    echo "   Password: <your_rdp_password>"
    echo ""
    echo "💡 The system uses browser-based IP detection:"
    echo "   • Frontend: Uses window.location.hostname (browser's current IP)"
    echo "   • Backend: Uses HTTP Host header from requests"
    echo "   • No server-side IP detection needed!"
    echo ""
    echo "📦 For qcow2 deployment on different VMs:"
    echo "   1. Deploy qcow2 image on any VM with any IP"
    echo "   2. Run: ./start-docker-flexible.sh"
    echo "   3. Access: http://NEW_VM_IP:7015"
    echo "   4. System automatically adapts to the new IP!"
    echo ""
    echo "🎯 Perfect for VM templates, cloud instances, and multi-VM deployments"
else
    echo "❌ Some services failed to start. Check logs:"
    echo "   docker-compose logs"
    exit 1
fi