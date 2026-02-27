#!/bin/bash

echo "🧪 Testing IP Detection for NetCore RDP Docker"
echo "=============================================="

# Test 1: Check if services are running
echo "1. 🔍 Checking if services are running..."
if docker-compose ps | grep -q "Up"; then
    echo "   ✅ Docker services are running"
else
    echo "   ❌ Docker services are not running. Start with: ./start-docker-flexible.sh"
    exit 1
fi

# Test 2: Test frontend accessibility
echo ""
echo "2. 🌐 Testing frontend accessibility..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:7015 | grep -q "200"; then
    echo "   ✅ Frontend is accessible on port 7015"
else
    echo "   ❌ Frontend is not accessible on port 7015"
fi

# Test 3: Test backend API
echo ""
echo "3. 🔧 Testing backend API..."
response=$(curl -s http://localhost:7016/api/sessions/active)
if echo "$response" | grep -q "sessions"; then
    echo "   ✅ Backend API is responding correctly"
else
    echo "   ❌ Backend API response: $response"
fi

# Test 4: Test with different Host headers to simulate different IPs
echo ""
echo "4. 🎭 Simulating requests from different IPs..."

test_ips=("192.168.1.100" "10.0.0.50" "172.16.1.200")

for ip in "${test_ips[@]}"; do
    echo "   Testing with IP: $ip"
    
    # Make request with custom Host header
    response=$(curl -s -H "Host: $ip:7016" http://localhost:7016/api/sessions/active 2>/dev/null)
    
    if echo "$response" | grep -q "sessions"; then
        echo "   ✅ Backend correctly handles requests for IP: $ip"
    else
        echo "   ⚠️  Backend response for IP $ip: $response"
    fi
done

# Test 5: Check Docker logs for IP detection
echo ""
echo "5. 📋 Recent backend logs (IP detection)..."
echo "   Looking for Guacamole URL generation logs..."
docker-compose logs --tail=10 backend | grep -E "(Generated Guacamole URL|Host:)" || echo "   ℹ️  No recent Guacamole URL logs found"

echo ""
echo "🎉 Test completed!"
echo ""
echo "💡 To test with a real browser:"
echo "   1. Open http://YOUR_VM_IP:7015 in a browser"
echo "   2. Check browser console for: '🌐 Runtime API URL auto-detected'"
echo "   3. Try connecting to an RDP server"
echo "   4. Check backend logs for: '🌐 Generated Guacamole URL'"