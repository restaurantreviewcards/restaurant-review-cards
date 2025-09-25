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
    const snapshot = await signupsRef.where('googlePlaceId', '==', placeId).where('email', '==', email).limit(1).get();

    if (snapshot.empty) {
      throw new Error('No matching signup found for the provided details.');
    }

    const signupData = snapshot.docs[0].data();
    
    // --- ALL STRIPE CODE HAS BEEN REMOVED ---

    // We only return the business name and a constructed shipping address.
    return {
      statusCode: 200,
      body: JSON.stringify({
        businessName: signupData.googlePlaceName || 'N/A',
        // NOTE: You'll need to make sure your 'signups' collection has address fields.
        // I'm using placeholder names here like 'googleAddressLine1'.
        shippingAddress: {
            line1:       signupData.googleAddressLine1 || '123 Example St',
            city:        signupData.googleAddressCity  || 'Anytown',
            state:       signupData.googleAddressState || 'CA',
            postal_code: signupData.googleAddressZip   || '12345',
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