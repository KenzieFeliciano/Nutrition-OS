async function parseResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed with ${response.status}`);
  }

  return data;
}

export async function askSol({ messages, context, assistantName }) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, context, assistantName }),
  });

  return parseResponse(response);
}

export async function parseMealText(text) {
  const response = await fetch('/api/parse-meal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  return parseResponse(response);
}

export async function analyzeMealPhoto(imageDataUrl) {
  const response = await fetch('/api/analyze-photo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageDataUrl, capturedAt: new Date().toISOString() }),
  });

  return parseResponse(response);
}

// USDA lookups are idempotent GETs and the upstream is flaky, so retry
// server errors once before surfacing them.
async function fetchJsonWithRetry(url, retries = 1) {
  const response = await fetch(url);

  if (response.status >= 500 && retries > 0) {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    return fetchJsonWithRetry(url, retries - 1);
  }

  return parseResponse(response);
}

export async function searchFdcFoods(query) {
  const params = new URLSearchParams({ query });
  return fetchJsonWithRetry(`/api/fdc/search?${params.toString()}`);
}

export async function getFdcFood(fdcId) {
  const params = new URLSearchParams({ fdcId: String(fdcId) });
  return fetchJsonWithRetry(`/api/fdc/food?${params.toString()}`);
}
