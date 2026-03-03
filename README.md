# NetCore RDP Portal - Docker Edition

A containerized RDP gateway solution using Apache Guacamole with a modern React frontend. Features **browser-based IP detection** for seamless deployment across different VMs and networks.

## 🚀 Quick Deployment

### **On Any VM (including qcow2 instances):**

1. **Start the system:**
   ```bash
   ./start-docker-flexible.sh
   ```
   
   **What the script does:**
   - Builds and starts all Docker containers
   - Automatically initializes Guacamole database schema
   - Configures browser-based IP detection
   - Provides access URLs and credentials

2. **Access the interface:**
   - Frontend: `http://YOUR_VM_IP:7015`
   - Backend API: `http://YOUR_VM_IP:7016/api`
   - Guacamole: `http://YOUR_VM_IP:7017/guacamole/`

3. **Default Guacamole Login:**
   - Username: `guacadmin`
   - Password: `guacadmin`

4. **Connect to RDP:**
   - Use the "Direct Access" tab
   - Enter target IP, username, password
   - Click "Establish Connection"

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Guacamole     │
│   (Port 7015)   │───▶│   (Port 7016)   │───▶│   (Port 7017)   │
│   React + Nginx │    │   Node.js API   │    │   RDP Gateway   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │     MySQL       │    │     Guacd       │
                       │   Database      │    │    Daemon       │
                       └─────────────────┘    └─────────────────┘
```

## 🌐 Browser-Based IP Detection

**Key Feature**: The system automatically adapts to any IP address without manual configuration.

- **Frontend**: Uses `window.location.hostname` to detect current IP
- **Backend**: Uses HTTP `Host` header from requests
- **Perfect for**: VM templates, qcow2 images, cloud deployments

## 📦 VM Deployment & qcow2 Ready

### **Deploy on New VM:**
1. Copy `netcore-rdp-docker/` folder to any VM
2. Run `./start-docker-flexible.sh`
3. Access `http://NEW_VM_IP:7015`
4. System automatically adapts to new IP!

### **For qcow2 Images:**
- Create qcow2 from VM with netcore-rdp-docker installed
- Deploy qcow2 on any new VM
- No IP configuration needed - works immediately

## 🔧 Configuration

### **Port Configuration:**
Edit `.env` file to customize ports:
```bash
FRONTEND_PORT=7015
BACKEND_PORT=7016
GUACAMOLE_PORT=7017

# Database Configuration
MYSQL_ROOT_PASSWORD=guacamole_root_pass
MYSQL_DATABASE=guacamole_db
MYSQL_USER=guacamole_user
MYSQL_PASSWORD=guacamole_pass

# Guacamole Configuration
GUACAMOLE_SECRET_KEY=your-secret-key-here
```

### **Custom Ports Example:**
```bash
# For different port range
FRONTEND_PORT=8015
BACKEND_PORT=8016
GUACAMOLE_PORT=8017
```

## 🔨 Frontend Build Process

### **Pre-Built Frontend Binaries:**
The repository includes pre-built frontend binaries in `frontend/dist/`, so **no Node.js or build step is required** for deployment.

### **When to Rebuild Frontend:**
Only rebuild if you modify React components:
- After modifying React components
- After updating API endpoints
- After changing UI functionality

### **Build Steps:**

#### **Option 1: Automated Build Script**
```bash
cd /root/netcore-rdp-docker
./build.sh
```

#### **Option 2: Manual Build Process**
```bash
# Step 1: Build React frontend
cd /root/netcore-rdp/frontend  # (working netcore-rdp system)
npm run build                  # Creates new dist/ folder

# Step 2: Copy new build to Docker project
rm -rf /root/netcore-rdp-docker/frontend/dist
cp -r /root/netcore-rdp/frontend/dist /root/netcore-rdp-docker/frontend/

# Step 3: Check new asset filenames
cd /root/netcore-rdp-docker/frontend
ls -la dist/assets/
# Note the new hash filenames (e.g., index-ABC123.js, index-DEF456.css)

# Step 4: Update index.html with new asset filenames
# Edit /root/netcore-rdp-docker/frontend/index.html
# Replace:
#   <script type="module" crossorigin src="/assets/index-OLD_HASH.js"></script>
#   <link rel="stylesheet" crossorigin href="/assets/index-OLD_HASH.css">
# With new filenames from Step 3

# Step 5: Rebuild and restart Docker container
cd /root/netcore-rdp-docker
docker-compose build frontend && docker-compose up -d frontend
```

## 📋 API Documentation

### **Access Built-in Docs:**
`http://YOUR_VM_IP:7015` → Click "API Documentation" tab

### **Quick API Examples:**

```bash
# List active sessions
curl -s http://YOUR_VM_IP:7015/api/sessions/active

# Create RDP connection
curl -X POST http://YOUR_VM_IP:7015/api/sessions/connect \
  -H "Content-Type: application/json" \
  -H "Host: YOUR_VM_IP:7015" \
  -d '{
    "ip": "TARGET_RDP_IP",
    "username": "rdp_username",
    "password": "rdp_password",
    "name": "Connection Name"
  }'

# Disconnect all sessions
curl -X POST http://YOUR_VM_IP:7015/api/sessions/disconnect-all \
  -H "Content-Type: application/json" \
  -H "Host: YOUR_VM_IP:7015" -d '{}'
```

## 🔍 Troubleshooting

### **Check System Status:**
```bash
# Container status
docker-compose ps

# Service logs
docker-compose logs frontend
docker-compose logs backend
docker-compose logs guacamole

# All logs
docker-compose logs

# Follow logs in real-time
docker-compose logs -f backend
```

### **Common Issues:**

#### **Port Conflicts:**
```bash
# Check what's using ports
netstat -tulpn | grep -E ":(7015|7016|7017)"

# Stop conflicting services
sudo systemctl stop nginx  # if using port 7015
```

#### **Container Build Issues:**
```bash
# Clean rebuild
docker-compose down
docker system prune -f
docker-compose build --no-cache
docker-compose up -d
```

#### **Frontend Not Loading:**
```bash
# Check nginx logs
docker-compose logs frontend

# Verify assets
curl -s http://YOUR_VM_IP:7015/runtime-config.js
curl -s -o /dev/null -w "%{http_code}" http://YOUR_VM_IP:7015/assets/index-*.js
```

#### **API Errors:**
```bash
# Test backend directly
curl -s http://YOUR_VM_IP:7016/api/sessions/active

# Test through frontend proxy
curl -s http://YOUR_VM_IP:7015/api/sessions/active

# Check browser console for runtime IP detection
# Should show: "🌐 Runtime API URL auto-detected: http://YOUR_VM_IP:7016"
```

## 🎯 Deployment Scenarios

### **Scenario 1: Local Development**
```bash
# VM IP: 192.168.1.100
./start-docker-flexible.sh
# Access: http://192.168.1.100:7015
```

### **Scenario 2: Cloud Instance**
```bash
# VM IP: 203.0.113.45
./start-docker-flexible.sh
# Access: http://203.0.113.45:7015
```

### **Scenario 3: Corporate Network**
```bash
# VM IP: 10.10.10.50
./start-docker-flexible.sh
# Access: http://10.10.10.50:7015
```

### **Scenario 4: Multiple VMs from Same qcow2**
```bash
# Each VM automatically adapts to its own IP
# VM1: 172.16.1.10 → http://172.16.1.10:7015
# VM2: 172.16.1.11 → http://172.16.1.11:7015
# VM3: 172.16.1.12 → http://172.16.1.12:7015
```

## 📁 File Structure

```
netcore-rdp-docker/
├── docker-compose.yml          # Main orchestration
├── start-docker-flexible.sh    # Smart startup script
├── stop-docker.sh              # Cleanup script
├── build.sh                    # Frontend build automation
├── .env                        # Environment configuration
├── .dockerignore              # Docker build exclusions
├── README.md                   # This documentation
├── QCOW2_DEPLOYMENT_GUIDE.md   # Detailed qcow2 guide
├── backend/
│   ├── Dockerfile              # Backend container
│   ├── server.js               # Main server file
│   ├── package.json            # Dependencies
│   ├── routes/                 # API endpoints
│   │   ├── sessions.js         # Session management
│   │   ├── auth.js             # Authentication
│   │   └── servers.js          # Server management
│   └── middleware/             # Express middleware
└── frontend/
    ├── Dockerfile              # Frontend container
    ├── nginx.conf              # Nginx configuration
    ├── runtime-config.js       # Browser IP detection
    ├── index.html              # Main HTML file
    ├── dist/                   # Built React app
    └── src/                    # React source code
        ├── App.jsx             # Main React component
        └── api.js              # API client
```

## 🎉 Features

- ✅ **Zero IP Configuration**: Works on any VM automatically
- ✅ **qcow2 Ready**: Perfect for VM templates
- ✅ **Browser-Based Detection**: Frontend adapts to current hostname
- ✅ **Request-Based Backend**: Backend uses HTTP Host headers
- ✅ **Docker Containerized**: Easy deployment and management
- ✅ **Modern UI**: React-based dashboard with dark theme
- ✅ **API Integration**: RESTful API for automation
- ✅ **Session Management**: Track and control RDP connections
- ✅ **Security**: Encrypted RDP tunnels through Guacamole

## 📞 Support

For issues or questions:
1. Check container logs: `docker-compose logs`
2. Verify network connectivity: `netstat -tulpn`
3. Test individual services using curl commands above
4. Check browser console for frontend errors

---

**🎯 Perfect for VM templates, cloud deployments, and automated infrastructure!**# Last updated: Tue Mar  3 13:44:16 UTC 2026
