// In: netlify/functions/get-session-details.js

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  // Get the Checkout Session ID from the URL query parameter
  const { session_id } = event.queryStringParameters;

  if (!session_id) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing session_id' }),
    };
  }

  try {
    // Use the Stripe SDK to retrieve the session object
    const session = await stripe.checkout.sessions.retrieve(session_id);

    // Securely return the customer ID from the session
    return {
      statusCode: 200,
      body: JSON.stringify({ customerId: session.customer }),
    };
  } catch (error) {
    console.error('Error retrieving Stripe session:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Could not retrieve session details.' }),
    };
  }
};
