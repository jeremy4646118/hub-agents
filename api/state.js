const { wrap, getJ, setJ, loadRt } = require('./_lib');
module.exports = wrap(async (req, res) => {
  if (req.method === 'PUT') {
    const s = req.body && req.body.state;
    if (!s || !Array.isArray(s.agents) || JSON.stringify(s).length > 400000) return res.status(400).json({ error: 'État invalide' });
    await setJ('hub:state', s);
    return res.json({ ok: true });
  }
  res.json({ state: await getJ('hub:state'), rt: await loadRt() });
});
