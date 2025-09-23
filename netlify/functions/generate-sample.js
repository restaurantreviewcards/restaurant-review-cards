const admin = require('firebase-admin');
const fetch = require('node-fetch');

// This block initializes the Firebase Admin SDK using the secure environment
// variables you set in the Netlify UI. It only runs once.
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

// This is the main function that runs when your index.html form is submitted.
exports.handler = async (event) => {
  // 1. Parse the incoming form data from the request.
  const formData = new URLSearchParams(event.body);
  const placeId = formData.get('place_id');
  const email = formData.get('email');
  const submittedName = formData.get('restaurant-name'); // It's still useful to store what the user originally typed.

  // 2. Validate that we have the necessary data to proceed.
  if (!placeId || !email || !googleApiKey) {
    console.error('Missing form data or API key.');
    return {
      statusCode: 400,
      body: 'Missing required information. Please try again.',
    };
  }

  try {
    // 3. With the Place ID, we skip the search and go straight to getting details.
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,user_ratings_total,url&key=${googleApiKey}`;
    const detailsResponse = await fetch(detailsUrl);
    const placeData = await detailsResponse.json();

    if (!placeData.result) {
      throw new Error('Could not retrieve restaurant details from Google.');
    }
    const { name, rating, user_ratings_total, url } = placeData.result;

    // 4. Save the complete signup data to your Firestore database.
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

    // 5. Build the redirect URL for the sample.html page with the live data.
    const redirectUrl = `/sample.html?name=${encodeURIComponent(name)}&rating=${rating}&reviews=${user_ratings_total}`;

    // 6. Send the user to their personalized sample page.
    return {
      statusCode: 302, // 302 is the standard HTTP code for a redirect.
      headers: {
        'Location': redirectUrl,
      },
    };

  } catch (error) {
    console.error('Error in generate-sample function:', error);
    // Provide a generic error message to the user for security.
    return {
      statusCode: 500,
      body: `An unexpected error occurred. Please try again later.`,
    };
  }
};