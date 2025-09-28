// In: netlify/functions/update-shipping-address.js

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
        const { placeId, address } = JSON.parse(event.body);

        if (!placeId || !address) {
            return { statusCode: 400, body: 'Missing placeId or address.' };
        }
        
        const signupsRef = db.collection('signups');
        const snapshot = await signupsRef.where('googlePlaceId', '==', placeId).orderBy('timestamp', 'desc').limit(1).get();

        if (snapshot.empty) {
            return { statusCode: 404, body: 'Signup record not found.' };
        }

        const signupDocRef = snapshot.docs[0].ref;
        
        // Update the document with the new address, including the name
        await signupDocRef.update({
            shippingRecipientName: address.name,
            googleAddressLine1: address.line1,
            googleAddressCity: address.city,
            googleAddressState: address.state,
            googleAddressZip: address.zip,
        });

        return { statusCode: 200, body: JSON.stringify({ success: true }) };

    } catch (error) {
        console.error("Error updating shipping address:", error);
        return { statusCode: 500, body: "Internal Server Error" };
    }
};