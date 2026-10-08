const Stripe = require('stripe');
const crypto = require('crypto');
const {
  ALBUM_PRODUCT_KEY,
  ALBUM_CURRENCY,
  getAlbumPriceCents,
} = require('./product');

function makeToken(sessionId, secret) {
  const payload = {
    sessionId,
    product: ALBUM_PRODUCT_KEY,
    exp: Date.now() + 1000 * 60 * 60,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sessionId = req.query.session_id;
  if (!sessionId) {
    return res.status(400).json({ error: 'Missing session_id' });
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const downloadSecret = process.env.DOWNLOAD_TOKEN_SECRET || stripeSecret;
  if (!stripeSecret || !downloadSecret) {
    return res.status(500).json({ error: 'Music checkout is not configured.' });
  }

  try {
    const stripe = new Stripe(stripeSecret);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      return res.status(403).json({ error: 'Payment not completed' });
    }

    const isIntendedAlbumPurchase =
      session.mode === 'payment' &&
      session.metadata?.product === ALBUM_PRODUCT_KEY &&
      session.currency === ALBUM_CURRENCY &&
      session.amount_total === getAlbumPriceCents();

    if (!isIntendedAlbumPurchase) {
      return res.status(403).json({ error: 'Checkout session does not match this album.' });
    }

    const token = makeToken(session.id, downloadSecret);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      ok: true,
      downloadUrl: `/api/music/download?token=${encodeURIComponent(token)}`,
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unable to verify purchase',
    });
  }
};
