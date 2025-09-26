// In: netlify/functions/create-portal-link.js

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { userId, placeId } = JSON.parse(event.body); // Now receiving placeId

    if (!userId || !placeId) {
      return { statusCode: 400, body: 'Missing required IDs.' };
    }

    // This is the dynamic URL that sends the user back to their specific dashboard
    const returnUrl = `https://restaurantreviewcards.com/dashboard.html?placeId=${placeId}`;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: userId,
      return_url: returnUrl,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ portalUrl: portalSession.url }),
    };

  } catch (error) {
    console.error('Stripe Portal Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to create portal session.' }),
    };
  }
};