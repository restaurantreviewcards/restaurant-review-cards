// In: netlify/functions/create-portal-link.js

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { userId } = JSON.parse(event.body);

    if (!userId) {
      return { statusCode: 400, body: 'Missing customer User ID.' };
    }

    // This is the URL the user will be sent back to after they are done
    // managing their subscription in the portal.
    const returnUrl = 'https://restaurantreviewcards.com/dashboard.html';

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: userId,
      return_url: returnUrl,
    });

    // Return the unique portal URL to the front-end
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