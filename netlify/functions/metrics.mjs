// POST /.netlify/functions/metrics  { arm:'ai'|'fixed', completed, pre, post, clarity }  ->  204
// Sent by the game ONLY after the player switched the consent toggle on. Anonymous by design: no ids, no IP,
// no user agent, no belief, no free text — the payload is re-normalised to exactly these five fields and logged.
import { metricsPayload } from '../../src/engine/aiCore.js';
import { readBody } from '../lib/claude.mjs';

const KEYS = ['arm', 'completed', 'pre', 'post', 'clarity'];

export default async (req) => {
  const body = await readBody(req);
  if (body instanceof Response) return body;
  if (!Object.keys(body).every((k) => KEYS.includes(k))) return new Response(null, { status: 400 });
  console.log(JSON.stringify({ yawmuk_metric: metricsPayload(body) }));
  return new Response(null, { status: 204 });
};
