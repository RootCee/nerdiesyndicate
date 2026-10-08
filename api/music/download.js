const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const archiver = require('archiver');
const { ALBUM_PRODUCT_KEY } = require('./product');

function verifyToken(token, secret) {
  try {
    const [encoded, signature] = token.split('.');
    if (!encoded || !signature) return null;

    const expected = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
    const expectedBuffer = Buffer.from(expected);
    const signatureBuffer = Buffer.from(signature);
    if (
      expectedBuffer.length !== signatureBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
    ) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (
      !payload.exp ||
      payload.exp < Date.now() ||
      payload.product !== ALBUM_PRODUCT_KEY ||
      typeof payload.sessionId !== 'string'
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = req.query.token;
  if (!token) {
    return res.status(400).json({ error: 'Missing token' });
  }

  const secret = process.env.DOWNLOAD_TOKEN_SECRET || process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return res.status(500).json({ error: 'Music downloads are not configured.' });
  }

  const payload = verifyToken(token, secret);
  if (!payload) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }

  const albumDir = path.join(process.cwd(), 'public', 'music', 'blaq');
  if (!fs.existsSync(albumDir)) {
    return res.status(500).json({ error: 'Album files not found' });
  }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="blaq-digital-album.zip"');
  res.setHeader('Cache-Control', 'private, no-store');

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (error) => {
    res.status(500).end(error.message);
  });

  archive.pipe(res);
  archive.directory(albumDir, false);
  await archive.finalize();
};
