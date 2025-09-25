// In: netlify/functions/get-customer-data.js

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
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
  // THE FIX: The URL parameter is now 'placeId'
  const { placeId } = event.queryStringParameters;

  if (!placeId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Place ID is required.' }),
    };
  }

  try {
    // THE FIX: Query the collection to find the customer with the matching placeId.
    const customersRef = db.collection('customers');
    const snapshot = await customersRef.where('googlePlaceId', '==', placeId).limit(1).get();

    if (snapshot.empty) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Customer not found for this Place ID.' }),
      };
    }

    const customerDoc = snapshot.docs[0];

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customerDoc.data()),
    };
  } catch (error) {
    console.error('Error fetching customer data:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'An internal error occurred.' }),
    };
  }
};
