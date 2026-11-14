// NC-LIFE-02 Milestone 4: short-lived signed room passes. The City Service (issuer) signs a pass for a verified, registered
// player with an Ed25519 PRIVATE key it alone holds; the multiplayer Worker (audience) verifies it with PUBLIC keys only, so
// no shared secret lives in the Worker. Rooms trust a player's identity and roles only from a verified pass, never from
// anything a client says. Key rotation: every pass names its key (kid); the Worker accepts any configured public key that
// is not revoked. Revocation: list the kid as revoked (all its passes stop at once); passes are short-lived regardless.
// Shared by the City Service and the Worker (WebCrypto Ed25519: Workers and Node 20+). No secrets in this file.

export const ROOM_PASS_ISSUER = 'nerdie-city-service';
export const ROOM_PASS_AUDIENCE = 'nerdie-city-multiplayer';
export const ROOM_PASS_TTL_SECONDS = 600;           // ten minutes
export const ROOM_PASS_MAX_TTL_SECONDS = 900;       // a pass claiming longer is refused
export const ROOM_PASS_ROLES = Object.freeze(['resident', 'founder']);
const CLOCK_SKEW_SECONDS = 60;
const enc = new TextEncoder(), dec = new TextDecoder();
const b64url = (bytes) => btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
const fromB64url = (text) => Uint8Array.from(atob(text.replaceAll('-', '+').replaceAll('_', '/')), (c) => c.charCodeAt(0));
const json64 = (value) => b64url(enc.encode(JSON.stringify(value)));
const KID = /^[A-Za-z0-9_-]{1,32}$/;

// signingKey: an Ed25519 private JWK { kty: 'OKP', crv: 'Ed25519', d, x, kid }. claims: { sub, rid, name, roles, homes?, primary? }.
// Milestone 5: homes = the space ids the player owns or leases (from registry.player_homes, read fresh at issue), primary = one of them.
export const ROOM_PASS_MAX_HOMES = 12;
const SPACE = /^[a-z0-9][a-z0-9-]{2,63}$/;
// Milestone 5 expansion: rootsUntil = epoch seconds until which tonight's paid Roots admission holds (the City Service charged it);
// arms = the holder's authoritative weapon inventory { version, weapons: [{ weaponId, rounds }] } (registry.arms_inventory).
const ARMS_IDS = new Set(['ak', 'mac10', 'mp5', 'm700', 'rpg']);
const validArms = (arms) => arms == null || (typeof arms === 'object' && Number.isSafeInteger(arms.version) && arms.version >= 0 && Array.isArray(arms.weapons) && arms.weapons.length <= ARMS_IDS.size
  && arms.weapons.every((w) => w && ARMS_IDS.has(w.weaponId) && Number.isSafeInteger(w.rounds) && w.rounds >= 0 && w.rounds <= 500) && new Set(arms.weapons.map((w) => w.weaponId)).size === arms.weapons.length);
const validHomes = (homes, primary) => Array.isArray(homes) && homes.length <= ROOM_PASS_MAX_HOMES && homes.every((h) => typeof h === 'string' && SPACE.test(h)) && (primary == null || homes.includes(primary));
export async function signRoomPass(signingKey, claims, { now = Date.now(), ttlSeconds = ROOM_PASS_TTL_SECONDS, jti = crypto.randomUUID() } = {}) {
  if (!signingKey || signingKey.kty !== 'OKP' || signingKey.crv !== 'Ed25519' || !signingKey.d || !KID.test(signingKey.kid || '')) throw new Error('room pass signing key missing or invalid');
  const iat = Math.floor(now / 1000), header = { alg: 'EdDSA', typ: 'nc-room-pass', kid: signingKey.kid };
  const payload = { iss: ROOM_PASS_ISSUER, aud: ROOM_PASS_AUDIENCE, sub: claims.sub, rid: claims.rid, name: claims.name, roles: claims.roles, homes: claims.homes || [], primary: claims.primary ?? null, ...(claims.rootsUntil ? { rootsUntil: claims.rootsUntil } : {}), ...(claims.arms ? { arms: claims.arms } : {}), ...(claims.gang ? { gang: claims.gang } : {}), iat, exp: iat + Math.min(ttlSeconds, ROOM_PASS_MAX_TTL_SECONDS), jti };
  const key = await crypto.subtle.importKey('jwk', { kty: 'OKP', crv: 'Ed25519', d: signingKey.d, x: signingKey.x }, { name: 'Ed25519' }, false, ['sign']);
  const body = `${json64(header)}.${json64(payload)}`;
  return `${body}.${b64url(new Uint8Array(await crypto.subtle.sign({ name: 'Ed25519' }, key, enc.encode(body))))}`;
}

// publicKeys: { [kid]: { kty: 'OKP', crv: 'Ed25519', x } }; revokedKids: kids that no longer count. Returns the verified
// claims { sub, rid, name, roles, exp, kid, jti } or null for anything wrong (never throws).
export async function verifyRoomPass(token, { publicKeys = {}, revokedKids = [], now = Date.now() } = {}) {
  try {
    if (typeof token !== 'string' || token.length > 4096 || !/^[\w-]+\.[\w-]+\.[\w-]+$/.test(token)) return null;
    const [h, p, s] = token.split('.'), header = JSON.parse(dec.decode(fromB64url(h))), claims = JSON.parse(dec.decode(fromB64url(p)));
    if (header.alg !== 'EdDSA' || header.typ !== 'nc-room-pass' || !KID.test(header.kid || '') || revokedKids.includes(header.kid)) return null;
    const jwk = publicKeys[header.kid]; if (!jwk || jwk.kty !== 'OKP' || jwk.crv !== 'Ed25519' || typeof jwk.x !== 'string') return null;
    const key = await crypto.subtle.importKey('jwk', { kty: 'OKP', crv: 'Ed25519', x: jwk.x }, { name: 'Ed25519' }, false, ['verify']);
    if (!(await crypto.subtle.verify({ name: 'Ed25519' }, key, fromB64url(s), enc.encode(`${h}.${p}`)))) return null;
    const t = Math.floor(now / 1000);
    if (claims.iss !== ROOM_PASS_ISSUER || claims.aud !== ROOM_PASS_AUDIENCE) return null;
    if (!Number.isSafeInteger(claims.iat) || !Number.isSafeInteger(claims.exp) || claims.exp <= t || claims.iat > t + CLOCK_SKEW_SECONDS || claims.exp - claims.iat > ROOM_PASS_MAX_TTL_SECONDS) return null;
    if (typeof claims.sub !== 'string' || !/^ply_[a-z0-9]{8,32}$/.test(claims.sub) || !Number.isSafeInteger(claims.rid) || claims.rid < 1) return null;
    if (typeof claims.name !== 'string' || claims.name.length < 3 || claims.name.length > 24) return null;
    if (!Array.isArray(claims.roles) || !claims.roles.length || claims.roles.some((r) => !ROOM_PASS_ROLES.includes(r)) || !claims.roles.includes('resident')) return null;
    const homes = claims.homes ?? [], primary = claims.primary ?? null;
    if (!validHomes(homes, primary)) return null;
    const rootsUntil = claims.rootsUntil ?? null, arms = claims.arms ?? null;
    if (rootsUntil !== null && (!Number.isSafeInteger(rootsUntil) || rootsUntil < claims.iat || rootsUntil > claims.iat + 86_400)) return null;
    if (!validArms(arms)) return null;
    // Milestone 10: the player's street crew (verified membership; consensual gang conflict involves only crew members)
    const gang = claims.gang ?? null; if (gang !== null && !/^org_[a-f0-9]{12}$/.test(gang)) return null;
    return { gang, sub: claims.sub, rid: claims.rid, name: claims.name, roles: [...new Set(claims.roles)], homes: [...new Set(homes)], primary, rootsUntil, arms: arms ? { version: arms.version, weapons: arms.weapons.map((w) => ({ weaponId: w.weaponId, rounds: w.rounds })) } : null, exp: claims.exp, kid: header.kid, jti: String(claims.jti || '') };
  } catch { return null; }
}

// Public keys and revocations from a Worker setting: ROOM_PASS_PUBLIC_KEYS = JSON { kid: { kty, crv, x } } (public only),
// ROOM_PASS_REVOKED_KIDS = comma-separated kids. A malformed setting means no keys (passes refused), never a crash.
export function roomPassKeysFromEnv(env) {
  let publicKeys = {};
  try { const parsed = JSON.parse(env?.ROOM_PASS_PUBLIC_KEYS || '{}'); for (const [kid, k] of Object.entries(parsed)) if (KID.test(kid) && k?.kty === 'OKP' && k?.crv === 'Ed25519' && typeof k.x === 'string' && !k.d) publicKeys[kid] = { kty: 'OKP', crv: 'Ed25519', x: k.x }; } catch { publicKeys = {}; }
  const revokedKids = String(env?.ROOM_PASS_REVOKED_KIDS || '').split(',').map((k) => k.trim()).filter((k) => KID.test(k));
  return { publicKeys, revokedKids };
}
export const formatResidentNo = (n) => `R-${String(n).padStart(6, '0')}`;
