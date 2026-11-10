/* 设计稿专用：第一次打开时放一个四种状态都有的项目，直接看气泡。 */
window.addEventListener('load', async () => {
  const flag = 'huiqi-prep-v2-2-20261110-prep-design-seeded';
  try { if (localStorage.getItem(flag)) return; } catch { return; }
  const S = window.PolicyStore, wait = (ms = 80) => new Promise((resolve) => setTimeout(resolve, ms));
  const task = S.createTask({ title: '跳舞吧信息技术有限公司 · 政策申报', request: '查找适用政策并准备申报材料', company: { name: '跳舞吧信息技术有限公司', region: '', industry: '软件信息' }, intake: { stage: 'ready', answers: { industry: '软件信息', type: '股份有限公司' }, files: [] } });
  if (!task) return;
  S.confirmWork(task.id, 'profile');
  location.hash = `#task?task=${task.id}&work=match`;
  await wait(200);
  const opener = document.createElement('button');
  opener.dataset.action = 'match-drawer'; opener.dataset.task = task.id; opener.dataset.policy = 'sh-smart-grid-2026';
  document.body.append(opener); opener.click(); await wait(); opener.remove();
  document.querySelector('[data-action=interpret-apply]')?.click(); await wait(200);
  const current = S.getTask(task.id);
  const fill = { '联合申报协议': { text: '我们公司与合作单位拟联合申报,很多工作已经弄好了。', fileName: '联合申报协议.docx', type: 'document' }, '诚信承诺书': { text: '依据文件：企业介绍.docx、项目记录.docx\n一、相关内容\n本企业承诺所提交材料真实有效。\n【待补充：负责人签字页】', fileName: '诚信承诺书.doc', type: 'generated' } };
  S.updateTask(task.id, {
    sources: current.sources.map((source) => fill[source.name] ? { ...source, ...fill[source.name], provided: true } : source),
    requirements: current.requirements.map((item) => fill[item.label] ? { ...item, status: 'ready' } : item),
  });
  try { localStorage.setItem(flag, '1'); } catch {}
  window.PolicyUI.refresh();
});
