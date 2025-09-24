// In: netlify/functions/updateDailyReviews.js

const admin = require('firebase-admin');
const fetch = require('node-fetch');

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
const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;

// This is the function Netlify will run on a schedule
exports.handler = async () => {
  console.log('Starting daily review count update job...');
  const customersRef = db.collection('customers');
  const snapshot = await customersRef.where('subscriptionStatus', '==', 'active').get();

  if (snapshot.empty) {
    console.log('No active customers found.');
    return { statusCode: 200, body: 'No active customers to update.' };
  }

  let successCount = 0;
  let errorCount = 0;

  // Loop through each customer to update their count
  for (const doc of snapshot.docs) {
    const customer = doc.data();
    const placeId = customer.googlePlaceId;

    if (!placeId) {
      console.error(`Customer ${doc.id} is missing a placeId.`);
      errorCount++;
      continue;
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=user_ratings_total&key=${googleApiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.result) {
        const currentReviewCount = data.result.user_ratings_total || customer.googleReviewCountCurrent; // Fallback to old count on error
        
        // Update the document in Firestore
        await doc.ref.update({ googleReviewCountCurrent: currentReviewCount });
        successCount++;
      } else {
        throw new Error(`Google API Error for placeId ${placeId}: ${data.status}`);
      }
    } catch (error) {
      console.error(`Failed to update customer ${doc.id}:`, error);
      errorCount++;
    }
  }

  const summary = `Daily review update complete. Success: ${successCount}, Failed: ${errorCount}.`;
  console.log(summary);
  return { statusCode: 200, body: summary };
};