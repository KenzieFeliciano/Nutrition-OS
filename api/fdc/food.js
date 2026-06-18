import { FDC_BASE_URL, fetchFdcJson } from './_shared.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.USDA_FDC_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: 'Missing USDA_FDC_API_KEY. Add it to .env locally or Vercel Environment Variables.',
    });
  }

  const fdcId = String(req.query.fdcId || '').trim();

  if (!fdcId) {
    return res.status(400).json({ error: 'Missing fdcId parameter.' });
  }

  try {
    const { response, data } = await fetchFdcJson(`${FDC_BASE_URL}/food/${fdcId}?api_key=${apiKey}`);

    if (!data) {
      return res.status(502).json({ error: `USDA returned a non-JSON response (HTTP ${response.status}). Try again shortly.` });
    }

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || data.error || 'USDA food lookup failed.' });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to fetch USDA food.' });
  }
}
