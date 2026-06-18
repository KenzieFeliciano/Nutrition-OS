const MAX_TURNS = 12;
const MAX_CONTENT_LENGTH = 2000;

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

  const { messages, context, assistantName } = req.body ?? {};

  if (!Array.isArray(messages) || !messages.length) {
    return res.status(400).json({ error: 'Expected a non-empty messages array.' });
  }

  const turns = messages
    .slice(-MAX_TURNS)
    .filter((message) => ['user', 'assistant'].includes(message?.role) && typeof message?.content === 'string')
    .map((message) => ({ role: message.role, content: message.content.slice(0, MAX_CONTENT_LENGTH) }));

  if (!turns.length || turns.at(-1).role !== 'user') {
    return res.status(400).json({ error: 'The last message must be from the user.' });
  }

  const name = typeof assistantName === 'string' && assistantName.trim() ? assistantName.trim().slice(0, 40) : 'Sol';
  const systemPrompt = [
    `You are ${name}, the living voice of Nutrient OS — a personal wellness dashboard.`,
    'Personality: warm, calm, precise, quietly confident. Feminine and minimal — think a serene, futuristic wellness guide.',
    'Keep replies short: 1-4 sentences, plain text, no markdown formatting, no lists unless asked.',
    'Ground answers in the live nutrient context below when relevant. Be concrete: name foods, amounts, and timing.',
    'You estimate from logged meals only. Never diagnose; for medical concerns, gently suggest a professional.',
    '',
    'Live dashboard context:',
    typeof context === 'string' ? context.slice(0, 3000) : 'No context provided.',
  ].join('\n');

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-5.5',
        messages: [{ role: 'system', content: systemPrompt }, ...turns],
        max_completion_tokens: 400,
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
      return res.status(response.status).json({ error: data.error?.message || 'Chat request failed.' });
    }

    const reply = data.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return res.status(502).json({ error: 'The model returned an empty reply.' });
    }

    return res.status(200).json({ reply, model: data.model });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to reach the assistant.' });
  }
}
