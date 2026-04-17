import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

/**
 * Ensures the APP_ENCRYPTION_KEY exists and is exactly 32 bytes (64 hex characters).
 * Throws an error if it's missing to prevent security gaps.
 */
function getEncryptionKey(): Buffer {
  const hexKey = process.env.APP_ENCRYPTION_KEY;
  if (!hexKey) {
    throw new Error('APP_ENCRYPTION_KEY is not defined in environment variables.');
  }
  const keyBuffer = Buffer.from(hexKey, 'hex');
  if (keyBuffer.length !== 32) {
    throw new Error('APP_ENCRYPTION_KEY must be a 64-character hex string (32 bytes).');
  }
  return keyBuffer;
}

export class EncryptionService {
  /**
   * Encrypts a plain text string into a combined format: iv:authTag:encryptedText
   */
  static encrypt(text: string): string {
    if (!text) return text;
    
    const iv = crypto.randomBytes(16);
    const key = getEncryptionKey();
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    
    // Format: iv:authTag:encryptedText
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  /**
   * Decrypts a combined format string (iv:authTag:encryptedText) back into plain text.
   */
  static decrypt(encryptedPayload: string): string | null {
    if (!encryptedPayload) return null;
    
    try {
      const parts = encryptedPayload.split(':');
      if (parts.length !== 3) {
         // Payload is not in the correct format, likely an unencrypted legacy value or corrupt.
         // Wait, returning null might mask existing dev keys if they were accidentally saved in plain text.
         return null; 
      }
      
      const [ivHex, authTagHex, encryptedText] = parts;
      
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const key = getEncryptionKey();
      
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('[EncryptionService] Decryption failed:', error);
      return null;
    }
  }
}
