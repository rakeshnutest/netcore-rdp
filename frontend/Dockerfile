# Simple Dockerfile using pre-built frontend
FROM nginx:alpine

# Copy custom nginx configuration
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy pre-built application
COPY frontend/dist /usr/share/nginx/html

# Copy runtime configuration files
COPY frontend/runtime-config.js /usr/share/nginx/html/
COPY frontend/index.html /usr/share/nginx/html/
COPY frontend/api-runtime.js /usr/share/nginx/html/

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:80/ || exit 1

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]