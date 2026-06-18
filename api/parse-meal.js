function parseJsonFromText(text) {
  const trimmed = (text || '').trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('The model did not return JSON.');
    return JSON.parse(match[0]);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'Missing OPENAI_API_KEY. Add it to .env locally or Vercel Environment Variables.',
    });
  }

  const { text } = req.body ?? {};
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Describe what you ate.' });
  }

  const prompt = [
    'A user described a meal in plain language (possibly transcribed from speech). Break it into individual foods for a nutrition app.',
    'Return ONLY strict JSON with this shape:',
    '{"foods":[{"name":"string","quantity":number,"unit":"g|oz|cup|piece|serving","estimatedGrams":number,"prepStyle":"string","usdaSearchQuery":"string","confidence":0.0}],"mealSummary":"string","timingNotes":["string"],"uncertainty":["string"]}',
    'Make usdaSearchQuery specific and faithful to what they said — if they said "sourdough", search "sourdough bread", not "white bread". Preserve named varieties (sourdough, basmati, kefir, etc.).',
    'Estimate grams conservatively when portions are vague, and note assumptions in uncertainty. Do not give medical advice.',
    `Meal description: ${text.slice(0, 1000)}`,
  ].join('\n');

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-5.5',
        messages: [{ role: 'user', content: prompt }],
        max_completion_tokens: 700,
      }),
    });

    const rawBody = await response.text();
    let data;
    try {
      data = JSON.parse(rawBody);
    } catch {
      return res.status(502).json({ error: `OpenAI returned a non-JSON response (HTTP ${response.status}). Try again shortly.` });
    }
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Meal parsing failed.' });
    }

    const parsed = parseJsonFromText(data.choices?.[0]?.message?.content || '');
    return res.status(200).json({
      foods: Array.isArray(parsed.foods) ? parsed.foods : [],
      mealSummary: parsed.mealSummary || text.trim().slice(0, 120),
      timingNotes: Array.isArray(parsed.timingNotes) ? parsed.timingNotes : [],
      uncertainty: Array.isArray(parsed.uncertainty) ? parsed.uncertainty : [],
      model: data.model,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to parse meal.' });
  }
}
