// In: netlify/functions/update-signup-details.js

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
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { placeId, displayName, phoneNumber } = JSON.parse(event.body);

    if (!placeId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Place ID is required.' }) };
    }

    // Although displayName is required, phoneNumber is optional, so we don't strictly check those here.
    // The update logic will handle potentially undefined values if needed.

    // Find the most recent signup document for this placeId
    const signupsRef = db.collection('signups');
    const snapshot = await signupsRef.where('googlePlaceId', '==', placeId).orderBy('timestamp', 'desc').limit(1).get();

    if (snapshot.empty) {
      console.error(`Update Error: Signup data not found for placeId ${placeId}.`);
      return { statusCode: 404, body: JSON.stringify({ error: 'Signup record not found.' }) };
    }

    const signupDocRef = snapshot.docs[0].ref;

    // Prepare data for update - only include fields if they exist
    const updateData = {};
    if (displayName !== undefined && displayName !== null) {
        // Use the provided displayName, falling back slightly differently than client-side if needed
        updateData.customDisplayName = displayName.trim() || signupData.googlePlaceName || ''; // Save custom name
    }
     if (phoneNumber !== undefined && phoneNumber !== null) {
        updateData.customPhoneNumber = phoneNumber.trim(); // Save custom phone
     }

    // Perform the update only if there's something to update
    if (Object.keys(updateData).length > 0) {
        await signupDocRef.update(updateData);
        console.log(`Successfully updated signup details for placeId ${placeId}.`);
    } else {
        console.log(`No details provided to update for placeId ${placeId}.`);
    }


    return { statusCode: 200, body: JSON.stringify({ message: 'Signup details updated successfully.' }) };

  } catch (error) {
    console.error('Error updating signup details:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to update signup details.' }) };
  }
};