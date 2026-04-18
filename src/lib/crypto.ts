import crypto from 'crypto';

// The encryption key from environment. Must be exactly 32 bytes (256 bits).
const ENCRYPTION_KEY = process.env.APP_ENCRYPTION_KEY; 

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Handles AES-256-GCM encryption/decryption for sensitive data like API keys.
 * Expects process.env.APP_ENCRYPTION_KEY to be a 32-byte hex or base64 string.
 */
export class CryptoService {
  
  private static getKeyBuffer(): Buffer {
    if (!ENCRYPTION_KEY) {
      throw new Error("APP_ENCRYPTION_KEY is not defined in environment variables. Required for Data Encryption.");
    }
    
    // We try to interpret the key as hex or decode it directly. If it's a random 64 char hex string, it's 32 bytes.
    let keyBuf: Buffer;
    if (ENCRYPTION_KEY.length === 64 && /^[0-9a-fA-F]+$/.test(ENCRYPTION_KEY)) {
      keyBuf = Buffer.from(ENCRYPTION_KEY, 'hex');
    } else {
       // fallback, just pad or truncate to 32 bytes
       keyBuf = Buffer.alloc(32);
       keyBuf.write(ENCRYPTION_KEY.substring(0, 32));
    }

    if (keyBuf.length !== 32) {
      throw new Error(`APP_ENCRYPTION_KEY buffer must be exactly 32 bytes. Got ${keyBuf.length}.`);
    }

    return keyBuf;
  }

  /**
   * Encrypts plain text using AES-256-GCM.
   * Returns a payload in format: iv:authTag:encryptedData (all hex)
   */
  static encrypt(text: string): string {
     if (!text) return text;
     
     const key = this.getKeyBuffer();
     const iv = crypto.randomBytes(IV_LENGTH);
     const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
     let encrypted = cipher.update(text, 'utf8', 'hex');
     encrypted += cipher.final('hex');
     const authTag = cipher.getAuthTag().toString('hex');
     
     return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  /**
   * Decrypts text previously encrypted by encrypt().
   * Handles format: iv:authTag:encryptedData
   * If decryption fails (e.g., plain text passed instead of payload), it logs a warning and returns the original text to prevent breaking legacy unencrypted records.
   */
  static decrypt(encryptedPayload: string): string {
    if (!encryptedPayload) return encryptedPayload;
    
    const parts = encryptedPayload.split(':');
    if (parts.length !== 3) {
      // It might be legacy unencrypted data or just an invalid format.
      // We return it safely as we cannot decrypt it.
      return encryptedPayload;
    }

    try {
      const [ivHex, authTagHex, encryptedHex] = parts;
      const key = this.getKeyBuffer();
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (e) {
      // If auth tag verification fails or another crypto error occurs, gracefully fallback or throw.
      console.error("CryptoService Decryption Error:", e);
      // Depending on policy, we could throw here, but for smooth transition of legacy open keys to encrypted:
      return encryptedPayload; 
    }
  }
}
