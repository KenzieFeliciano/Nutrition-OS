import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import analyzePhoto from './api/analyze-photo.js';
import chat from './api/chat.js';
import parseMeal from './api/parse-meal.js';
import fdcFood from './api/fdc/food.js';
import fdcSearch from './api/fdc/search.js';

async function readJsonBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const body = Buffer.concat(chunks).toString('utf8');
  return body ? JSON.parse(body) : {};
}

function createDevResponse(res) {
  return {
    setHeader(name, value) {
      res.setHeader(name, value);
    },
    status(code) {
      res.statusCode = code;
      return this;
    },
    json(payload) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(payload));
      return this;
    },
  };
}

function localApiPlugin() {
  const apiRoutes = {
    '/api/analyze-photo': analyzePhoto,
    '/api/chat': chat,
    '/api/parse-meal': parseMeal,
    '/api/fdc/search': fdcSearch,
    '/api/fdc/food': fdcFood,
  };

  return {
    name: 'nutritionos-local-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, 'http://127.0.0.1');
        const handler = apiRoutes[url.pathname];

        if (!handler) {
          next();
          return;
        }

        try {
          req.query = Object.fromEntries(url.searchParams.entries());
          req.body = req.method === 'POST' ? await readJsonBody(req) : {};
          await handler(req, createDevResponse(res));
        } catch (error) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: error.message || 'Local API route failed.' }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  Object.entries(env).forEach(([key, value]) => {
    if (process.env[key] == null) {
      process.env[key] = value;
    }
  });

  return {
    plugins: [react(), localApiPlugin()],
    server: {
      host: '127.0.0.1',
    },
  };
});
