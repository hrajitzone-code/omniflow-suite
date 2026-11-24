/**
 * Shared security and sanitization utilities for OmniFlow.
 */

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Escapes untrusted text for safe insertion into HTML templates.
 */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, (ch) => HTML_ESCAPE_MAP[ch] || ch);
}

/**
 * Validates that a dynamic external URL uses http: or https: only.
 * Blocks javascript:, data:, vbscript:, file:, and malformed URLs.
 */
export function sanitizeExternalUrl(raw?: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Escapes CSV cell values and neutralizes spreadsheet formula injection.
 */
export function escapeCsvCell(value: unknown): string {
  let str = '';
  if (value === null || value === undefined) {
    str = '';
  } else if (typeof value === 'object') {
    str = JSON.stringify(value);
  } else {
    str = String(value);
  }

  // Neutralize Excel / Google Sheets formula injection prefixes
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Validates a Google Sheets Spreadsheet ID format.
 */
export function isValidSpreadsheetId(id?: string | null): boolean {
  if (!id || typeof id !== 'string') return false;
  return /^[a-zA-Z0-9_-]{10,128}$/.test(id.trim());
}

/**
 * Audit field names containing sensitive KYC or financial banking PII.
 */
export const SENSITIVE_AUDIT_FIELDS = new Set([
  'panNumber',
  'govIdNumber',
  'bankDetails',
  'accountNumber',
  'ifscCode',
  'upiId',
  'rawPayload',
  'password',
  'passwordHash',
  'currentPassword',
  'newPassword',
]);

const PBKDF2_ITERATIONS = 100000;
const PBKDF2_HASH_ALGO = 'SHA-256';
const PBKDF2_KEY_BITS = 256;

const getWebCrypto = (): Crypto => {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
    return globalThis.crypto;
  }
  throw new Error('Secure Web Crypto API is unavailable in this runtime.');
};

const bytesToHex = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

const hexToBytes = (hex: string): Uint8Array => {
  if (hex.length % 2 !== 0) throw new Error('Invalid hex input');
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
};

const constantTimeEqual = (a: Uint8Array, b: Uint8Array): boolean => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
};

/**
 * Hashes a user password with a unique 16-byte random salt using PBKDF2-SHA256.
 * Never returns or stores plaintext passwords.
 */
export async function hashPassword(password: string): Promise<string> {
  const cryptoApi = getWebCrypto();
  const salt = new Uint8Array(16);
  cryptoApi.getRandomValues(salt);

  const enc = new TextEncoder();
  const keyMaterial = await cryptoApi.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await cryptoApi.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH_ALGO,
    },
    keyMaterial,
    PBKDF2_KEY_BITS
  );

  const derivedBytes = new Uint8Array(derivedBits);
  return `pbkdf2_sha256$${PBKDF2_ITERATIONS}$${bytesToHex(salt)}$${bytesToHex(derivedBytes)}`;
}

/**
 * Verifies a plaintext password candidate against a stored PBKDF2-SHA256 hash using constant-time comparison.
 */
export async function verifyPassword(password: string, storedHash?: string | null): Promise<boolean> {
  if (!password || !storedHash || typeof storedHash !== 'string') return false;
  const parts = storedHash.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2_sha256') return false;

  const iterations = Number(parts[1]);
  if (!Number.isFinite(iterations) || iterations < 10000) return false;

  try {
    const cryptoApi = getWebCrypto();
    const salt = hexToBytes(parts[2]);
    const expected = hexToBytes(parts[3]);

    const enc = new TextEncoder();
    const keyMaterial = await cryptoApi.subtle.importKey(
      'raw',
      enc.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const derivedBits = await cryptoApi.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt as unknown as BufferSource,
        iterations,
        hash: PBKDF2_HASH_ALGO,
      },
      keyMaterial,
      expected.length * 8
    );

    return constantTimeEqual(new Uint8Array(derivedBits), expected);
  } catch {
    return false;
  }
}

/**
 * Generates a cryptographically strong password containing upper, lower, digit, and symbol characters.
 */
export function generateStrongPassword(length = 12): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%&*?';
  const all = upper + lower + digits + symbols;

  const cryptoApi = getWebCrypto();
  const rand = new Uint32Array(Math.max(length, 10));
  cryptoApi.getRandomValues(rand);

  const chars: string[] = [
    upper[rand[0] % upper.length],
    lower[rand[1] % lower.length],
    digits[rand[2] % digits.length],
    symbols[rand[3] % symbols.length],
  ];

  for (let i = 4; i < rand.length; i++) {
    chars.push(all[rand[i] % all.length]);
  }

  // Fisher-Yates shuffle using CSPRNG
  const shuffleRand = new Uint32Array(chars.length);
  cryptoApi.getRandomValues(shuffleRand);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = shuffleRand[i] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}

