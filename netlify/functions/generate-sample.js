// In: netlify/functions/generate-sample.js

const admin = require('firebase-admin');
const fetch = require('node-fetch');
const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

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

function parseAddressComponents(components) {
  const address = {};
  if (!components) return { line1: '', city: '', state: '', zip: '' }; // Handle missing components
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
  const submittedName = formData.get('restaurant-name'); // Keep for potential fallback

  if (!placeId || !email || !googleApiKey) {
    return { statusCode: 400, body: 'Missing required information.' };
  }

  let name = submittedName; // Use submitted name as initial fallback
  let rating = 'N/A';
  let user_ratings_total = 0;
  let url = 'N/A';
  let parsedAddress = { line1: '', city: '', state: '', zip: '' };

  try {
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,user_ratings_total,url,address_components&key=${googleApiKey}`;

    const detailsResponse = await fetch(detailsUrl);
    const placeData = await detailsResponse.json();

    if (placeData.result) {
        name = placeData.result.name || name;
        rating = placeData.result.rating || 'N/A';
        user_ratings_total = placeData.result.user_ratings_total || 0;
        url = placeData.result.url || 'N/A';
        parsedAddress = parseAddressComponents(placeData.result.address_components);
    } else {
      console.warn(`Could not retrieve full restaurant details from Google for placeId: ${placeId}. Status: ${placeData.status}`);
    }

    // Save signup data
    await db.collection('signups').add({
      email: email,
      submittedName: submittedName,
      googlePlaceId: placeId,
      googlePlaceName: name,
      googleRating: rating,
      googleReviewCount: user_ratings_total,
      googleMapsUrl: url,
      googleAddressLine1: parsedAddress.line1,
      googleAddressCity: parsedAddress.city,
      googleAddressState: parsedAddress.state,
      googleAddressZip: parsedAddress.zip,
      timestamp: new Date(),
      // --- CHANGE 1: Added welcomeEmailSent flag ---
      welcomeEmailSent: false
    });

    // --- CHANGE 2: Redirect URL points to card-builder.html with basic params ---
    const redirectUrl = new URL('https://restaurantreviewcards.com/card-builder.html');
    redirectUrl.searchParams.set('placeId', placeId);
    redirectUrl.searchParams.set('email', email);
    redirectUrl.searchParams.set('googleName', name); // Pass fetched name
    redirectUrl.searchParams.set('rating', rating.toString());
    redirectUrl.searchParams.set('reviews', user_ratings_total.toString());

    // --- CHANGE 3: Customer Email (customerMsg) REMOVED ---
    // const customerMsg = { ... };

    // --- Internal Notification Email to You - Link updated ---
    const internalMsg = {
        to: 'jake@restaurantreviewcards.com',
        from: { email: 'jake@restaurantreviewcards.com', name: 'New Sample Lead' },
        subject: `🔥 New Sample Generated: ${name}`,
        html: `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #005596;">New Lead Information</h2>
                <p>A new sample has been generated. Here are the details:</p>
                <ul>
                    <li><strong>Business Name:</strong> ${name}</li>
                    <li><strong>Email Submitted:</strong> ${email}</li>
                    <li><strong>Business Address:</strong> ${parsedAddress.line1 || '(not available)'}, ${parsedAddress.city || ''}, ${parsedAddress.state || ''} ${parsedAddress.zip || ''}</li>
                    <li><strong>Current Rating:</strong> ${rating} (${user_ratings_total} reviews)</li>
                </ul>
                <a href="${redirectUrl.toString()}" style="background-color: #28a745; color: white; padding: 15px 25px; text-decoration: none; border-radius: 8px; display: inline-block; margin-top: 15px;">
                    View Their Custom Builder Page
                </a>
            </div>
        `,
    };

    // --- CHANGE 4: Send ONLY the internal email ---
    await sgMail.send(internalMsg);

    // Perform the redirect
    return {
      statusCode: 302,
      headers: {
        'Location': redirectUrl.toString(),
      },
    };

  } catch (error) {
    console.error('Error in generate-sample function:', error);

    // --- CHANGE 5: Fallback Redirect also points to card-builder.html ---
    const fallbackRedirectUrl = new URL('https://restaurantreviewcards.com/card-builder.html');
    fallbackRedirectUrl.searchParams.set('placeId', placeId); // Still need placeId
    fallbackRedirectUrl.searchParams.set('email', email);     // Still need email
    fallbackRedirectUrl.searchParams.set('googleName', submittedName); // Use submitted name
    fallbackRedirectUrl.searchParams.set('rating', 'N/A');
    fallbackRedirectUrl.searchParams.set('reviews', '0');
    fallbackRedirectUrl.searchParams.set('error', 'details_fetch_failed');

    // Attempt to send internal notification on error
    try {
      const errorMsg = {
        to: 'jake@restaurantreviewcards.com',
        from: { email: 'jake@restaurantreviewcards.com', name: 'System Error Alert' },
        subject: `⚠️ Error Generating Sample for ${submittedName || email}`,
        text: `An error occurred processing a sample generation:\nEmail: ${email}\nSubmitted Name: ${submittedName}\nPlace ID: ${placeId}\nError: ${error.message}\n\nUser was sent to fallback URL: ${fallbackRedirectUrl.toString()}`,
      };
      await sgMail.send(errorMsg);
    } catch (emailError) {
      console.error("Failed to send error notification email:", emailError);
    }

    return {
      statusCode: 302,
      headers: { 'Location': fallbackRedirectUrl.toString() },
    };
  }
};