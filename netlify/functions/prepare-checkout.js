// In: netlify/functions/prepare-checkout.js
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
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { placeId, email } = JSON.parse(event.body);

    if (!placeId || !email) {
      return { statusCode: 400, body: 'Missing placeId or email.' };
    }

    const signupsRef = db.collection('signups');
    // This query is the critical step. It must find exactly one document.
    const snapshot = await signupsRef.where('googlePlaceId', '==', placeId).where('email', '==', email).limit(1).get();

    if (snapshot.empty) {
      // If the log shows this error, it means the placeId/email combo was not found.
      throw new Error('No matching signup found for the provided details.');
    }

    const signupData = snapshot.docs[0].data();
    
    // We only return the business name and shipping address.
    return {
      statusCode: 200,
      body: JSON.stringify({
        businessName: signupData.googlePlaceName || 'N/A',
        shippingAddress: {
          line1:       signupData.googleAddressLine1 || 'Address Line 1 Missing',
          city:        signupData.googleAddressCity  || 'City Missing',
          state:       signupData.googleAddressState || 'State Missing',
          postal_code: signupData.googleAddressZip   || 'ZIP Missing',
        }
      }),
    };

  } catch (error) {
    console.error('Error preparing checkout:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};