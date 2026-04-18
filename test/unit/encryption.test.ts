import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EncryptionService } from '@/lib/encryption';

describe('EncryptionService (AES-256-GCM)', () => {
  const originalEnv = process.env.APP_ENCRYPTION_KEY;

  beforeEach(() => {
    // Valid 32-byte key in hex (64 chars)
    process.env.APP_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  });

  afterEach(() => {
    process.env.APP_ENCRYPTION_KEY = originalEnv;
  });

  it('Encrypts and decrypts strings perfectly', () => {
    const plainText = 'secret-api-key-12345';
    const encrypted = EncryptionService.encrypt(plainText);
    
    expect(encrypted).not.toBe(plainText);
    expect(encrypted.split(':').length).toBe(3); // iv:authTag:encrypted

    const decrypted = EncryptionService.decrypt(encrypted);
    expect(decrypted).toBe(plainText);
  });

  it('Throws error if APP_ENCRYPTION_KEY is missing during encryption', () => {
    delete process.env.APP_ENCRYPTION_KEY;
    expect(() => EncryptionService.encrypt('test')).toThrow('APP_ENCRYPTION_KEY is not defined');
  });

  it('Throws error if APP_ENCRYPTION_KEY is wrong length', () => {
    process.env.APP_ENCRYPTION_KEY = 'too-short';
    expect(() => EncryptionService.encrypt('test')).toThrow('must be a 64-character hex string');
  });

  it('Returns null when decrypting garbage/invalid format', () => {
    // Missing colons
    const result = EncryptionService.decrypt('invalid-legacy-text');
    expect(result).toBeNull();
  });

  it('Returns null when decryption fails (e.g. wrong key/authTag)', () => {
    const encrypted = EncryptionService.encrypt('hello world');
    
    // Sabotage the auth tag
    const parts = encrypted.split(':');
    parts[1] = '00000000000000000000000000000000'; // Fake authTag
    const brokenPayload = parts.join(':');

    // Should catch the crypto error and return null, preventing crashes
    const decrypted = EncryptionService.decrypt(brokenPayload);
    expect(decrypted).toBeNull();
  });

  it('Handles falsy values gracefully', () => {
    expect(EncryptionService.encrypt('')).toBe('');
    expect(EncryptionService.decrypt('')).toBeNull();
  });
});
