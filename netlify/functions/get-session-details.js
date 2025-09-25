// In: netlify/functions/get-session-details.js

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const { session_id } = event.queryStringParameters;

  if (!session_id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing session_id.' }) };
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    
    // THE FIX: Retrieve the client_reference_id, which contains our placeId.
    const placeId = session.client_reference_id;

    if (!placeId) {
        throw new Error('client_reference_id (placeId) not found in session.');
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ placeId: placeId }), // Return the placeId
    };

  } catch (error) {
    console.error(`Error retrieving session from Stripe: ${error.message}`);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to retrieve session data.' }),
    };
  }
};

