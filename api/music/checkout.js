const Stripe = require('stripe');
const {
  ALBUM_PRODUCT_KEY,
  ALBUM_CURRENCY,
  getAlbumPriceCents,
} = require('./product');

function getOrigin(req) {
  const forwardedProto = req.headers['x-forwarded-proto'] || 'https';
  const forwardedHost = req.headers['x-forwarded-host'] || req.headers.host;
  return `${forwardedProto}://${forwardedHost}`;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'Missing STRIPE_SECRET_KEY' });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const origin = getOrigin(req);
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: ALBUM_CURRENCY,
            unit_amount: getAlbumPriceCents(),
            product_data: {
              name: 'BLAQ - Digital Album Download',
              description: 'Digital album purchase for BLAQ by Buddie Roots',
            },
          },
        },
      ],
      success_url: `${origin}/music/thank-you?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/music/checkout-cancelled`,
      metadata: {
        product: ALBUM_PRODUCT_KEY,
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unable to create checkout session',
    });
  }
};
