const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const archiver = require('archiver');

function verifyToken(token) {
  const secret = process.env.DOWNLOAD_TOKEN_SECRET || process.env.STRIPE_SECRET_KEY;
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return null;

  const expected = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  if (expected !== signature) return null;

  const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  if (!payload.exp || payload.exp < Date.now()) return null;
  return payload;
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

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }

  const albumDir = path.join(process.cwd(), 'public', 'music', 'blaq');
  if (!fs.existsSync(albumDir)) {
    return res.status(500).json({ error: 'Album files not found' });
  }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="blaq-digital-album.zip"');

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (error) => {
    res.status(500).end(error.message);
  });

  archive.pipe(res);
  archive.directory(albumDir, false);
  await archive.finalize();
};
