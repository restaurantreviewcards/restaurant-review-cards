// In: netlify/functions/get-stripe-key.js

exports.handler = async () => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      publishableKey: process.env.PUBLIC_STRIPE_PUBLISHABLE_KEY,
    }),
  };
};