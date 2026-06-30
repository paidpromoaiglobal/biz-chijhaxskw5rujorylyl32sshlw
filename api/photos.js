const https = require('https');
const PLACE_ID = 'ChIJHaXSKW5RUjoRYLyL32SSHLw';

// Follow ONE redirect (Google Places Photo API returns 302 → lh3.googleusercontent.com)
// Node's built-in https.get does NOT auto-follow redirects, giving us the Location header.
function getRedirectUrl(url) {
  return new Promise(resolve => {
    const req = https.get(url, res => {
      const loc = res.headers.location;
      res.resume();
      resolve(loc || null);
    });
    req.on('error', () => resolve(null));
    req.setTimeout(8000, () => { req.destroy(); resolve(null); });
  });
}

module.exports = async function handler(req, res) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return res.status(500).json({ error: 'API key not configured' });

  // 1. Fetch photo references from Place Details
  let refs;
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json` +
      `?place_id=${PLACE_ID}&fields=photos&key=${key}`;
    const data = await (await fetch(url)).json();
    if (data.status !== 'OK') return res.status(502).json({ error: data.status });
    refs = (data.result.photos || []).slice(0, 10).map(p => p.photo_reference);
  } catch (e) {
    return res.status(502).json({ error: String(e) });
  }

  // 2. Resolve each photo reference → final lh3.googleusercontent.com URL
  const photos = (
    await Promise.all(
      refs.map(ref =>
        getRedirectUrl(
          `https://maps.googleapis.com/maps/api/place/photo` +
          `?maxwidth=1600&photoreference=${ref}&key=${key}`
        )
      )
    )
  ).filter(Boolean);

  // Cache for 24 h on CDN, serve stale for up to 7 days while revalidating
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
  res.status(200).json({ photos });
};
