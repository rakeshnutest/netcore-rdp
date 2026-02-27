import net from 'net';

const RDP_PORT = 3389;
const TIMEOUT_MS = 2000;

/**
 * Checks if an IP is reachable on the RDP port (3389).
 *
 * @param {string} ip - IP address or hostname to check
 * @returns {Promise<boolean>} True if port is reachable
 */
export function isIpReachable(ip) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timer = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, TIMEOUT_MS);
    socket.connect(RDP_PORT, ip, () => {
      clearTimeout(timer);
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
}
