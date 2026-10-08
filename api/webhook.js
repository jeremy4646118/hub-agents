// Reçoit les notifications Manus (task_stopped) et déclenche les liens "Auto" entre agents.
const crypto = require('crypto');
const { manus, redis, getJ, setJ, loadRt } = require('./_lib');
const { sendToAgent } = require('./_agent');

let keyCache = { k: null, t: 0 };
const readRaw = (req) => new Promise((ok, ko) => { const c = []; req.on('data', (d) => c.push(d)); req.on('end', () => ok(Buffer.concat(c))); req.on('error', ko); });
async function publicKey() {
  if (keyCache.k && Date.now() - keyCache.t < 3600e3) return keyCache.k;
  const j = await manus('/v2/webhook.publicKey');
  keyCache = { k: j.public_key, t: Date.now() };
  return keyCache.k;
}
async function verify(req, raw) {
  const sig = req.headers['x-webhook-signature'], ts = req.headers['x-webhook-timestamp'];
  if (Math.abs(Date.now() / 1000 - parseInt(ts, 10)) > 300) return false;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const url = 'https://' + host + req.url;
  const body = crypto.createHash('sha256').update(raw).digest('hex');
  const v = crypto.createVerify('RSA-SHA256');
  v.update(ts + '.' + url + '.' + body);
  return v.verify(await publicKey(), sig, 'base64');
}

async function handle(ev) {
  if (ev.event_type !== 'task_stopped') return;
  const d = ev.task_detail || {};
  const map = await getJ('hub:task:' + d.task_id);
  if (!map) return;
  // Anti-doublon : Manus peut renvoyer la même notification.
  const key = 'hub:ev:' + d.task_id + ':' + crypto.createHash('sha1').update(String(d.message || '')).digest('hex').slice(0, 12);
  if (!(await redis('SET', key, '1', 'NX', 'EX', '86400'))) return;
  const rt = await loadRt();
  rt.status[map.agent] = d.stop_reason === 'finish' ? 'idle' : 'waiting';
  await setJ('hub:rt', rt);
  // Garde-fou : une tâche créée par un lien ne déclenche jamais un autre lien.
  if (d.stop_reason !== 'finish' || map.via === 'link') return;
  const st = await getJ('hub:state');
  if (!st) return;
  const from = st.agents.find((a) => a.id === map.agent);
  if (!from) return;
  const files = (d.attachments || []).map((a) => '- ' + a.file_name + ' : ' + a.url).join('\n');
  for (const l of (st.links || []).filter((l) => l.from === map.agent && l.auto)) {
    if (!st.agents.find((a) => a.id === l.to)) continue;
    const text = 'Données reçues de l\'agent « ' + from.n + ' » (tâche terminée) :\n\n' + (d.message || '') +
      (files ? '\n\nFichiers :\n' + files : '') + '\n\nTraite ces données selon tes instructions.';
    await sendToAgent(l.to, text, { refs: [d.task_id], via: 'link', newTask: true });
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const raw = await readRaw(req);
  // Requête de test de Manus (sans signature) : on répond 200 sans rien faire.
  if (!req.headers['x-webhook-signature']) return res.status(200).send('ok');
  try { if (!(await verify(req, raw))) return res.status(401).send('Unauthorized'); } catch (e) { return res.status(401).send('Unauthorized'); }
  try { await handle(JSON.parse(raw.toString())); } catch (e) { console.error('webhook:', e.message); }
  res.status(200).send('ok');
};
module.exports.config = { api: { bodyParser: false } };
module.exports.handle = handle;
