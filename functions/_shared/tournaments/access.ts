export interface CapabilityTokens {
  adminToken: string;
  adminTokenHash: string;
  publicId: string;
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
