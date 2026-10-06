#!/usr/bin/env node
// Production server for Google Cloud Run: serves the Vite build (dist/) and mounts the three Netlify-style
// functions at their original paths (/.netlify/functions/{plan,ask,metrics}), so the browser code is unchanged.
// The handlers are Web-standard (Request) => Response; this file only adapts Node's http objects to them.
//   npm run build && node server.mjs      (PORT defaults to 8080, as Cloud Run expects)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import plan from './netlify/functions/plan.mjs';
import ask from './netlify/functions/ask.mjs';
import metrics from './netlify/functions/metrics.mjs';

const FUNCTIONS = { plan, ask, metrics };
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist');
const PORT = Number(process.env.PORT) || 8080;
const MAX_BODY = 16 * 1024;

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json',
  '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream', '.hdr': 'application/octet-stream',
  '.ktx2': 'image/ktx2', '.wasm': 'application/wasm', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.mp4': 'video/mp4'
};

async function runFunction(handler, req, res) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) { res.writeHead(413, { 'content-type': 'application/json' }).end('{"error":"too_large"}'); return; }
    chunks.push(chunk);
  }
  const request = new Request(new URL(req.url, `http://${req.headers.host || 'localhost'}`), {
    method: req.method,
    headers: Object.entries(req.headers).flatMap(([k, v]) => (Array.isArray(v) ? v.map((x) => [k, x]) : [[k, v]])),
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks)
  });
  const response = await handler(request);
  res.writeHead(response.status, Object.fromEntries(response.headers));
  if (response.body) Readable.fromWeb(response.body).pipe(res); else res.end();
}

function serveStatic(req, res) {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = path.join(ROOT, urlPath);
  if (!file.startsWith(ROOT)) { res.writeHead(403).end('forbidden'); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { res.writeHead(404, { 'content-type': 'text/plain' }).end('not found'); return; }
  // Vite puts content-hashed bundles under /assets/*-<hash>.js|css; everything else revalidates.
  const hashed = /\/assets\/.+-[\w-]{8,}\.(js|css)$/.test(urlPath);
  res.writeHead(200, {
    'content-type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
    'cache-control': hashed ? 'public, max-age=31536000, immutable' : 'public, max-age=300'
  });
  fs.createReadStream(file).pipe(res);
}

http.createServer(async (req, res) => {
  try {
    const fn = /^\/\.netlify\/functions\/(\w+)\/?$/.exec(new URL(req.url, 'http://x').pathname)?.[1];
    if (fn) {
      if (!Object.hasOwn(FUNCTIONS, fn)) { res.writeHead(404, { 'content-type': 'application/json', 'cache-control': 'no-store' }).end('{"error":"not_found"}'); return; }
      await runFunction(FUNCTIONS[fn], req, res);
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
    serveStatic(req, res);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) res.writeHead(500).end('internal error');
  }
}).listen(PORT, '0.0.0.0', () => console.log(`yawmuk listening on :${PORT}`));
