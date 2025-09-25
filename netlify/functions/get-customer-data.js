const admin = require('firebase-admin');

// Initialize Firebase Admin SDK if it hasn't been already
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });
}

const db = admin.firestore();

exports.handler = async (event) => {
  // Get the customer's Stripe ID from the URL query parameter (e.g., ?id=cus_xxxx)
  const { customerId } = event.queryStringParameters;

  if (!customerId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Customer ID is required.' }),
    };
  }

  try {
    // Fetch the customer document directly by its ID
    const customerRef = db.collection('customers').doc(customerId);
    const doc = await customerRef.get();

    if (!doc.exists) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Customer not found.' }),
      };
    }

    // Return the customer's data
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc.data()),
    };
  } catch (error) {
    console.error('Error fetching customer data:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'An internal error occurred.' }),
    };
  }
};