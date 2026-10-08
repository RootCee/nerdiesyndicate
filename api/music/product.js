const ALBUM_PRODUCT_KEY = 'blaq-digital-album';
const DEFAULT_ALBUM_PRICE_CENTS = 999;
const ALBUM_CURRENCY = 'usd';

function getAlbumPriceCents() {
  const configuredPrice = Number(process.env.BLAQ_ALBUM_PRICE_CENTS || DEFAULT_ALBUM_PRICE_CENTS);
  return Number.isInteger(configuredPrice) && configuredPrice > 0
    ? configuredPrice
    : DEFAULT_ALBUM_PRICE_CENTS;
}

module.exports = {
  ALBUM_PRODUCT_KEY,
  ALBUM_CURRENCY,
  getAlbumPriceCents,
};
