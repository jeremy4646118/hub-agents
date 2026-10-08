// Utilitaires partagés : appels Manus, stockage Redis (Upstash), protection par mot de passe.
const crypto = require('crypto');
const MANUS = 'https://api.manus.ai';

async function manus(path, { method = 'GET', body, query } = {}) {
  const url = new URL(MANUS + path);
  for (const [k, v] of Object.entries(query || {})) if (v != null) url.searchParams.set(k, v);
  const r = await fetch(url, {
    method,
    headers: { 'x-manus-api-key': process.env.MANUS_API_KEY || '', 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.ok === false) {
    const e = new Error((j.error && j.error.message) || 'Erreur Manus (HTTP ' + r.status + ')');
    e.detail = j.error;
    throw e;
  }
  return j;
}

const RU = () => process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const RK = () => process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
async function redis(...cmd) {
  const r = await fetch(RU(), { method: 'POST', headers: { Authorization: 'Bearer ' + RK() }, body: JSON.stringify(cmd) });
  const j = await r.json();
  if (j.error) throw new Error('Stockage : ' + j.error);
  return j.result;
}
const getJ = async (k) => { const v = await redis('GET', k); return v ? JSON.parse(v) : null; };
const setJ = (k, v, ex) => (ex ? redis('SET', k, JSON.stringify(v), 'EX', String(ex)) : redis('SET', k, JSON.stringify(v)));

const same = (a, b) => {
  const x = Buffer.from(String(a || '')), y = Buffer.from(String(b || ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

// Toutes les routes (sauf le webhook) exigent le mot de passe du dashboard.
const wrap = (fn) => async (req, res) => {
  try {
    if (!process.env.DASHBOARD_PASSWORD) return res.status(500).json({ error: 'DASHBOARD_PASSWORD non défini' });
    if (!same(req.headers['x-dash-key'], process.env.DASHBOARD_PASSWORD)) return res.status(401).json({ error: 'Mot de passe incorrect' });
    await fn(req, res);
  } catch (e) {
    res.status(500).json({ error: e.message, detail: e.detail });
  }
};

// État "runtime" écrit uniquement par le serveur : tâche en cours par agent, statut, projets Manus.
const loadRt = async () => {
  const r = (await getJ('hub:rt')) || {};
  r.tasks = r.tasks || {}; r.status = r.status || {}; r.projects = r.projects || {};
  return r;
};

module.exports = { manus, redis, getJ, setJ, wrap, loadRt };
