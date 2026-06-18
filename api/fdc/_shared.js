export const FDC_BASE_URL = 'https://api.nal.usda.gov/fdc/v1';

const FDC_HEADERS = { 'User-Agent': 'Mozilla/5.0 (compatible; NutrientOS/0.1)' };

async function readJson(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// Successful USDA responses are immutable food records, so cache them while
// the process is warm — this also shields against the gateway's flakiness.
const cache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000;
const CACHE_MAX = 300;

// USDA's gateway intermittently serves a bare nginx "400 Bad Request" HTML
// page instead of JSON; those requests succeed on retry.
export async function fetchFdcJson(url, attempts = 4) {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return { response: { ok: true, status: 200 }, data: cached.data };
  }

  let response;
  let data = null;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    response = await fetch(url, { headers: FDC_HEADERS });
    data = await readJson(response);
    if (data) break;
    if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 700 * attempt));
  }

  if (response.ok && data) {
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
    cache.set(url, { data, at: Date.now() });
  }

  return { response, data };
}
