import crypto from 'crypto';

// Secret key for signing admin session tokens
const SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET ||
  (process.env.NODE_ENV === 'production'
    ? 'sisaket-prod-guard-secret-salt-2026-secure-key'
    : 'sisaket-roadguard-secure-secret-key-2026');

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

    // Constant-time buffer equality check to prevent timing attacks
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return false;
    }

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

/**
 * Check if the incoming request has valid admin authorization
 * Supports Authorization header (Bearer token) and Cookie session
 */
export function isAuthorized(req: Request): boolean {
  const authHeader = req.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (verifyAdminToken(token)) return true;
  }

  const cookieHeader = req.headers.get('cookie');
  if (cookieHeader) {
    const match = cookieHeader.match(/sisaket_admin_session=([^;]+)/);
    if (match && verifyAdminToken(match[1])) return true;
  }

  return false;
}

/**
 * Mask citizen phone number for PDPA compliance
 * e.g., '0812345678' -> '081-XXX-5678'
 */
export function maskPhoneNumber(phone?: string | null): string {
  if (!phone) return '0XX-XXX-XXXX';
  const clean = phone.replace(/\D/g, '');
  if (clean.length < 7) return '0XX-XXX-XXXX';
  const prefix = clean.substring(0, 3);
  const suffix = clean.substring(clean.length - 4);
  return `${prefix}-XXX-${suffix}`;
}

/**
 * Validate URL to prevent XSS / javascript: schemes / open redirects
 */
export function isValidHttpUrl(urlStr?: string | null): boolean {
  if (!urlStr) return true; // Optional field
  try {
    const parsed = new URL(urlStr);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Sanitize text strings to remove dangerous control characters and script injection
 */
export function sanitizeString(input?: string | null, maxLength = 1000): string {
  if (!input) return '';
  return input
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, maxLength);
}

// In-Memory Sliding Window Rate Limiter
interface RateLimitRecord {
  count: number;
  resetTimeMs: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

// Clean up expired records every 5 minutes to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    rateLimitMap.forEach((record, key) => {
      if (now > record.resetTimeMs) {
        rateLimitMap.delete(key);
      }
    });
  }, 5 * 60 * 1000);
}

/**
 * In-Memory Rate Limiting Helper
 * @param key unique identifier (e.g. `auth:${ip}`, `report:${ip}`)
 * @param maxLimit maximum allowed requests within window
 * @param windowMs time window in milliseconds
 */
export function checkRateLimit(
  key: string,
  maxLimit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetTimeMs: number } {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTimeMs) {
    const newRecord: RateLimitRecord = {
      count: 1,
      resetTimeMs: now + windowMs,
    };
    rateLimitMap.set(key, newRecord);
    return { allowed: true, remaining: maxLimit - 1, resetTimeMs: newRecord.resetTimeMs };
  }

  if (record.count >= maxLimit) {
    return { allowed: false, remaining: 0, resetTimeMs: record.resetTimeMs };
  }

  record.count += 1;
  return { allowed: true, remaining: maxLimit - record.count, resetTimeMs: record.resetTimeMs };
}

/**
 * Extract Client IP from headers
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}
