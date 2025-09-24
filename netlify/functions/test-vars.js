// In: netlify/functions/test-vars.js
exports.handler = async () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID;

  return {
    statusCode: 200,
    body: JSON.stringify({
      secretKeyFound: !!secretKey,
      priceIdFound: !!priceId,
      priceIdValue: priceId || 'Not found',
    }),
  };
};