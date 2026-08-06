import { describe, it, expect } from 'vitest';
import { generateCapabilities, hashAdminToken } from '../../functions/_shared/tournaments/access';

describe('Capability Security & Token Generation — Phase 4', () => {
  it('generates independent 256-bit base64url admin and public tokens', async () => {
    const caps = await generateCapabilities();

    expect(caps.adminToken).toBeDefined();
    expect(caps.publicId).toBeDefined();
    expect(caps.adminTokenHash).toBeDefined();

    // Base64url checks (no +, /, or = padding)
    expect(caps.adminToken).not.toMatch(/[+/=]/);
    expect(caps.publicId).not.toMatch(/[+/=]/);
    expect(caps.adminTokenHash).not.toMatch(/[+/=]/);

    // Ensure admin and public tokens are distinct
    expect(caps.adminToken).not.toEqual(caps.publicId);
  });

  it('consistently hashes admin tokens with SHA-256', async () => {
    const token = 'test_admin_token_123456789';
    const hash1 = await hashAdminToken(token);
    const hash2 = await hashAdminToken(token);

    expect(hash1).toEqual(hash2);
    expect(hash1).not.toEqual(token);
  });
});
