// Runtime configuration script
// This script detects the current host IP and configures the API URL dynamically
// Works automatically on any VM/IP without hardcoding

(function() {
    // Get the current hostname/IP from the browser URL
    const currentHost = window.location.hostname;
    const protocol = window.location.protocol;
    
    // Backend port (should match BACKEND_PORT in .env)
    const backendPort = '7016';
    
    // Construct the API URL using the same host the browser is already connected to
    const apiUrl = `${protocol}//${currentHost}:${backendPort}`;
    
    // Store in global variable for the app to use
    window.RUNTIME_API_URL = apiUrl;
    
    console.log('🌐 Runtime API URL auto-detected:', apiUrl);
    console.log('📍 Current host from browser:', currentHost);
    console.log('✅ This will work on any VM/IP automatically!');
})();