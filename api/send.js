const { wrap, redis } = require('./_lib');
const { sendToAgent } = require('./_agent');
module.exports = wrap(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST uniquement' });
  const { agentId, message, newTask, refs, via, dedup } = req.body || {};
  if (!agentId || !message) return res.status(400).json({ error: 'agentId et message requis' });
  // Évite qu'une même délégation du Superviseur soit exécutée deux fois (et consomme des crédits en double).
  if (dedup) {
    const ok = await redis('SET', 'hub:dd:' + dedup, '1', 'NX', 'EX', '604800');
    if (!ok) return res.json({ skipped: true });
  }
  res.json(await sendToAgent(agentId, message, { newTask: !!newTask, refs: Array.isArray(refs) ? refs : [], via: via || 'user' }));
});
