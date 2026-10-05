import crypto from 'crypto';

// Secret key for signing admin session tokens (falls back to a stable hash if not set)
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'sisaket-roadguard-secure-secret-key-2026';

export function signAdminToken(payload: { role: string; timestamp: number }): string {
  const data = JSON.stringify(payload);
  const hmac = crypto.createHmac('sha256', SESSION_SECRET);
  hmac.update(data);
  const signature = hmac.digest('hex');
  const token = Buffer.from(JSON.stringify({ data, signature })).toString('base64');
  return token;
}

export function verifyAdminToken(token: string): boolean {
  if (!token) return false;
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    const { data, signature } = decoded;
    
    const hmac = crypto.createHmac('sha256', SESSION_SECRET);
    hmac.update(data);
    const expectedSignature = hmac.digest('hex');
    
    if (signature !== expectedSignature) return false;
    
    const payload = JSON.parse(data);
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    
    // Check expiration (24 hours)
    if (Date.now() - payload.timestamp > ONE_DAY_MS) {
      return false;
    }
    
    return payload.role === 'admin';
  } catch {
    return false;
  }
}
