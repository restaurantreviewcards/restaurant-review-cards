// In: netlify/functions/get-stripe-key.js

exports.handler = async () => {
  const publishableKey = process.env.PUBLIC_STRIPE_PUBLISHABLE_KEY;

  if (!publishableKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Stripe publishable key is not configured." }),
    };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ publishableKey: publishableKey }),
  };
};