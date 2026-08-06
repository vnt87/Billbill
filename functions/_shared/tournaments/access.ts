export interface CapabilityTokens {
  adminToken: string;
  adminTokenHash: string;
  publicId: string;
}

export async function hashPassphrase(passphrase: string, saltHex?: string, iterations = 100000): Promise<string> {
  const encoder = new TextEncoder();
  const salt = saltHex ? hexToBytes(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase.trim()),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  const hashHex = bytesToHex(new Uint8Array(derivedBits));
  const saltString = bytesToHex(salt);
  return `pbkdf2:${iterations}:${saltString}:${hashHex}`;
}

export async function verifyPassphrase(passphrase: string, storedHash: string): Promise<boolean> {
  if (!storedHash) return false;
  if (storedHash.startsWith('pbkdf2:')) {
    const parts = storedHash.split(':');
    if (parts.length !== 4) return false;
    const iterations = parseInt(parts[1], 10);
    const saltHex = parts[2];
    const computed = await hashPassphrase(passphrase, saltHex, iterations);
    return computed === storedHash;
  }
  const legacyHash = await hashAdminToken(passphrase.trim());
  return legacyHash === storedHash;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

export async function generateManagementToken(): Promise<string> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

function base64UrlEncode(buffer: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buffer.byteLength; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  const base64 = typeof btoa === 'function' ? btoa(binary) : Buffer.from(binary, 'binary').toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function hashAdminToken(adminToken: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(adminToken);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(hashBuffer));
}

export async function generateCapabilities(): Promise<CapabilityTokens> {
  const adminBytes = new Uint8Array(32); // 256 bits
  const publicBytes = new Uint8Array(32); // 256 bits

  crypto.getRandomValues(adminBytes);
  crypto.getRandomValues(publicBytes);

  const adminToken = base64UrlEncode(adminBytes);
  const publicId = base64UrlEncode(publicBytes);
  const adminTokenHash = await hashAdminToken(adminToken);

  return {
    adminToken,
    adminTokenHash,
    publicId,
  };
}
