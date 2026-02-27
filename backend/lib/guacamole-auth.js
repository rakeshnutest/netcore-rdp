import crypto from 'crypto';

/**
 * Generates encrypted JSON for Guacamole JSON auth extension.
 * Signs with HMAC-SHA256, encrypts with AES-128-CBC (IV=zeros).
 *
 * @param {object} payload - JSON payload with username, expires, connections
 * @param {string} secretKeyHex - 32-char hex key (must match Guacamole JSON_SECRET_KEY)
 * @returns {string} Base64-encoded signed+encrypted data
 */
export function encryptGuacamoleJson(payload, secretKeyHex) {
  const jsonStr = JSON.stringify(payload);
  const keyBuf = Buffer.from(secretKeyHex, 'hex');
  if (keyBuf.length !== 16) {
    throw new Error('JSON_SECRET_KEY must be 32 hex chars (128 bits)');
  }

  const hmac = crypto.createHmac('sha256', keyBuf).update(jsonStr).digest();
  const plaintext = Buffer.concat([hmac, Buffer.from(jsonStr, 'utf8')]);

  const iv = Buffer.alloc(16, 0);
  const cipher = crypto.createCipheriv('aes-128-cbc', keyBuf, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);

  return encrypted.toString('base64');
}
