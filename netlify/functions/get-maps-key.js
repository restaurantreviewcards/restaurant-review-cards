// In: netlify/functions/get-maps-key.js

exports.handler = async () => {
  // This line securely accesses the environment variable on Netlify's server.
  const apiKey = process.env.PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Google Maps API key is not configured on the server." }),
    };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: apiKey }),
  };
};
