/* 申报材料：按已有资料组稿，保留版本和来源快照。 */
(() => {
  'use strict';

  const drafts = new Map();
  const defaultSections = [
    { id: 'company', title: '企业概况' },
    { id: 'research', title: '研发基础' },
    { id: 'statement', title: '申报说明' },
    { id: 'attachments', title: '附件清单' },
  ];
  const positiveStatuses = new Set(['met', 'ready', 'provided', 'complete', 'completed', 'satisfied', 'confirmed', 'fulfilled', 'passed']);
  const E = (value = '') => window.PolicyUI?.escape ? window.PolicyUI.escape(String(value)) : String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const ui = () => window.PolicyUI;
  const store = () => window.PolicyStore;
  const state = () => store()?.getState() || {};
  const taskById = (id) => store()?.getTask(id);
  const asArray = (value) => Array.isArray(value) ? value : value && typeof value === 'object' ? Object.values(value) : [];
  const allTasks = () => asArray(state().tasks);
  const allVersions = () => asArray(state().versions);
  const versionById = (id) => allVersions().find((version) => version.id === id);
  const versionsFor = (id) => allVersions().filter((version) => version.taskId === id);
  const policyFor = (task) => asArray(window.PolicyData?.policies).find((policy) => policy.id === task?.policyId);
  const companyName = (task) => typeof task?.company === 'string' ? task.company : task?.company?.name || task?.company?.companyName || '未命名企业';
  const sourceProvided = (source) => source?.provided === true || positiveStatuses.has(source?.status);
  const sectionList = (version) => asArray(version?.sections || version?.content?.sections);
  const versionLabel = (version) => {
    const value = version?.number ?? version?.versionNumber ?? version?.version ?? (versionsFor(version?.taskId).findIndex((item) => item.id === version?.id) + 1);
    return /^v/i.test(String(value)) ? String(value) : `V${value || 1}`;
  };
  const isConfirmed = (version) => version?.status === 'confirmed' || version?.confirmed === true || Boolean(version?.confirmedAt);
  const dateLabel = (value) => {
    if (!value) return '时间未记录';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
  };
  const actionButton = (action, label, attributes = '', primary = false) => `<button type="button" class="mat-button${primary ? ' mat-primary' : ''}" data-action="${action}" ${attributes}>${E(label)}</button>`;

  const uploadControl = (taskId) => `<label class="mat-button mat-upload" title="上传改好的 Word，存成新版本"><input type="file" accept=".doc,.docx,.htm,.html" data-mat-upload data-task-id="${E(taskId)}">上传修改稿</label>`;

  function missingRequirements(task) {
    return asArray(task?.requirements).filter((requirement) => {
      if (requirement.required === false) return false;
      if (positiveStatuses.has(requirement.status) || requirement.fulfilled === true) return false;
      if (requirement.status) return true;
      return !asArray(task.sources).some((source) => source.id === requirement.sourceId && sourceProvided(source));
    });
  }

  function templateSections(task) {
    const policy = policyFor(task);
    // 原文列了材料的政策，按这些材料分章，每章对应一份资料。
    if (policy?.application) return policy.application.checklist.filter((item) => item.kind !== 'condition').map((item) => ({ id: item.id, title: item.label, sourceId: `${policy.id}-${item.id}`, optional: item.required === false }));
    const template = policy?.template;
    if (!template) return [];
    const configured = Array.isArray(template) ? template : asArray(template.sections || template.chapters);
    return (configured.length ? configured : defaultSections).map((section, index) => typeof section === 'string'
      ? { id: `section-${index + 1}`, title: section }
      : { id: section.id || `section-${index + 1}`, title: section.title || section.label || `第 ${index + 1} 章` });
  }

  function draftFor(task) {
    const previousDraft = drafts.get(task.id);
    // 先组稿后选政策时，稿子跟着带过来。
    if (previousDraft && previousDraft.policyId === 'no-policy' && previousDraft.policyId !== task.policyId) previousDraft.policyId = task.policyId;
    if (!previousDraft || previousDraft.policyId !== task.policyId) {
      const latest = versionsFor(task.id).filter((version) => version.policyId === task.policyId || version.policyId === 'no-policy').slice(-1)[0];
      drafts.set(task.id, {
        sections: latest ? clone(sectionList(latest)) : templateSections(task).map((section) => ({ ...section, body: '', sourceIds: [], sourceQuotes: [] })),
        note: '', baseVersionId: latest?.id || null, generated: Boolean(latest), policyId: task.policyId,
      });
    }
    const draft = drafts.get(task.id);
    if (!draft.sections.length && templateSections(task).length) draft.sections = templateSections(task).map((section) => ({ ...section, body: '', sourceIds: [], sourceQuotes: [] }));
    return drafts.get(task.id);
  }

  function quoteSnapshot(source) {
    return { id: source.id, name: source.name || '未命名资料', text: String(source.text || ''), type: source.type || '', provided: sourceProvided(source) };
  }

  function hasUnsavedDraft(taskId) {
    const task = taskById(taskId);
    const draft = drafts.get(taskId);
    if (!task || !draft || draft.policyId !== task.policyId) return false;
    if (draft.note.trim()) return true;
    const baseline = draft.baseVersionId && versionById(draft.baseVersionId);
    if (!baseline) return draft.sections.some(section => String(section.body || '').trim());
    const comparable = sections => sections.map(section => ({ id: section.id, title: section.title, body: section.body || '', sourceIds: section.sourceIds || [], sourceQuotes: (section.sourceQuotes || []).map(quoteSnapshot) }));
    return JSON.stringify(comparable(draft.sections)) !== JSON.stringify(comparable(sectionList(baseline)));
  }

  function sourceDetails(quotes, className = '') {
    if (!quotes.length) return '<p class="mat-source-empty">暂无可引用资料，相关内容需补充后核对。</p>';
    return `<div class="mat-sources ${className}">${quotes.map((source) => `<details class="mat-source"><summary>${E(source.name || '未命名资料')}</summary><div class="mat-source-text">${E(source.text || '该资料尚未录入正文。')}</div></details>`).join('')}</div>`;
  }

  function sectionQuotes(section) {
    // 版本只读取保存时的摘录，不回取企业当前资料。
    return asArray(section.sourceQuotes).map((source) => ({ ...source, name: source.name || '未命名资料' }));
  }

  function assemble(task) {
    const sources = asArray(task.sources).filter((source) => sourceProvided(source));
    const missing = missingRequirements(task);
    return templateSections(task).map((section) => {
      if (section.sourceId) {
        const source = sources.find((item) => item.id === section.sourceId && String(item.text || '').trim());
        const body = source ? source.text : section.optional ? '选填，没有可以不填。' : `【待补】请补充${section.title}。`;
        return { id: section.id, title: section.title, body, sourceIds: source ? [source.id] : [], sourceQuotes: source ? [quoteSnapshot(source)] : [] };
      }
      const name = `${section.id} ${section.title}`;
      const attachments = /attachment|附件|清单/i.test(name);
      const pattern = /research|rnd|研发|技术/i.test(name) ? /research|rnd|研发|技术|专利|成果|知识产权|著作权/i
        : /statement|application|申报|说明/i.test(name) ? /statement|application|申报|项目|申请/i
          : /company|overview|企业|概况/i.test(name) ? /company|profile|企业|营业|工商|概况/i : null;
      const selected = attachments ? sources : sources.filter((source) => pattern?.test(`${source.type || ''} ${source.name || ''}`) && String(source.text || '').trim());
      let body;
      if (attachments) {
        body = selected.length ? selected.map((source, index) => `${index + 1}. ${source.name}`).join('\n') : '【待补】尚未提供附件材料。';
        if (missing.length) body += `\n\n待补材料与事项：\n${missing.map((requirement) => `【待补】${requirement.label || requirement.title || '待核对材料'}`).join('\n')}`;
      } else {
        body = selected.length ? selected.map((source) => `${source.name}\n${source.text}`).join('\n\n') : `【待补】请补充${section.title}所需资料。`;
      }
      return { ...section, body, sourceIds: selected.map((source) => source.id), sourceQuotes: selected.map(quoteSnapshot) };
    });
  }

  function pageHeader(context, title, subtitle, actions = '') {
    const companyContext = context && !['申报材料', '申报材料库', '材料版本', '版本对比'].includes(context) && context !== title ? context : '';
    const description = [companyContext, subtitle].filter(Boolean).join(' · ');
    return `<header class="mat-header"><div><h1>${E(title)}</h1>${description ? `<p class="mat-subtitle">${E(description)}</p>` : ''}</div>${actions ? `<div class="mat-header-actions">${actions}</div>` : ''}</header>`;
  }

  function assemblyPrerequisites(task) {
    // 组稿只依赖选定的政策；企业资料和差距诊断可以跳过，最后确认时才必须齐全。
    return [
      { step: 'match', title: '选定申报政策', action: 'mat-policy' },
    ].filter((item) => task.steps?.[item.step] !== true && !policyFor(task)?.noPolicy);
  }

  function checkAssemblyPrerequisites(task) {
    const pending = assemblyPrerequisites(task);
    if (!pending.length) return true;
    ui().toast(`请先${pending[0].title}，再整理申报材料。`);
    return false;
  }

  function noTask() {
    return `<div class="mat-page">${pageHeader('申报材料', '选择一个申报任务', '每份材料都归属于具体企业与申报项目。')}<div class="mat-empty"><h2>还没有可组稿的任务</h2><p>先确认企业情况与拟申报项目，再准备材料。</p>${actionButton('mat-new', '创建新任务', '', true)}</div></div>`;
  }

  function gapNotice(task) {
    const missing = missingRequirements(task);
    if (!asArray(task.sources).some(sourceProvided)) return '<aside class="mat-gap-notice"><strong>先准备企业资料</strong><p>补充企业介绍、项目记录和对应证明，再按已有资料组稿。</p><span>缺少事实的章节会标为待补，不自动填写企业数据。</span></aside>';
    if (!missing.length) return '<p class="mat-readiness mat-ready">必备资料已具备，请继续核对正文与引用来源。</p>';
    return `<aside class="mat-gap-notice"><strong>还有 ${missing.length} 项需要补充或核对</strong><p>${E(missing.map((requirement) => requirement.label || requirement.title).filter(Boolean).join('、'))}</p><span>可以先保存草稿，补齐并核对后再确认版本。</span></aside>`;
  }

  function renderAssembly(taskId) {
    const task = taskById(taskId);
    if (!task) return noTask();
    const policy = policyFor(task);
    const template = templateSections(task);
    const actions = uploadControl(task.id) + actionButton('mat-diagnosis', '查看待补项', `data-task-id="${E(task.id)}"`);
    const prerequisites = assemblyPrerequisites(task);
    if (prerequisites.length) return `<div class="mat-page">${pageHeader(companyName(task), '材料组稿', policy?.title || task.title, actionButton('mat-library', '查看材料库'))}<section class="mat-prerequisites"><h2>组稿前，先选定申报政策</h2><p>选好政策后就能整理正文，差距诊断可以跳过。</p><ol>${prerequisites.map((item) => `<li><span>${E(item.title)}</span>${actionButton(item.action, '去处理', `data-task-id="${E(task.id)}"`)}</li>`).join('')}</ol></section></div>`;
    const draft = draftFor(task);
    if (!template.length) {
      return `<div class="mat-page">${pageHeader(companyName(task), '准备申报材料', policy?.title || task.title, actions)}<div class="mat-no-template"><h2>尚未提供申报模板</h2><p>先整理材料清单，取得模板后再按章节组稿。</p></div>${gapNotice(task)}<section class="mat-material-checklist"><h2>现有材料</h2>${asArray(task.sources).length ? `<ul>${asArray(task.sources).map((source) => `<li><div><strong>${E(source.name)}</strong><span>${sourceProvided(source) ? '已提供' : '待补充'}</span></div>${sourceProvided(source) ? sourceDetails([quoteSnapshot(source)]) : ''}</li>`).join('')}</ul>` : '<p class="mat-muted">尚未添加材料。</p>'}</section></div>`;
    }
    const base = draft.baseVersionId ? versionById(draft.baseVersionId) : null;
    return `<div class="mat-page">${pageHeader(companyName(task), '材料组稿', policy?.title || task.title, actions)}${policy?.noPolicy ? '<p class="mat-generic-note">还没选政策，先用通用章节。选好政策后，这份稿子会继续保留。</p>' : policy?.application ? '<p class="mat-generic-note">章节按这项政策要求的材料整理，具体格式以官方系统为准。</p>' : policy?.genericTemplate ? '<p class="mat-generic-note">当前用的是通用模板，章节不是按这项政策的原文整理，提交前请对照政策原文调整。</p>' : ''}${gapNotice(task)}<div class="mat-editor-layout"><nav class="mat-chapter-nav" aria-label="模板章节"><p>模板章节</p>${draft.sections.map((section, index) => `<button type="button" data-action="mat-section" data-section-index="${index}"><span>${String(index + 1).padStart(2, '0')}</span>${E(section.title)}</button>`).join('')}<small>依据已提供资料整理</small></nav><form id="assembly-form" data-material-task="${E(task.id)}" class="mat-editor-form"><div class="mat-editor-toolbar"><div><h2>申报材料草稿</h2><p>${base ? `基于 ${E(versionLabel(base))} 继续修改` : '先按资料组稿，再逐章核对与修改'}</p></div>${actionButton('mat-generate', '按已有资料组稿', `data-task-id="${E(task.id)}"`, !draft.generated)}</div>${draft.sections.map((section, index) => `<section class="mat-editor-section" id="mat-chapter-${index}"><label for="mat-section-${index}"><span>${String(index + 1).padStart(2, '0')}</span>${E(section.title)}</label><textarea id="mat-section-${index}" class="mat-editor" data-mat-section="${index}" rows="${index === 3 ? 7 : 9}" maxlength="40000" placeholder="按已有资料组稿后，在这里核对与修改。">${E(section.body || '')}</textarea><div class="mat-section-source-heading">本章引用资料</div>${sourceDetails(sectionQuotes(section))}</section>`).join('')}<section class="mat-save-section"><label for="mat-version-note">本次修改说明 <span>选填</span></label><input id="mat-version-note" type="text" maxlength="240" data-mat-note value="${E(draft.note)}" placeholder="例如：补充研发基础，核对附件名称"><p>保存后会新增一个版本，已保存的正文与来源会保留。</p><button type="submit" class="mat-button mat-primary">保存新版本</button></section></form></div></div>`;
  }

  /* 材料库：一个企业一个 tab，tab 里按政策分组，政策下面是这项政策的材料版本。 */
  function libraryCompanies() {
    const companies = new Map();
    allTasks().forEach((task) => versionsFor(task.id).forEach((version) => {
      const name = companyName(task);
      if (!companies.has(name)) companies.set(name, new Map());
      const policies = companies.get(name);
      if (!policies.has(version.policyId)) policies.set(version.policyId, { policyId: version.policyId, items: [] });
      policies.get(version.policyId).items.push(version);
    }));
    const latest = (policies) => Math.max(...[...policies.values()].flatMap((group) => group.items.map((version) => Date.parse(version.createdAt) || 0)));
    return [...companies.entries()].sort((left, right) => latest(right[1]) - latest(left[1]));
  }

  function renderLibrary(requested = '') {
    const companies = libraryCompanies();
    const head = pageHeader('', '申报材料库');
    if (!companies.length) return `<div class="mat-page">${head}<div class="mat-empty"><h2>材料库里还没有材料</h2><p>保存第一份材料后，会出现在这里。</p></div></div>`;
    const [current, policies] = companies.find(([name]) => name === requested) || companies[0];
    const tabs = companies.map(([name]) => `<button type="button" class="mat-company-tab${name === current ? ' is-active' : ''}" data-action="mat-library-tab" data-company="${E(name)}"${name === current ? ' aria-current="page"' : ''}>${E(name)}</button>`).join('');
    const groups = [...policies.values()].map(({ policyId, items }) => {
      const title = asArray(window.PolicyData?.policies).find((policy) => policy.id === policyId)?.title || '未选政策';
      const rows = items.slice().sort((left, right) => (Date.parse(right.createdAt) || 0) - (Date.parse(left.createdAt) || 0)).map((version) => `<article class="mat-version-row"><div class="mat-version-number">${E(versionLabel(version))}</div><div class="mat-version-copy"><strong>${E(sectionList(version).map((section) => section.title).join('、') || '尚无正文')}</strong>${version.note ? `<span>${E(version.note)}</span>` : ''}</div><time class="mat-version-time" datetime="${E(version.createdAt)}">${E(dateLabel(version.createdAt))}</time><span class="mat-status ${isConfirmed(version) ? 'mat-status-confirmed' : ''}">${isConfirmed(version) ? '已确认' : '待核对'}</span><div class="mat-version-actions">${actionButton('mat-download', '下载', `data-version-id="${E(version.id)}"`)}${actionButton('mat-chat', '跳转到会话', `data-task-id="${E(version.taskId)}"`)}</div></article>`).join('');
      return `<section class="mat-library-group"><header><h2>${E(title)}</h2></header><div class="mat-version-list">${rows}</div></section>`;
    }).join('');
    return `<div class="mat-page">${head}<nav class="mat-company-tabs" aria-label="按企业查看">${tabs}</nav>${groups}</div>`;
  }

  function confirmationBlockers(version, task) {
    if (typeof store()?.getVersionBlockers === 'function') return store().getVersionBlockers(version.id);
    const result = missingRequirements(task).map((requirement) => requirement.label || requirement.title || '必备资料待补');
    if (version.policyId !== task?.policyId) result.unshift('申报项目已变更，请重新组稿并保存新版本');
    const sources = asArray(task?.sources);
    const sourceChanged = sectionList(version).some((section) => sectionQuotes(section).some((quote) => {
      const current = sources.find((source) => source.id === quote.id);
      return !current || JSON.stringify(quoteSnapshot(current)) !== JSON.stringify(quoteSnapshot(quote));
    }));
    if (sourceChanged) result.unshift('资料已更新，请重新组稿并保存新版本');
    if (!sectionList(version).length) result.push('尚无可确认的材料正文');
    return [...new Set(result)];
  }

  /* 章节对应哪份材料：公开政策按章节 id，其余按材料名称；对不上的章节只在版本里改。 */
  function sectionSourceId(task, section) {
    const policy = policyFor(task);
    const byId = policy ? `${policy.id}-${section.id}` : '';
    return asArray(task?.requirements).find((item) => item.kind === 'material' && (item.sourceId === byId || item.label === section.title))?.sourceId || '';
  }

  /* 材料正文超过固定高度就折叠；要等页面画出来才量得到高度。 */
  const expandedBodies = new Set();
  function syncBodyClamps() {
    document.querySelectorAll('.mat-body-clamp').forEach((clamp) => {
      const body = clamp.querySelector('.mat-body-text');
      const open = clamp.classList.contains('is-open');
      // 展开时高度不受限，用折叠高度比较才知道要不要留“收起”。
      const limit = parseFloat(getComputedStyle(clamp).getPropertyValue('--clamp-height')) || 330;
      const long = open || body.scrollHeight > limit + 1;
      clamp.classList.toggle('is-long', long);
      clamp.querySelector('.mat-body-toggle').hidden = !long;
    });
  }
  window.addEventListener('resize', syncBodyClamps);

  function versionSection(task, version, section, index, editable) {
    const attrs = `data-task="${E(task?.id || '')}" data-version-id="${E(version.id)}" data-section-index="${index}"`;
    const sourceId = task ? sectionSourceId(task, section) : '';
    const source = sourceId ? asArray(task.sources).find((item) => item.id === sourceId) : null;
    const provided = Boolean(source?.provided);
    const optional = asArray(task?.requirements).some((item) => item.sourceId === sourceId && item.required === false);
    const pending = store().hasPendingMark(section.body);
    const empty = optional && !asArray(section.sourceIds).length && !provided;
    const remove = editable && sourceId && provided ? `<button type="button" class="text-button vd-delete" data-action="material-delete" data-task="${E(task.id)}" data-source="${E(sourceId)}">删除</button>` : '';
    const uploadLabel = provided || !sourceId ? '重新上传' : '上传文件';
    const upload = editable ? `<label class="chat-gap-upload">${uploadLabel}<input type="file" data-section-upload ${attrs} accept=".doc,.docx,.txt,.md,.htm,.html,.pdf,.jpg,.jpeg,.png" aria-label="${uploadLabel}${E(section.title)}"></label>` : '';
    const state = !editable ? '' : pending ? '<span class="prep-state vd-warn">有待补充</span>' : empty ? '<span class="prep-state">选填，未提供</span>' : source?.type === 'generated' ? `<span class="prep-state is-done">${window.PolicyUI.icon('check')}AI 已生成</span>` : provided ? `<span class="prep-state is-done">${window.PolicyUI.icon('check')}已上传</span>` : '';
    const download = empty ? '' : `<button type="button" class="text-button vd-download" data-action="mat-section-download" ${attrs}>下载</button>`;
    const head = `<header class="vd-head"><span class="prep-card-icon" aria-hidden="true">${window.PolicyUI.icon('file')}</span><h2>${E(section.title)}</h2>${download}${state}${remove || upload ? `<div class="vd-actions">${remove}${upload}</div>` : ''}</header>`;
    if (empty) return `<section class="vd-card is-empty mat-readonly-section">${head}</section>`;
    const open = expandedBodies.has(`${version.id}:${index}`);
    const quotes = sectionQuotes(section);
    return `<section class="vd-card mat-readonly-section${pending ? ' is-pending' : ''}">${head}${pending ? '<p class="vd-flag">这份材料还有待补充的内容，可以改好后重新上传，不影响确认。</p>' : ''}<div class="mat-body-clamp${open ? ' is-open' : ''}" data-clamp-key="${E(version.id)}:${index}"><div class="mat-body-text">${E(section.body || '本章尚未填写。')}</div><button type="button" class="text-button mat-body-toggle" data-action="mat-body-toggle" aria-expanded="${open}" hidden>${open ? '收起' : '展开全部'}</button></div>${quotes.length ? `<div class="vd-quotes"><span>引用资料</span>${sourceDetails(quotes)}</div>` : ''}</section>`;
  }

  function renderVersion(versionId) {
    const version = versionById(versionId);
    if (!version) return `<div class="mat-page">${pageHeader('材料版本', '没有找到这个版本', '可以从材料库重新选择。', actionButton('mat-library', '返回材料库'))}</div>`;
    const task = taskById(version.taskId);
    const sections = sectionList(version);
    const blockers = confirmationBlockers(version, task);
    const confirmed = isConfirmed(version);
    // 上面的评分看整套材料，下面的操作只针对单份材料；只有最新版本能改。
    const latest = versionsFor(version.taskId).sort((left, right) => right.number - left.number)[0];
    const editable = Boolean(task) && latest?.id === version.id;
    return `<div class="mat-page">${pageHeader('', `${versionLabel(version)} · ${version.taskTitle || task?.title || '申报材料'}`)}${window.PolicyMatch?.versionReview(task, version) || ''}<div class="mat-version-document">${sections.map((section, index) => versionSection(task, version, section, index, editable)).join('')}</div>${confirmed ? '<div class="mat-confirmation mat-confirmed"><strong>这个版本已经确认</strong><p>重新上传材料会存成新版本，这一版继续保留。</p></div>' : `<section class="mat-confirmation"><div><h2>请核对材料</h2>${blockers.length ? `<p>还有 ${blockers.length} 项要处理，重新上传对应材料后会存成新版本。</p><ul>${blockers.map((reason) => `<li>${E(reason)}</li>`).join('')}</ul>` : '<p>核对无误后点确定，进入办理指引。</p>'}</div>${actionButton('mat-confirm', '确定', `data-version-id="${E(version.id)}"${blockers.length ? ' aria-disabled="true"' : ''}`, true)}</section>`}</div>`;
  }

  function diffBody(body = '', other = '') {
    const otherLines = new Set(String(other).split(/\n+/));
    return String(body).split('\n').map((line) => `<p class="mat-diff-line${line && !otherLines.has(line) ? ' mat-diff-changed' : ''}">${E(line) || '&nbsp;'}</p>`).join('');
  }

  function renderCompare(leftId, rightId) {
    const left = versionById(leftId);
    const right = versionById(rightId);
    if (!left || !right || left.taskId !== right.taskId || left.id === right.id) return `<div class="mat-page">${pageHeader('版本对比', '请选择同一任务的两个不同版本', '每个版本都可以从材料库查看。', actionButton('mat-library', '返回材料库'))}</div>`;
    const task = taskById(left.taskId);
    const before = sectionList(left);
    const after = sectionList(right);
    const ids = [...new Set([...before.map((section) => section.id), ...after.map((section) => section.id)])];
    const comparisons = ids.map((id) => {
      const previous = before.find((section) => section.id === id);
      const next = after.find((section) => section.id === id);
      const changed = previous && next && (previous.body !== next.body || JSON.stringify(sectionQuotes(previous)) !== JSON.stringify(sectionQuotes(next)));
      return { previous, next, label: !previous ? '新增' : !next ? '移除' : changed ? '修改' : '未改' };
    });
    const changes = comparisons.filter((item) => item.label !== '未改').length;
    return `<div class="mat-page">${pageHeader(companyName(task), `${versionLabel(left)} 与 ${versionLabel(right)}`, `${changes} 个章节有变化，${comparisons.length - changes} 个章节未改。`, actionButton('mat-library', '返回材料库'))}<div class="mat-compare-legend"><span><i class="mat-legend-changed"></i>本版修改的文字</span><span>正文及来源均按对应版本显示</span></div><div class="mat-compare-version-headings"><strong>${E(versionLabel(left))}<span>${E(dateLabel(left.createdAt))}</span></strong><strong>${E(versionLabel(right))}<span>${E(dateLabel(right.createdAt))}</span></strong></div>${comparisons.map(({ previous, next, label }) => `<section class="mat-comparison"><header><h2>${E(next?.title || previous?.title)}</h2><span class="mat-diff-label${label !== '未改' ? ' mat-diff-label-changed' : ''}">${label}</span></header><div class="mat-compare-columns"><div><h3 class="mat-mobile-version">${E(versionLabel(left))}</h3>${previous ? `<div class="mat-diff-body">${diffBody(previous.body, next?.body)}</div><h3>引用资料</h3>${sourceDetails(sectionQuotes(previous))}` : '<p class="mat-muted">本版没有这个章节。</p>'}</div><div><h3 class="mat-mobile-version">${E(versionLabel(right))}</h3>${next ? `<div class="mat-diff-body">${diffBody(next.body, previous?.body)}</div><h3>引用资料</h3>${sourceDetails(sectionQuotes(next))}` : '<p class="mat-muted">本版没有这个章节。</p>'}</div></div></section>`).join('')}</div>`;
  }

  /* Word 能直接打开这种 .doc，正文是提交用的，不带引用资料。 */
  function saveWord(title, body, filename) {
    const html = `<html><head><meta charset="utf-8"><title>${E(title)}</title></head><body><h1>${E(title)}</h1>${body}</body></html>`;
    const url = URL.createObjectURL(new Blob(['\uFEFF', html], { type: 'application/msword;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function downloadVersion(version) {
    const title = `${version.taskTitle || taskById(version.taskId)?.title || '申报材料'} · ${versionLabel(version)}`;
    const paragraphs = (body) => String(body || '尚未填写').split(/\n+/).map((line) => `<p>${E(line)}</p>`).join('');
    saveWord(title, sectionList(version).map((section) => `<h2>${E(section.title)}</h2>${paragraphs(section.body)}`).join(''), `申报材料-${versionLabel(version).replace(/[^\w-]/g, '')}.doc`);
  }

  /* 智能生成：从用户批量选的文档里摘出这份材料相关的段落，拼成初稿。目前是按关键词提取，没有接模型。 */
  const generating = new Map();
  const isGenerating = (taskId, sourceId) => generating.has(`${taskId}:${sourceId}`);
  const generatingCount = (taskId, sourceId) => generating.get(`${taskId}:${sourceId}`) || 0;
  function draftMaterial(label, expects, files) {
    // 选的文档可能是之前下载的稿子：里面的待补标记和依据行不是内容。
    const paragraphs = [...new Set(files.flatMap((file) => file.text.split(/\n+/)).map((line) => line.trim()).filter((line) => line.length >= 4 && !store().hasPendingMark(line) && !/^依据文件：|^【已上传文件：/.test(line)))];
    const pick = (words) => paragraphs.filter((line) => words.some((word) => line.includes(word))).slice(0, 6);
    const broadWords = new Set(['申报', '材料', '项目', '政策', '企业', '证明', '报告']);
    const labelWords = [label, ...Array.from({ length: Math.max(label.length - 1, 0) }, (_, index) => label.slice(index, index + 2)).filter((word) => !broadWords.has(word))];
    const sections = expects.length ? expects.map((word) => ({ title: word, lines: pick([word]) })) : [{ title: '相关内容', lines: pick(labelWords) }];
    const numerals = '一二三四五六七八九十';
    const filled = sections.filter((section) => section.lines.length);
    const gaps = sections.filter((section) => !section.lines.length).map((section) => section.title);
    return [`依据文件：${files.map((file) => file.name).join('、')}`, ...filled.flatMap((section, index) => [`${numerals[index] || index + 1}、${section.title}`, ...section.lines]), ...(gaps.length ? [`【待补充：${gaps.join('、')}】`] : [])].join('\n');
  }
  async function generateMaterial(taskId, sourceId, files, save) {
    const key = `${taskId}:${sourceId}`;
    const task = taskById(taskId);
    const requirement = asArray(task?.requirements).find((item) => item.sourceId === sourceId);
    if (!requirement || generating.has(key)) return;
    generating.set(key, files.length);
    ui().refresh();
    const read = await Promise.all(files.map(async (file) => ({ name: file.name, text: await readFileText(file) })));
    generating.delete(key);
    const usable = read.filter((file) => file.text);
    if (!usable.length) { ui().refresh(); ui().toast('这些文件读不到文字，请选择 Word 或文本文件。'); return; }
    const checklist = (window.PolicyPublicPolicies || []).flatMap((policy) => asArray(policy.application?.checklist).map((entry) => ({ id: `${policy.id}-${entry.id}`, expects: entry.expects || [] })));
    const expects = checklist.find((entry) => entry.id === sourceId)?.expects || [];
    if (!save(draftMaterial(requirement.label, expects, usable), requirement.label)) { ui().refresh(); ui().toast('未能保存，请重试。'); return; }
    ui().refresh();
    const skipped = read.length - usable.length;
    ui().toast(`已生成《${requirement.label}》${skipped ? `，${skipped} 个文件读不到文字` : ''}，可以下载修改后再上传。`);
  }
  /* 用户上传的原文件只留在当前页面；刷新后只剩读出的文字，图片和 PDF 要重新上传。 */
  const uploadedFiles = new Map();
  const rememberFile = (taskId, sourceId, file) => uploadedFiles.set(`${taskId}:${sourceId}`, file);
  const forgetFile = (taskId, sourceId) => uploadedFiles.delete(`${taskId}:${sourceId}`);
  function saveFile(file, filename) {
    const url = URL.createObjectURL(file);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function downloadMaterial(task, sourceId) {
    const source = asArray(task?.sources).find((item) => item.id === sourceId);
    if (!source) { ui().toast('没有找到这份材料。'); return; }
    const kept = uploadedFiles.get(`${task.id}:${sourceId}`);
    if (kept && source.type !== 'generated') { saveFile(kept, source.fileName || kept.name); return; }
    if (/^【已上传文件：/.test(source.text)) { ui().toast('原文件已不在当前页面，请重新上传。'); return; }
    const label = asArray(task.requirements).find((item) => item.sourceId === sourceId)?.label || source.name || '申报材料';
    const body = String(source.text).split(/\n+/).map((line) => /^(?:[一二三四五六七八九十]+|\d+)、/.test(line) ? `<h2>${E(line)}</h2>` : `<p>${E(line)}</p>`).join('');
    saveWord(label, body, `${label}.doc`);
  }

  const wordBody = (text) => String(text).split(/\n+/).map((line) => /^(?:[一二三四五六七八九十]+|\d+)、/.test(line) ? `<h2>${E(line)}</h2>` : `<p>${E(line)}</p>`).join('');
  function downloadSection(version, index) {
    const section = sectionList(version)[index];
    if (!section) { ui().toast('没有找到这份材料。'); return; }
    saveWord(section.title, wordBody(section.body || '尚未填写'), `${section.title}.doc`);
  }

  /* 重新上传一份材料：只换这一章，其余章节照旧，存成新版本。 */
  async function reuploadSection(taskId, versionId, index, file, saveSource) {
    const task = taskById(taskId);
    const version = versionById(versionId);
    const section = sectionList(version)[index];
    if (!task || !section) return;
    const sourceId = sectionSourceId(task, section);
    const read = await readFileText(file);
    if (!read && !sourceId) { ui().toast('读不了这份文件。请在 Word 里另存为 .docx 再上传。'); return; }
    // 下载的 Word 第一行是材料名，传回来时去掉。
    const text = read.startsWith(`${section.title}\n`) ? read.slice(section.title.length + 1) : read;
    const body = text || `【已上传文件：${file.name}，请人工核对内容】`;
    if (sourceId) rememberFile(taskId, sourceId, file);
    if (sourceId && !saveSource(sourceId, body, file.name)) { ui().toast('未能保存，请重试。'); return; }
    const source = sourceId ? asArray(taskById(taskId).sources).find((item) => item.id === sourceId) : null;
    const sections = clone(sectionList(version));
    sections[index] = { ...sections[index], body, sourceIds: source ? [source.id] : [], sourceQuotes: source ? [quoteSnapshot(source)] : [] };
    const saved = store().saveVersion(taskId, sections, `重新上传${section.title}：${file.name}`);
    if (!saved?.id) { ui().toast('未能保存，请重试。'); return; }
    store().updateTask(taskId, { status: 'review', steps: { assembly: true, review: false } });
    drafts.delete(taskId);
    const work = new URLSearchParams(location.hash.split('?')[1] || '').get('work') || 'assembly';
    ui().navigate('version', { id: saved.id, task: taskId, work });
    ui().toast(`已更新《${section.title}》，存成 ${versionLabel(saved)}。`);
  }

  function downloadAdvice(task, sourceId) {
    const source = asArray(task?.sources).find((item) => item.id === sourceId);
    const items = source && window.PolicyMatch?.reviewMaterial(task, source).items;
    if (!items?.length) { ui().toast('这份材料没有需要下载的建议。'); return; }
    const title = `${source.name} AI 建议`;
    saveWord(title, items.map((item, index) => `<h2>${index + 1}</h2><p><b>原文：</b>${E(item.original)}</p><p><b>问题：</b>${E(item.problem)}</p><p><b>AI 建议：</b>${E(item.suggestion)}</p>`).join(''), `${source.name}-AI建议.doc`);
  }

  /* 卡片上的查看：材料有更新就按最新资料生成新版本，再打开抽屉。 */
  function openLatest(task, work = 'assembly', versionId = '') {
    // 按钮带着它看到的版本：对不上这个项目就不动，避免改到别的项目。
    if (!task || versionId && versionById(versionId)?.taskId !== task.id) return;
    const latest = versionsFor(task.id).sort((left, right) => right.number - left.number)[0];
    const outdated = !latest || store().getVersionBlockers(latest.id).some((reason) => /资料已更新|申报项目已变更/.test(reason));
    if (!outdated) { ui().navigate('version', { id: latest.id, task: task.id, work }); return; }
    // 必填没齐（比如页面上留着过期的按钮）不生成，回到对话继续补。
    const blocked = store().getWorkConfirmation(task.id, 'assembly').reasons.filter((reason) => !/资料已更新|申报项目已变更|请先按资料组稿/.test(reason));
    if (blocked.length) { ui().toast(blocked[0]); return; }
    const sections = assemble(task);
    const version = sections.length && store().saveVersion(task.id, sections, '按最新资料整理');
    if (!version?.id) { ui().toast('未能整理，请重试。'); return; }
    store().updateTask(task.id, { status: 'review', steps: { assembly: true, review: false } });
    drafts.delete(task.id);
    ui().navigate('version', { id: version.id, task: task.id, work });
  }

  function handleClick(target) {
    const button = target instanceof Element ? target.closest('[data-action^="mat-"]') : null;
    if (!button) return false;
    const action = button.dataset.action;
    const taskId = button.dataset.taskId || button.dataset.task;
    const versionId = button.dataset.versionId;
    if (action === 'mat-new') ui().navigate('new');
    else if (action === 'mat-library') ui().navigate('library');
    else if (action === 'mat-produce') {
      // 按企业现有资料整理成稿，直接存成版本并下载 Word；要改就线下改完传回来。
      const task = taskById(taskId);
      if (!task) return true;
      const sections = assemble(task);
      const version = sections.length && store().saveVersion(task.id, sections, '按现有资料生成');
      if (!version?.id) { ui().toast('未能生成，请重试。'); return true; }
      store().updateTask(task.id, { status: 'review', steps: { assembly: true, review: false } });
      drafts.delete(task.id);
      downloadVersion(version);
      ui().refresh();
      ui().toast(`已生成 ${versionLabel(version)}，改好后可以上传回来。`);
    }
    else if (action === 'mat-body-toggle') {
      const clamp = button.closest('.mat-body-clamp');
      const open = clamp.classList.toggle('is-open');
      if (open) expandedBodies.add(clamp.dataset.clampKey); else expandedBodies.delete(clamp.dataset.clampKey);
      button.textContent = open ? '收起' : '展开全部';
      button.setAttribute('aria-expanded', String(open));
      syncBodyClamps();
      if (!open) clamp.scrollIntoView({ block: 'nearest' });
    }
    else if (action === 'mat-open-latest') openLatest(taskById(taskId), button.dataset.work, versionId);
    else if (action === 'mat-material-download') downloadMaterial(taskById(taskId), button.dataset.source);
    else if (action === 'mat-advice-download') downloadAdvice(taskById(taskId), button.dataset.source);
    else if (action === 'mat-section-download') downloadSection(versionById(versionId), Number(button.dataset.sectionIndex));
    else if (action === 'mat-library-tab') ui().navigate('library', { company: button.dataset.company });
    else if (action === 'mat-chat') ui().navigate('task', { task: taskId, work: 'assembly' });
    else if (action === 'mat-assembly') ui().navigate('assembly', { task: taskId });
    else if (action === 'mat-diagnosis') ui().navigate('diagnosis', { task: taskId });
    else if (action === 'mat-profile') ui().navigate('profile', { task: taskId });
    else if (action === 'mat-policy') ui().navigate('policy', { task: taskId, id: taskById(taskId)?.policyId });
    else if (action === 'mat-version') ui().navigate('version', { id: versionId });
    else if (action === 'mat-section') {
      const editor = document.querySelector(`#mat-section-${Number(button.dataset.sectionIndex)}`);
      editor?.focus({ preventScroll: true });
      editor?.closest('.mat-editor-section')?.scrollIntoView({ block: 'start', behavior: 'auto' });
    } else if (action === 'mat-generate') {
      const task = taskById(taskId);
      if (!task || !templateSections(task).length) { ui().toast('取得申报模板后才能按章节组稿。'); return true; }
      if (!checkAssemblyPrerequisites(task)) return true;
      const draft = draftFor(task);
      if (draft.sections.some((section) => String(section.body || '').trim()) && !window.confirm('重新组稿将替换当前未保存的编辑。是否继续？')) return true;
      draft.sections = assemble(task);
      draft.generated = true;
      ui().refresh();
      ui().toast('已按现有资料整理，请逐章核对待补内容与来源。');
    } else if (action === 'mat-edit-version') {
      const version = versionById(versionId);
      const task = version && taskById(version.taskId);
      if (!task) { ui().toast('没有找到对应任务。'); return true; }
      drafts.set(task.id, { sections: clone(sectionList(version)), note: '', baseVersionId: version.id, generated: true, policyId: task.policyId });
      ui().navigate('assembly', { task: task.id });
    } else if (action === 'mat-download') {
      const version = versionById(versionId);
      if (version) downloadVersion(version);
      else ui().toast('没有找到这个版本。');
    } else if (action === 'mat-confirm') {
      const version = versionById(versionId);
      const task = version && taskById(version.taskId);
      if (!version || !task) { ui().toast('没有找到对应版本或任务。'); return true; }
      const pending = ui().getPendingDraft?.(task.id);
      if (pending) { ui().toast(pending.reason); return true; }
      const confirmation = store().getWorkConfirmation(task.id, 'review');
      const result = store().confirmWork(task.id, 'review', confirmation.fingerprint, version.id);
      if (!result.ok) { ui().toast(result.reasons[0] || '当前资料尚未满足确认要求，请核对待补项。'); return true; }
      ui().advanceWork(task.id, result.nextWork);
      ui().toast('已确认这个材料版本。');
    }
    return true;
  }

  function handleSubmit(form, event) {
    if (form?.id !== 'assembly-form') return false;
    event?.preventDefault();
    const task = taskById(form.dataset.materialTask);
    if (!task || !templateSections(task).length) { ui().toast('尚未提供可用的任务或模板。'); return true; }
    if (!checkAssemblyPrerequisites(task)) return true;
    const draft = draftFor(task);
    if (!draft.sections.some((section) => String(section.body || '').trim())) { ui().toast('请先按已有资料组稿，或填写章节内容。'); return true; }
    const sections = clone(draft.sections);
    const version = store().saveVersion(task.id, sections, draft.note.trim());
    if (!version?.id) { ui().toast('材料未保存，请重试。'); return true; }
    store().updateTask(task.id, { status: 'review', steps: { ...task.steps, assembly: true, review: false } });
    draft.baseVersionId = version.id;
    draft.note = '';
    // 保存后回到对话，新版本和下一步都在对话里。
    ui().navigate('task', { task: task.id, work: 'assembly' });
    ui().toast(`已保存 ${versionLabel(version)}。`);
    return true;
  }

  /* 改好的 Word 上传回来：全程在浏览器本地解析，不发到任何服务器。 */
  function loadDocxReader() {
    if (window.mammoth) return Promise.resolve(window.mammoth);
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js';
      script.onload = () => window.mammoth ? resolve(window.mammoth) : reject(new Error('reader'));
      script.onerror = () => reject(new Error('reader'));
      document.head.append(script);
    });
  }

  async function fileToHtml(file) {
    if (/\.docx$/i.test(file.name)) {
      const reader = await loadDocxReader();
      return (await reader.convertToHtml({ arrayBuffer: await file.arrayBuffer() })).value;
    }
    const text = await file.text();
    // 我们导出的 .doc 是网页格式；Word 另存的老式二进制 .doc 读不了。
    if (!/<html|<body|<p[\s>]|<h[1-3][\s>]/i.test(text)) throw new Error('format');
    return text;
  }

  /* 读取上传资料的文字用于解析；读不出（图片、PDF、老式 .doc）返回空。 */
  async function readFileText(file) {
    try {
      if (/\.(txt|md)$/i.test(file.name)) return (await file.text()).trim();
      const html = await fileToHtml(file);
      const doc = new DOMParser().parseFromString(html, 'text/html');
      return [...doc.body.querySelectorAll('h1,h2,h3,p,li,td')].map((node) => node.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');
    } catch {
      return '';
    }
  }

  /* 按二级标题分回章节，章节名没变就沿用原来的章节。 */
  function htmlToSections(html, task) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const known = versionsFor(task.id).filter((version) => version.policyId === task.policyId).slice(-1).flatMap((version) => sectionList(version));
    const sections = [];
    let current = null;
    doc.body.querySelectorAll('h2,p,li,td').forEach((node) => {
      const text = node.textContent.replace(/\s+/g, ' ').trim();
      if (node.tagName === 'H2') {
        const match = known.find((section) => section.title === text);
        current = { id: match?.id || `upload-${sections.length + 1}`, title: text || `第 ${sections.length + 1} 章`, body: '', sourceIds: [], sourceQuotes: [] };
        sections.push(current);
      } else if (text) {
        if (!current) { current = { id: 'uploaded', title: '上传的稿子', body: '', sourceIds: [], sourceQuotes: [] }; sections.push(current); }
        current.body += `${current.body ? '\n' : ''}${text}`;
      }
    });
    return sections.filter((section) => section.body.trim());
  }

  async function uploadRevision(task, file) {
    try {
      const sections = htmlToSections(await fileToHtml(file), task);
      if (!sections.length) { ui().toast('这份文件里没有读到正文。'); return; }
      const version = store().saveVersion(task.id, sections, `上传修改稿：${file.name}`);
      if (!version?.id) { ui().toast('未能保存，请重试。'); return; }
      store().updateTask(task.id, { status: 'review', steps: { assembly: true, review: false } });
      drafts.delete(task.id);
      ui().navigate('version', { id: version.id, task: task.id, work: 'assembly' });
      ui().toast(`已存成 ${versionLabel(version)}，请核对内容。`);
    } catch {
      ui().toast('读不了这份文件。请在 Word 里另存为 .docx 再上传。');
    }
  }

  document.addEventListener('change', (event) => {
    const input = event.target instanceof Element && event.target.matches('[data-mat-upload]') ? event.target : null;
    const file = input?.files?.[0];
    const task = input && taskById(input.dataset.taskId);
    if (file && task) uploadRevision(task, file);
  });

  /* 用户手头已有的稿子：直接存成第一个版本，之后在抽屉里继续改。 */
  function importDraft(taskId, body) {
    const task = taskById(taskId);
    const text = String(body || '').trim();
    if (!task || !text) return false;
    const version = store().saveVersion(task.id, [{ id: 'imported', title: '已有稿子', body: text, sourceIds: [], sourceQuotes: [] }], '导入已有稿子');
    if (!version?.id) return false;
    return store().updateTask(task.id, { status: 'review', steps: { assembly: true, review: false } });
  }

  document.addEventListener('input', (event) => {
    const input = event.target instanceof Element ? event.target : null;
    const form = input?.closest('#assembly-form');
    if (!form) return;
    const task = taskById(form.dataset.materialTask);
    if (!task) return;
    const draft = draftFor(task);
    if (input.hasAttribute('data-mat-section')) {
      const section = draft.sections[Number(input.dataset.matSection)];
      if (section) section.body = input.value;
    } else if (input.hasAttribute('data-mat-note')) draft.note = input.value;
  });

  window.PolicyMaterials = Object.freeze({ renderAssembly, renderLibrary, renderVersion, renderCompare, handleClick, handleSubmit, hasUnsavedDraft, importDraft, readFileText, generateMaterial, isGenerating, generatingCount, reuploadSection, syncBodyClamps, rememberFile, forgetFile, forgetTask:taskId=>drafts.delete(taskId) });
})();
