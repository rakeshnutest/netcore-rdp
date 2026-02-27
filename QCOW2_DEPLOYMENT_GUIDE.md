# 🚀 NetCore RDP Docker - qcow2 Deployment Guide

## 📋 Overview

This guide explains how to deploy the NetCore RDP Docker solution on VM instances created from qcow2 images. The solution automatically adapts to any IP address without manual configuration.

## 🎯 Key Features

- ✅ **Zero IP Configuration**: Automatically works on any VM IP
- ✅ **Browser-Based Detection**: Frontend uses browser's current hostname
- ✅ **Request-Based Backend**: Backend gets IP from HTTP request headers
- ✅ **qcow2 Ready**: Perfect for VM templates and cloud deployments

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Browser       │    │   Frontend      │    │   Backend       │
│                 │    │   (Port 7015)   │    │   (Port 7016)   │
│ Uses current    │───▶│ runtime-config  │───▶│ getGuacamole    │
│ hostname/IP     │    │ detects IP      │    │ BaseUrl(req)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   Guacamole     │    │   PostgreSQL    │
                       │   (Port 7017)   │    │   Database      │
                       └─────────────────┘    └─────────────────┘
```

## 📦 Files Structure

```
netcore-rdp-docker/
├── docker-compose.yml              # Main orchestration
├── start-docker-flexible.sh        # Smart startup script
├── stop-docker.sh                  # Cleanup script
├── .env                            # Environment config (no HOST_IP needed)
├── frontend/
│   ├── Dockerfile                  # Frontend container
│   ├── runtime-config.js           # 🌟 Browser IP detection
│   ├── api-runtime.js              # 🌟 Runtime API config
│   ├── index.html                  # Updated HTML
│   └── nginx.conf                  # Nginx config
└── backend/
    ├── Dockerfile                  # Backend container
    └── routes/sessions.js          # 🌟 Request-based IP detection
```

## 🚀 Deployment Steps

### 1. Prepare qcow2 Image (One Time)

On your source VM (e.g., `10.127.112.157`):

```bash
# Navigate to the project directory
cd /path/to/netcore-rdp-docker

# Start the services to verify everything works
./start-docker-flexible.sh

# Test the deployment
curl http://localhost:7015
curl http://localhost:7016/api/sessions/active

# Stop services before creating qcow2
./stop-docker.sh

# Create qcow2 image (on hypervisor)
qemu-img convert -f raw -O qcow2 source-vm.raw netcore-rdp-template.qcow2
```

### 2. Deploy on New VM (Every Time)

On any new VM created from the qcow2:

```bash
# Navigate to the project directory
cd /path/to/netcore-rdp-docker

# Simply start the services - no configuration needed!
./start-docker-flexible.sh
```

**That's it!** The system will automatically:
- Detect the new VM's IP from browser requests
- Configure all services correctly
- Work immediately without any manual changes

### 3. Access the System

From any browser:
```
http://<NEW_VM_IP>:7015
```

The system automatically detects `<NEW_VM_IP>` and configures itself.

## 🔧 How It Works

### Frontend IP Detection

The `runtime-config.js` script runs in the browser:

```javascript
// Gets the IP/hostname the browser is already connected to
const currentHost = window.location.hostname;
const apiUrl = `http://${currentHost}:7016`;
window.RUNTIME_API_URL = apiUrl;
```

### Backend IP Detection

The backend gets the IP from HTTP request headers:

```javascript
function getGuacamoleBaseUrl(req) {
  // Extract hostname from the Host header (browser's target)
  const hostHeader = req.headers['host'];
  const serverIp = hostHeader.split(':')[0];
  
  return `http://${serverIp}:7017/guacamole`;
}
```

### Why This Works

1. **Browser knows the IP**: When a user accesses `http://192.168.1.100:7015`, the browser sends `Host: 192.168.1.100:7015` in all requests
2. **Frontend uses browser IP**: JavaScript `window.location.hostname` gives `192.168.1.100`
3. **Backend uses request IP**: HTTP `Host` header contains `192.168.1.100:7016`
4. **Guacamole URLs are correct**: Generated as `http://192.168.1.100:7017/guacamole`

## 🌍 Deployment Scenarios

### Scenario 1: Local Development
```bash
# VM IP: 192.168.1.100
./start-docker-flexible.sh
# Access: http://192.168.1.100:7015
```

### Scenario 2: Cloud Instance
```bash
# VM IP: 203.0.113.45
./start-docker-flexible.sh
# Access: http://203.0.113.45:7015
```

### Scenario 3: Corporate Network
```bash
# VM IP: 10.10.10.50
./start-docker-flexible.sh
# Access: http://10.10.10.50:7015
```

### Scenario 4: Multiple VMs from Same qcow2
```bash
# VM1 IP: 172.16.1.10
# VM2 IP: 172.16.1.11
# VM3 IP: 172.16.1.12

# On each VM, just run:
./start-docker-flexible.sh

# Each works independently with its own IP
```

## 🔍 Troubleshooting

### Check Service Status
```bash
docker-compose ps
docker-compose logs frontend
docker-compose logs backend
```

### Verify IP Detection
```bash
# Check frontend logs (browser console)
# Should show: "🌐 Runtime API URL auto-detected: http://YOUR_IP:7016"

# Check backend logs
docker-compose logs backend | grep "Generated Guacamole URL"
# Should show: "🌐 Generated Guacamole URL: http://YOUR_IP:7017/guacamole"
```

### Test API Connectivity
```bash
# From the VM
curl http://localhost:7016/api/sessions/active

# From another machine
curl http://YOUR_VM_IP:7016/api/sessions/active
```

### Common Issues

1. **Ports already in use**:
   ```bash
   # Check what's using the ports
   netstat -tulpn | grep -E ":(7015|7016|7017)"
   
   # Stop conflicting services
   sudo systemctl stop nginx  # if using port 7015
   ```

2. **Docker not running**:
   ```bash
   sudo systemctl start docker
   sudo systemctl enable docker
   ```

3. **Firewall blocking ports**:
   ```bash
   # Allow ports through firewall
   sudo ufw allow 7015
   sudo ufw allow 7016
   sudo ufw allow 7017
   ```

## 📊 Verification Checklist

After deployment on a new VM:

- [ ] All containers are running: `docker-compose ps`
- [ ] Frontend accessible: `curl http://NEW_VM_IP:7015`
- [ ] Backend API works: `curl http://NEW_VM_IP:7016/api/sessions/active`
- [ ] Guacamole accessible: `curl http://NEW_VM_IP:7017/guacamole`
- [ ] Browser console shows correct IP detection
- [ ] RDP connections work through the interface

## 🎉 Benefits

1. **Zero Configuration**: No manual IP changes needed
2. **Template Friendly**: Perfect for VM templates and automation
3. **Cloud Ready**: Works in any cloud environment
4. **Multi-VM**: Deploy multiple instances without conflicts
5. **Maintenance Free**: No IP-related maintenance required

## 🔧 Advanced Configuration

### Custom Ports

Edit `.env` file before starting:
```bash
FRONTEND_PORT=8015
BACKEND_PORT=8016
GUACAMOLE_PORT=8017
```

### Behind Reverse Proxy

The system automatically detects forwarded headers:
- `X-Forwarded-Host`
- `X-Real-IP`
- `X-Forwarded-For`

## 📞 Support

If you encounter issues:

1. Check the logs: `docker-compose logs`
2. Verify network connectivity: `netstat -tulpn`
3. Test individual services: `curl` commands above
4. Check browser console for frontend errors

---

**🎯 Summary**: This solution eliminates IP configuration complexity by using browser-based detection. Perfect for qcow2 deployments, cloud instances, and VM templates!