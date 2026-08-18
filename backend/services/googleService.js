const Setting = require('../models/Setting');

async function getApiKey() {
  const setting = await Setting.findOne({ key: 'googlePlacesApiKey' });
  return setting?.value || '';
}

async function autocompletePlaces(query) {
  const key = await getApiKey();
  if (!key) throw new Error('Google Places API key not configured');
  const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
    },
    body: JSON.stringify({ input: query, languageCode: 'en' }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google API error (${res.status}): ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  const suggestions = data.suggestions || data.places || [];
  return suggestions.map((item) => {
    const pred = item.placePrediction || {};
    const place = item.place || {};
    return {
      placeId: pred.placeId || place.id || '',
      name: pred.text?.text || place.displayName?.text || '',
      address: pred.structuredFormat?.secondaryText?.text || place.formattedAddress || '',
    };
  }).filter((item) => item.placeId);
}

async function getPlaceDetails(placeId) {
  const key = await getApiKey();
  if (!key) throw new Error('Google Places API key not configured');
  const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=en`, {
    headers: {
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'id,displayName,formattedAddress,nationalPhoneNumber,internationalPhoneNumber,websiteUri,rating,userRatingCount,googleMapsUri',
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google API error (${res.status}): ${text.slice(0, 200)}`);
  }
  const d = await res.json();
  return {
    placeId: d.id || placeId,
    name: d.displayName?.text || '',
    address: d.formattedAddress || '',
    phone: d.nationalPhoneNumber || d.internationalPhoneNumber || '',
    website: d.websiteUri || '',
    rating: d.rating || null,
    userRatingCount: d.userRatingCount || 0,
    mapsUri: d.googleMapsUri || '',
  };
}

function reviewUrlFromPlaceId(placeId) {
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
}

module.exports = { autocompletePlaces, getPlaceDetails, reviewUrlFromPlaceId, getApiKey };