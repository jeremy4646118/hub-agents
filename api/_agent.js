// Envoie un message à un agent : crée (ou réutilise) son projet Manus, puis crée une tâche ou envoie un message de suivi.
const crypto = require('crypto');
const { manus, getJ, setJ, loadRt } = require('./_lib');
const hash = (s) => crypto.createHash('sha1').update(s || '').digest('hex').slice(0, 10);
const ID22 = /^[A-Za-z0-9]{22}$/;

async function sendToAgent(agentId, message, { refs = [], via = 'user', newTask = false } = {}) {
  const st = await getJ('hub:state');
  const ag = st && st.agents && st.agents.find((a) => a.id === agentId);
  if (!ag) throw new Error('Agent inconnu : ' + agentId);
  const rt = await loadRt();

  // Un projet Manus par agent : ses instructions s'appliquent à toutes ses tâches.
  // Si tu modifies les instructions, un nouveau projet est créé (et une nouvelle conversation démarre).
  const instr = (ag.instruction || '').trim(), h = hash(instr);
  let pr = rt.projects[agentId], changed = false;
  if (instr && (!pr || pr.hash !== h)) {
    const p = await manus('/v2/project.create', { method: 'POST', body: { name: 'Hub · ' + ag.n, instruction: instr } });
    pr = rt.projects[agentId] = { id: p.project.id, hash: h };
    changed = true;
  }

  let text = String(message).slice(0, 12000);
  if (ag.role === 'sup') {
    const others = st.agents.filter((a) => a.id !== agentId).map((a) => '- ' + a.id + ' : ' + a.n + (a.d ? ' (' + a.d + ')' : '')).join('\n');
    text += '\n\n[Contexte du hub — ne pas recopier] Agents disponibles :\n' + others +
      '\nSi tu dois confier du travail à un ou plusieurs agents, termine ta réponse par un unique bloc au format exact :\n```delegate\n[{"agent":"id_agent","task":"consigne complète et autonome"}]\n```\nSans délégation, n\'ajoute aucun bloc.';
  }

  // Skills de l'agent + skills communs, envoyés à chaque message.
  const skills = [...new Set([...(ag.sk || []), ...(st.common || [])])];
  const msg = { content: text };
  if (skills.length) msg.enable_skills = skills;
  const r22 = refs.filter((x) => ID22.test(x || ''));
  if (r22.length) msg.task_references = r22;

  let taskId = newTask || changed ? null : rt.tasks[agentId], url;
  if (taskId) {
    await manus('/v2/task.sendMessage', { method: 'POST', body: { task_id: taskId, message: msg } });
  } else {
    const body = { message: msg };
    if (pr && instr) body.project_id = pr.id;
    const r = await manus('/v2/task.create', { method: 'POST', body });
    taskId = r.task_id; url = r.task_url;
  }
  rt.tasks[agentId] = taskId;
  rt.status[agentId] = 'running';
  await setJ('hub:rt', rt);
  await setJ('hub:task:' + taskId, { agent: agentId, via }, 2592000);
  return { taskId, url };
}
module.exports = { sendToAgent };
