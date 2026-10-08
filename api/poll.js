const { wrap, manus, loadRt, setJ } = require('./_lib');
module.exports = wrap(async (req, res) => {
  const { taskId, agentId } = req.query;
  if (!taskId) return res.status(400).json({ error: 'taskId requis' });
  let msgs = [], cursor;
  for (let p = 0; p < 3; p++) {
    const j = await manus('/v2/task.listMessages', { query: { task_id: taskId, order: 'asc', limit: 200, cursor } });
    msgs = msgs.concat(j.messages || []);
    if (!j.has_more) break;
    cursor = j.next_cursor;
  }
  const last = [...msgs].reverse().find((e) => e.type === 'status_update');
  const su = last && last.status_update;
  let status = su ? su.agent_status : 'running';
  if (status === 'stopped') {
    // Manus conseille de vérifier les tâches de fond avant de considérer le travail terminé.
    try {
      const d = await manus('/v2/task.detail', { query: { task_id: taskId } });
      const o = d.task || d;
      if (o.has_running_background_jobs === true) status = 'running';
    } catch (e) { /* inconnu : on garde "stopped" */ }
  }
  const sd = su && su.status_detail;
  const waiting = status === 'waiting' && sd ? { type: sd.waiting_for_event_type, eventId: sd.waiting_for_event_id, desc: sd.waiting_description } : null;
  const messages = msgs.filter((e) => ['assistant_message', 'error_message', 'user_message'].includes(e.type)).map((e) => {
    if (e.type === 'user_message') return { id: e.id, role: 'me', text: e.user_message.content || '' };
    if (e.type === 'error_message') return { id: e.id, role: 'error', text: (e.error_message && e.error_message.content) || 'Erreur' };
    const a = e.assistant_message;
    return {
      id: e.id, role: 'ai', text: a.content || '', kind: a.delivery_kind || null,
      att: (a.attachments || []).map((x) => ({ name: x.filename, url: x.url })),
      options: (a.question_expectation && a.question_expectation.options) || null,
    };
  });
  if (agentId) {
    const rt = await loadRt();
    const s = status === 'stopped' || status === 'error' ? 'idle' : status;
    if (rt.status[agentId] !== s) { rt.status[agentId] = s; await setJ('hub:rt', rt); }
  }
  res.json({ status, waiting, messages });
});
