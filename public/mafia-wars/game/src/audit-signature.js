// NC-LIFE-02 Milestone 4/5: the multiplayer Worker delivers founder apartment-inspection records to the City Service, which stores them
// permanently. Each delivery is authenticated with HMAC-SHA-256 over "<timestamp>.<body>" using FOUNDER_AUDIT_SECRET (set by the founder
// on both services; never in files). The City Service refuses stale timestamps (five minutes) and stores each event once.
const enc = new TextEncoder();
const hex = (bytes) => Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
export const AUDIT_MAX_SKEW_MS = 300_000;
export async function signAudit(secret, timestamp, body) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(`${timestamp}.${body}`)));
}
export async function verifyAudit(secret, timestamp, body, mac, now = Date.now()) {
  if (!secret || secret.length < 32 || typeof mac !== 'string' || !/^[0-9a-f]{64}$/.test(mac) || !/^\d{13}$/.test(String(timestamp))) return false;
  if (Math.abs(now - Number(timestamp)) > AUDIT_MAX_SKEW_MS) return false;
  const expected = await signAudit(secret, timestamp, body);
  let diff = 0; for (let i = 0; i < 64; i++) diff |= expected.charCodeAt(i) ^ mac.charCodeAt(i);
  return diff === 0;
}
