// In: netlify/functions/get-session-details.js

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  // Get the session_id from the URL query parameter
  const { session_id } = event.queryStringParameters;

  if (!session_id) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Session ID is required.' }),
    };
  }

  try {
    // Log that we are starting the process
    console.log(`Retrieving session: ${session_id}`);

    // Retrieve the session object from Stripe, expanding the customer object
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['customer'],
    });

    // Log the retrieved customer ID
    const customerId = session.customer.id;
    console.log(`Successfully retrieved customer ID: ${customerId}`);

    // Return the customer ID to the front-end
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId: customerId }),
    };

  } catch (error) {
    // THIS IS THE CRITICAL CHANGE
    // If anything goes wrong, log the detailed error and send it back.
    console.error('Stripe session retrieval failed:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }), // Send the actual error back
    };
  }
};

