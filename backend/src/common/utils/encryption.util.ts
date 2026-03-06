import * as crypto from 'crypto';

const ENCRYPTION_PREFIX = 'enc:';
const ALGORITHM = 'aes-256-gcm';

const getEncryptionKey = () => {
  const secret = process.env.INTEGRATIONS_ENCRYPTION_KEY || process.env.JWT_SECRET || 'lumio';
  return crypto.createHash('sha256').update(secret).digest();
};

export const encryptText = (value: string): string => {
  if (!value) return value;
  if (value.startsWith(ENCRYPTION_PREFIX)) return value;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, tag, encrypted]).toString('base64');
  return `${ENCRYPTION_PREFIX}${payload}`;
};

export const decryptText = (value: string): string => {
  if (!value) return value;
  if (!value.startsWith(ENCRYPTION_PREFIX)) return value;

  try {
    const payload = value.slice(ENCRYPTION_PREFIX.length);
    const data = Buffer.from(payload, 'base64');
    if (data.length < 12 + 16) {
      return value;
    }

    const iv = data.subarray(0, 12);
    const tag = data.subarray(12, 28);
    const encrypted = data.subarray(28);
    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    return value;
  }
};
