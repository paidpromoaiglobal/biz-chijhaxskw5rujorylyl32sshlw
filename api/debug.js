module.exports = function handler(req, res) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  res.status(200).json({
    key_present: !!key,
    key_length: key ? key.length : 0,
    key_prefix: key ? key.slice(0, 6) + '...' : null,
    node_env: process.env.NODE_ENV,
  });
};
