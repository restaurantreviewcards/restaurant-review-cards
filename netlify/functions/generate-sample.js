// In: netlify/functions/generate-sample.js

const admin = require('firebase-admin');
const fetch = require('node-fetch');

// This block initializes the Firebase Admin SDK
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

exports.handler = async (event) => {
  const formData = new URLSearchParams(event.body);
  const placeId = formData.get('place_id');
  const email = formData.get('email');
  const submittedName = formData.get('restaurant-name');

  if (!placeId || !email || !googleApiKey) {
    console.error('Missing form data or API key.');
    return {
      statusCode: 400,
      body: 'Missing required information. Please try again.',
    };
  }

  try {
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,user_ratings_total,url&key=${googleApiKey}`;
    const detailsResponse = await fetch(detailsUrl);
    const placeData = await detailsResponse.json();

    if (!placeData.result) {
      throw new Error('Could not retrieve restaurant details from Google.');
    }
    const { name, rating, user_ratings_total, url } = placeData.result;

    // Save the lead data to your 'signups' collection in Firestore.
    await db.collection('signups').add({
      email: email,
      submittedName: submittedName,
      googlePlaceId: placeId,
      googlePlaceName: name || 'N/A',
      googleRating: rating || 'N/A',
      googleReviewCount: user_ratings_total || 0,
      googleMapsUrl: url || 'N/A',
      timestamp: new Date(),
    });

    // THIS IS THE UPDATED LINE: We add the email to the URL so the sample page
    // has it ready for the Stripe checkout process.
    const redirectUrl = `/sample.html?name=${encodeURIComponent(name)}&rating=${rating}&reviews=${user_ratings_total}&placeid=${placeId}&email=${encodeURIComponent(email)}`;

    // Send the user to their personalized sample page.
    return {
      statusCode: 302,
      headers: {
        'Location': redirectUrl,
      },
    };

  } catch (error) {
    console.error('Error in generate-sample function:', error);
    return {
      statusCode: 500,
      body: `An unexpected error occurred. Please try again later.`,
    };
  }
};