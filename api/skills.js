const { wrap, manus } = require('./_lib');
module.exports = wrap(async (req, res) => {
  const j = await manus('/v2/skill.list');
  res.json({ skills: (j.data || []).map((s) => ({ id: s.id, name: s.name, description: s.description, owner: s.owner_type })) });
});
