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

// Helper function to parse Google's address components array
function parseAddressComponents(components) {
  const address = {};
  components.forEach(component => {
    const types = component.types;
    if (types.includes('street_number')) address.streetNumber = component.long_name;
    if (types.includes('route')) address.streetName = component.long_name;
    if (types.includes('locality')) address.city = component.long_name;
    if (types.includes('administrative_area_level_1')) address.state = component.short_name;
    if (types.includes('postal_code')) address.zip = component.long_name;
  });
  return {
    line1: `${address.streetNumber || ''} ${address.streetName || ''}`.trim(),
    city: address.city || '',
    state: address.state || '',
    zip: address.zip || '',
  };
}

exports.handler = async (event) => {
  const formData = new URLSearchParams(event.body);
  const placeId = formData.get('place_id');
  const email = formData.get('email');
  const submittedName = formData.get('restaurant-name');

  if (!placeId || !email || !googleApiKey) {
    // ... error handling
    return { statusCode: 400, body: 'Missing required information.' };
  }

  try {
    // UPDATED: Added 'address_components' to the fields we request from Google
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,user_ratings_total,url,address_components&key=${googleApiKey}`;
    
    const detailsResponse = await fetch(detailsUrl);
    const placeData = await detailsResponse.json();

    if (!placeData.result) {
      throw new Error('Could not retrieve restaurant details from Google.');
    }
    
    const { name, rating, user_ratings_total, url, address_components } = placeData.result;
    
    // UPDATED: Parse the address components into a usable format
    const parsedAddress = parseAddressComponents(address_components);

    // UPDATED: Save the new address fields to your 'signups' collection in Firestore.
    await db.collection('signups').add({
      email: email,
      submittedName: submittedName,
      googlePlaceId: placeId,
      googlePlaceName: name || 'N/A',
      googleRating: rating || 'N/A',
      googleReviewCount: user_ratings_total || 0,
      googleMapsUrl: url || 'N/A',
      // New address fields
      googleAddressLine1: parsedAddress.line1,
      googleAddressCity: parsedAddress.city,
      googleAddressState: parsedAddress.state,
      googleAddressZip: parsedAddress.zip,
      timestamp: new Date(),
    });

    const redirectUrl = `/sample.html?name=${encodeURIComponent(name)}&rating=${rating}&reviews=${user_ratings_total}&placeid=${placeId}&email=${encodeURIComponent(email)}`;

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