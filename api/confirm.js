const { wrap, manus } = require('./_lib');
module.exports = wrap(async (req, res) => {
  const { taskId, eventId, input } = req.body || {};
  if (!taskId || !eventId) return res.status(400).json({ error: 'taskId et eventId requis' });
  res.json(await manus('/v2/task.confirmAction', { method: 'POST', body: { task_id: taskId, event_id: eventId, input: input || { accept: true } } }));
});
