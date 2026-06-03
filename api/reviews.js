const PLACE_ID = 'ChIJHaXSKW5RUjoRYLyL32SSHLw';

export default async function handler(req, res) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return res.status(500).json({ error: 'API key not configured' });

  const url = `https://maps.googleapis.com/maps/api/place/details/json` +
    `?place_id=${PLACE_ID}` +
    `&fields=rating,user_ratings_total,reviews` +
    `&reviews_sort=newest` +
    `&key=${key}`;

  const resp = await fetch(url);
  const data = await resp.json();

  if (data.status !== 'OK') {
    return res.status(502).json({ error: data.status });
  }

  const r = data.result;

  // Cache 1 hour on CDN edge, serve stale up to 24 h while revalidating
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  res.status(200).json({
    rating: r.rating,
    total: r.user_ratings_total,
    reviews: (r.reviews || []).map(rv => ({
      author: rv.author_name,
      rating: rv.rating,
      text: rv.text,
      time: rv.relative_time_description,
    })),
  });
}
