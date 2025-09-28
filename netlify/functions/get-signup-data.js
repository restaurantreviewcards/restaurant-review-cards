// In: netlify/functions/get-signup-data.js

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
  const { placeId } = event.queryStringParameters;

  if (!placeId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Place ID is required.' }),
    };
  }

  try {
    const signupsRef = db.collection('signups');
    // Find the most recent signup document for this placeId
    const snapshot = await signupsRef.where('googlePlaceId', '==', placeId).orderBy('timestamp', 'desc').limit(1).get();

    if (snapshot.empty) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Signup data not found.' }),
      };
    }

    const signupData = snapshot.docs[0].data();

    // Return the timestamp from the document
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signupTimestamp: signupData.timestamp }),
    };
  } catch (error) {
    console.error('Error fetching signup data:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'An internal error occurred.' }),
    };
  }
};