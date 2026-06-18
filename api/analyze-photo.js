// The raw Responses API has no top-level output_text (that is an SDK-only
// convenience field); the text lives in output[].content[] parts.
function extractOutputText(data) {
  if (typeof data.output_text === 'string' && data.output_text) {
    return data.output_text;
  }

  return (data.output || [])
    .filter((item) => item.type === 'message')
    .flatMap((item) => item.content || [])
    .filter((part) => part.type === 'output_text')
    .map((part) => part.text)
    .join('');
}

function parseJsonFromText(text) {
  const trimmed = text.trim();

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

  const { imageDataUrl, capturedAt } = req.body ?? {};

  if (!imageDataUrl || typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:image/')) {
    return res.status(400).json({ error: 'Expected imageDataUrl as a data:image URL.' });
  }

  const prompt = [
    'Analyze this meal photo for a nutrition logging app.',
    'Return only strict JSON with this shape:',
    '{"foods":[{"name":"string","quantity":number,"unit":"g|oz|cup|piece|serving","estimatedGrams":number,"prepStyle":"string","usdaSearchQuery":"string","confidence":0.0}],"mealSummary":"string","timingNotes":["string"],"uncertainty":["string"]}',
    'Prefer concrete foods and plain USDA-friendly search queries.',
    'If portion size is uncertain, estimate grams conservatively and mention uncertainty.',
    'Do not provide medical advice.',
    capturedAt ? `Photo timestamp: ${capturedAt}` : '',
  ].join('\n');

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_VISION_MODEL || 'gpt-5.5',
        input: [
          {
            role: 'user',
            content: [
              { type: 'input_text', text: prompt },
              { type: 'input_image', image_url: imageDataUrl, detail: 'high' },
            ],
          },
        ],
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
      return res.status(response.status).json({
        error: data.error?.message || 'OpenAI photo analysis failed.',
      });
    }

    const outputText = extractOutputText(data);

    if (!outputText) {
      return res.status(502).json({
        error: `The model returned no text (status: ${data.status || 'unknown'}${
          data.incomplete_details?.reason ? `, reason: ${data.incomplete_details.reason}` : ''
        }).`,
      });
    }

    const parsed = parseJsonFromText(outputText);

    return res.status(200).json({
      foods: Array.isArray(parsed.foods) ? parsed.foods : [],
      mealSummary: parsed.mealSummary || 'Meal photo analyzed',
      timingNotes: Array.isArray(parsed.timingNotes) ? parsed.timingNotes : [],
      uncertainty: Array.isArray(parsed.uncertainty) ? parsed.uncertainty : [],
      model: data.model,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to analyze photo.' });
  }
}
