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

  const query = String(req.query.query || '').trim();

  if (!query) {
    return res.status(400).json({ error: 'Missing query parameter.' });
  }

  const params = new URLSearchParams({
    api_key: apiKey,
    query,
    pageSize: String(Math.min(Number(req.query.pageSize || 12), 25)),
    dataType: ['Foundation', 'SR Legacy', 'Survey (FNDDS)', 'Branded'].join(','),
  });

  try {
    const { response, data } = await fetchFdcJson(`${FDC_BASE_URL}/foods/search?${params.toString()}`);

    if (!data) {
      return res.status(502).json({ error: `USDA returned a non-JSON response (HTTP ${response.status}). Try again shortly.` });
    }

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || data.error || 'USDA search failed.' });
    }

    return res.status(200).json({
      foods: (data.foods || []).map((food) => ({
        fdcId: food.fdcId,
        description: food.description,
        dataType: food.dataType,
        brandOwner: food.brandOwner,
        ingredients: food.ingredients,
      })),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to search USDA foods.' });
  }
}
