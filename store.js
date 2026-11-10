/* 独立演示状态；持久化失败仍可在内存中操作，调用方读取 storageError 显示保存结果。 */
(() => {
  'use strict';
  const STORAGE_KEY = 'huiqi-prep-v2-2-20261110-huiqi-policy-demo-v1';
  const DATA = window.PolicyData;
  if (!DATA) throw new Error('demo-data.js 必须在 store.js 之前加载');
  const subscribers = new Set();
  const clone = (value) => JSON.parse(JSON.stringify(value));
  // 旧数据里的演示标记：整份替换，版本引用和当前资料保持一致。
  const cleanLegacyMarks = (raw) => raw
    // 已下线的政策，项目保留，需要重新选政策。
    .replace(/sz-incubator-extension-2026/g, 'no-policy')
    .replace(/（演示）|【虚构企业资料】|【虚构演示资料】|本资料只用于演示组稿流程。/g, '')
    .replace(/演示年度/g, '年度')
    .replace(/软件著作权证明的演示文本。此材料只用于说明存在对应资料，不证明真实登记或其他资质。/g, '软件著作权证明。')
    .replace(/的演示资料，可查看来源/g, '，可查看来源')
    .replace(/软件著作权演示材料/g, '软件著作权材料')
    .replace(/。演示版未读取内容，请人工核对】/g, '，请人工核对内容】');
  const plain = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
  const text = (value, fallback = '', limit = 20000) => typeof value === 'string' ? value.slice(0, limit) : fallback;
  const id = (value) => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(value) ? value : null;
  const timestamp = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
  const stepNames = ['profile', 'match', 'diagnosis', 'assembly', 'review'];
  const workNames = [...stepNames, 'interpret', 'guidance', 'general'];
  const expertIds = { profile: 'company-assistant', match: 'policy-adviser', interpret:'policy-interpreter', diagnosis: 'application-adviser', assembly: 'material-editor', guidance:'procedure-adviser', review: 'procedure-adviser', general: 'policy-adviser' };
  const statuses = ['ready', 'missing', 'unmet', 'unknown'];
  const taskStatuses = ['needs-input', 'processing', 'review', 'done'];
  const policyExists = (value) => DATA.policies.some((policy) => policy.id === value);
  const freezeVersion = (version) => {
    version.sections.forEach((section) => {
      Object.freeze(section.sourceIds);
      section.sourceQuotes.forEach(Object.freeze);
      Object.freeze(section.sourceQuotes);
      Object.freeze(section);
    });
    Object.freeze(version.sections);
    return Object.freeze(version);
  };

  function normalizeCompany(value) {
    if (!plain(value)) return null;
    const employees = value.employees;
    const revenue = value.revenue;
    return {
      name: text(value.name, '', 300), region: text(value.region, '', 200), industry: text(value.industry, '', 300), established: text(value.established, '', 100),
      employees: typeof employees === 'number' && Number.isFinite(employees) && employees >= 0 ? employees : text(employees, '', 100),
      revenue: typeof revenue === 'number' && Number.isFinite(revenue) && revenue >= 0 ? revenue : (revenue === null ? null : text(revenue, '', 300)),
    };
  }

  const intakeStages = ['fields', 'upload', 'ready', 'confirm', 'blocked'];
  function normalizeIntake(value) {
    if (!plain(value) || !intakeStages.includes(value.stage)) return null;
    const answers = plain(value.answers) ? Object.fromEntries(Object.entries(value.answers).filter(([, answer]) => typeof answer === 'string').map(([key, answer]) => [text(key, '', 50), text(answer, '', 100)])) : {};
    const files = Array.isArray(value.files) ? value.files.filter(file => plain(file) && typeof file.name === 'string').slice(-20).map(file => ({ id: text(file.id, '', 100), name: text(file.name, '', 300), size: Number(file.size) || 0 })) : [];
    return { stage: value.stage, answers, files };
  }

  function normalizeTask(value) {
    if (!plain(value) || !id(value.id) || !policyExists(value.policyId) || !plain(value.steps) || !Array.isArray(value.requirements) || !Array.isArray(value.sources)) return null;
    const company = normalizeCompany(value.company);
    const createdAt = timestamp(value.createdAt);
    const updatedAt = timestamp(value.updatedAt);
    if (!company || !createdAt || !updatedAt || !stepNames.every((name) => typeof value.steps[name] === 'boolean') || value.requirements.length > 100 || value.sources.length > 100) return null;
    const sourceIds = new Set();
    const sources = [];
    for (const source of value.sources) {
      if (!plain(source) || !id(source.id) || sourceIds.has(source.id) || typeof source.provided !== 'boolean') return null;
      sourceIds.add(source.id);
      sources.push({ id: source.id, name: text(source.name, '', 300), text: text(source.text, '', 100000), type: text(source.type, 'document', 100), provided: source.provided, fileName: text(source.fileName, '', 300) });
    }
    const requirementIds = new Set();
    const requirements = [];
    for (const requirement of value.requirements) {
      // 政策清单里的资格条件不再占进度，旧项目读取时去掉。
      if (plain(requirement) && requirement.kind === 'condition' && String(requirement.id).startsWith(`${value.policyId}-`)) continue;
      if (!plain(requirement) || !id(requirement.id) || requirementIds.has(requirement.id) || !statuses.includes(requirement.status) || !['material', 'condition'].includes(requirement.kind)) return null;
      if (requirement.sourceId && !sourceIds.has(requirement.sourceId)) return null;
      requirementIds.add(requirement.id);
      requirements.push({ id: requirement.id, label: text(requirement.label, '', 300), status: requirement.status, kind: requirement.kind, evidence: text(requirement.evidence, '', 10000), sourceId: text(requirement.sourceId, '', 100), action: text(requirement.action, '', 200), required: requirement.required !== false });
    }
    return {
      id: value.id, title: text(value.title, '未命名申报任务', 300), request: text(value.request), company, policyId: value.policyId,
      status: taskStatuses.includes(value.status) ? value.status : 'needs-input',
      steps: Object.fromEntries(stepNames.map((name) => [name, value.steps[name]])), requirements, sources,
      createdAt, updatedAt, notes: text(value.notes),
      ...(normalizeIntake(value.intake) ? { intake: normalizeIntake(value.intake) } : {}),
      ...(value.interpretPolicyId && policyExists(value.interpretPolicyId) ? { interpretPolicyId: value.interpretPolicyId } : {}),
      selectedWorkId: workNames.includes(value.selectedWorkId) ? value.selectedWorkId : 'general',
      messages: Array.isArray(value.messages) ? value.messages.filter(message => plain(message) && ['user', 'assistant'].includes(message.role) && typeof message.text === 'string').slice(-1000).map(message => {
        const workId = workNames.includes(message.workId) ? message.workId : 'general';
        return { role: message.role, text: text(message.text, '', 5000), workId, expertId: id(message.expertId) || expertIds[workId] };
      }) : [],
    };
  }

  function normalizeSections(value, task) {
    if (!Array.isArray(value) || !value.length || value.length > 100) return null;
    const sectionIds = new Set();
    const sourceIds = new Set(task.sources.map((source) => source.id));
    const sections = [];
    for (const section of value) {
      if (!plain(section) || !id(section.id) || sectionIds.has(section.id) || typeof section.body !== 'string' || !Array.isArray(section.sourceIds) || section.sourceIds.length > 100) return null;
      if (section.sourceIds.some((sourceId) => !sourceIds.has(sourceId))) return null;
      sectionIds.add(section.id);
      const quotes = section.sourceQuotes === undefined ? task.sources.filter((source) => section.sourceIds.includes(source.id)) : section.sourceQuotes;
      if (!Array.isArray(quotes) || quotes.length > 100) return null;
      const quoteIds = new Set();
      const sourceQuotes = [];
      for (const quote of quotes) {
        if (!plain(quote) || !id(quote.id) || quoteIds.has(quote.id) || !section.sourceIds.includes(quote.id) || typeof quote.provided !== 'boolean') return null;
        quoteIds.add(quote.id);
        sourceQuotes.push({ id: quote.id, name: text(quote.name, '', 300), text: text(quote.text, '', 100000), type: text(quote.type, 'document', 100), provided: quote.provided });
      }
      if (section.sourceIds.some((sourceId) => !quoteIds.has(sourceId))) return null;
      sections.push({ id: section.id, title: text(section.title, '', 300), body: text(section.body, '', 100000), sourceIds: [...new Set(section.sourceIds)], sourceQuotes });
    }
    return sections;
  }

  function normalizeVersion(value, tasks) {
    if (!plain(value) || !id(value.id) || !id(value.taskId) || !Number.isSafeInteger(value.number) || value.number < 1 || !['draft', 'confirmed'].includes(value.status)) return null;
    const task = tasks.find((item) => item.id === value.taskId);
    const createdAt = timestamp(value.createdAt);
    const sections = task && normalizeSections(value.sections, task);
    if (!task || !createdAt || !sections) return null;
    return freezeVersion({ id: value.id, taskId: value.taskId, policyId: policyExists(value.policyId) ? value.policyId : task.policyId, companyName: text(value.companyName,task.company.name,300), taskTitle: text(value.taskTitle,task.title,300), number: value.number, sections, note: text(value.note), createdAt, status: value.status });
  }

  function seedState() {
    const tasks = DATA.seedTasks.map((task) => normalizeTask(clone(task)));
    return {
      schemaVersion: 1, tasks, versions: DATA.seedVersions.map((version) => normalizeVersion(clone(version), tasks)), activeTaskId: tasks[0]?.id || null,
      draft: '', storageAvailable: true, storageError: '', dirty: false, loadWarning: '',
    };
  }

  let state = seedState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
      if (raw.length > 5000000) throw new Error('保存内容超出可读取范围');
      const value = JSON.parse(cleanLegacyMarks(raw));
      if (!plain(value) || value.schemaVersion !== 1 || !Array.isArray(value.tasks) || value.tasks.length > 500 || !Array.isArray(value.versions) || value.versions.length > 1000) throw new Error('保存内容格式不正确');
      const tasks = value.tasks.map(normalizeTask);
      if (tasks.some((task) => !task) || new Set(tasks.map((task) => task.id)).size !== tasks.length) throw new Error('任务记录校验未通过');
      const versions = value.versions.map((version) => normalizeVersion(version, tasks));
      if (versions.some((version) => !version) || new Set(versions.map((version) => version.id)).size !== versions.length || new Set(versions.map((version) => `${version.taskId}:${version.number}`)).size !== versions.length) throw new Error('材料版本校验未通过');
      state = { ...state, tasks, versions, activeTaskId: tasks.some((task) => task.id === value.activeTaskId) ? value.activeTaskId : tasks[0]?.id || null, draft: text(value.draft) };
    }
  } catch (error) {
    if (error?.name === 'SecurityError' || error?.name === 'InvalidStateError') {
      state.storageAvailable = false;
      state.storageError = '浏览器不允许保存到本机，当前内容仍可在本页使用。';
    } else {
      state.loadWarning = '本机保存的内容未通过校验，当前显示初始记录。';
    }
  }

  function publish() {
    state.dirty = true;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 1, tasks: state.tasks, versions: state.versions, activeTaskId: state.activeTaskId, draft: state.draft }));
      state.storageAvailable = true;
      state.storageError = '';
      state.dirty = false;
    } catch (error) {
      state.storageAvailable = false;
      state.storageError = error?.name === 'QuotaExceededError' ? '本机存储空间不足，最新修改仅保留在当前页面。' : '无法保存到本机，最新修改仅保留在当前页面。';
    }
    subscribers.forEach((subscriber) => {
      try { subscriber(state); } catch (error) { /* 一个视图失败不影响其他订阅者和写入结果。 */ }
    });
  }

  const getTask = (taskId) => state.tasks.find((task) => task.id === taskId) || null;
  let sequence = 0;
  const newId = (prefix) => `${prefix}-${Date.now().toString(36)}-${(++sequence).toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  function createTask(input = {}) {
    if (!plain(input)) return null;
    const task = normalizeTask(DATA.createTaskSeed({ ...input, id: newId('task'), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }));
    if (!task) return null;
    state.tasks = [task, ...state.tasks];
    state.activeTaskId = task.id;
    publish();
    return task;
  }

  function deleteTask(taskId) {
    if (!getTask(taskId)) return false;
    const tasks = state.tasks.filter(task => task.id !== taskId);
    const versions = state.versions.filter(version => version.taskId !== taskId);
    const activeTaskId = state.activeTaskId === taskId ? tasks[0]?.id || null : state.activeTaskId;
    try {
      // 先保存候选快照，失败时保留全部原记录与当前项目。
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({schemaVersion:1,tasks,versions,activeTaskId,draft:state.draft}));
      state = {...state,tasks,versions,activeTaskId,storageAvailable:true,storageError:'',dirty:false};
    } catch {
      state.storageAvailable = false;
      state.storageError = '删除未能保存，项目及其资料仍保留，请重试。';
      subscribers.forEach(subscriber => {try {subscriber(state);} catch {}});
      return false;
    }
    subscribers.forEach(subscriber => {try {subscriber(state);} catch {}});
    return true;
  }

  function updateTask(taskId, patch) {
    const original = getTask(taskId);
    if (!original || !plain(patch)) return false;
    const merged = { ...original };
    ['title', 'request', 'policyId', 'status', 'requirements', 'sources', 'notes', 'messages', 'selectedWorkId', 'intake', 'interpretPolicyId'].forEach((key) => {
      if (Object.hasOwn(patch, key)) merged[key] = patch[key];
    });
    if (Object.hasOwn(patch, 'company')) {
      if (!plain(patch.company)) return false;
      merged.company = { ...original.company, ...patch.company };
    }
    if (Object.hasOwn(patch, 'steps')) {
      if (!plain(patch.steps)) return false;
      merged.steps = { ...original.steps, ...patch.steps };
    }
    merged.updatedAt = new Date().toISOString();
    const updated = normalizeTask(merged);
    if (!updated) return false;
    // 已保存版本的引用仍需可查看，不能通过替换来源数组使历史材料悬空。
    const nextSourceIds = new Set(updated.sources.map((source) => source.id));
    if (state.versions.some((version) => version.taskId === taskId && version.sections.some((section) => section.sourceIds.some((sourceId) => !nextSourceIds.has(sourceId))))) return false;
    state.tasks = state.tasks.map((task) => task.id === taskId ? updated : task);
    publish();
    return true;
  }

  function saveVersion(taskId, sections, note = '') {
    const task = getTask(taskId);
    if (!task) return null;
    const normalized = normalizeSections(sections, task);
    if (!normalized) return null;
    const number = Math.max(0, ...state.versions.filter((version) => version.taskId === taskId).map((version) => version.number)) + 1;
    const version = freezeVersion({ id: newId('version'), taskId, policyId:task.policyId, companyName:task.company.name, taskTitle:task.title, number, sections: normalized, note: text(note), createdAt: new Date().toISOString(), status: 'draft' });
    state.versions = [...state.versions, version];
    publish();
    return version;
  }

  /* 待补标记：【待补】【待补充】【待核对】，以及生成稿写的【待补充：相关内容】。 */
  const pendingMark = /[【\[]待(?:补(?:充)?|核对)(?:[：:][^】\]]*)?[】\]]/;
  const hasPendingMark = (body) => pendingMark.test(String(body || ''));

  function getVersionBlockers(versionId) {
    const version = state.versions.find((item) => item.id === versionId);
    if (!version) return ['尚未保存可核对的材料版本'];
    const task = getTask(version.taskId);
    if (!task) return ['没有找到材料所属项目'];
    const reasons = [];
    if (!task.steps.profile) reasons.push('请先补充企业资料');
    if (!task.steps.match) reasons.push('请先执行政策匹配并选择申报项目');
    if (!task.steps.diagnosis) reasons.push('请先核对申报差距');
    if (version.policyId !== task.policyId) reasons.push('申报项目已变更，请重新组稿并保存新版本');
    if (version.companyName !== task.company.name) reasons.push('企业信息已更新，请重新组稿并保存新版本');
    if (!task.requirements.length) reasons.push('尚未建立材料核对清单');
    task.requirements.filter(requirement => requirement.status !== 'ready' && requirement.required !== false).forEach(requirement => reasons.push(`${requirement.label}尚未补齐或核实`));
    if (!version.sections.length) reasons.push('尚无可确认的材料正文');
    // 只看必填材料齐不齐；材料内容好不好只提示，不拦截。
    if (version.sections.some(section => section.sourceQuotes.some(quote => {
      const current = task.sources.find(source => source.id === quote.id);
      return !current || !current.provided || current.provided !== quote.provided || current.text !== quote.text || current.name !== quote.name || current.type !== quote.type;
    }))) reasons.push('资料已更新，请重新组稿并保存新版本');
    // 生成版本后才传的选填材料，这一版里还没有。
    const included = new Set(version.sections.flatMap(section => section.sourceIds));
    if (task.requirements.some(item => item.kind === 'material' && item.required === false && item.sourceId && !included.has(item.sourceId) && task.sources.some(source => source.id === item.sourceId && source.provided))) reasons.push('资料已更新，请重新组稿并保存新版本');
    return [...new Set(reasons)];
  }

  function confirmVersion(versionId) {
    const version = state.versions.find((item) => item.id === versionId);
    if (!version) return false;
    if (version.status === 'confirmed') return true;
    if (getVersionBlockers(versionId).length) return false;
    state.versions = state.versions.map((item) => item.id === versionId ? freezeVersion({ ...clone(item), status: 'confirmed' }) : item);
    publish();
    return true;
  }

  function confirmationFingerprint(task, version) {
    const value = JSON.stringify([task.company, task.policyId, task.steps, task.requirements, task.sources, version?.id || '', version?.status || '']);
    let hash = 2166136261;
    for (let index = 0; index < value.length; index++) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
    return (hash >>> 0).toString(16);
  }

  function getWorkConfirmation(taskId, workId) {
    const task = getTask(taskId);
    const nextWork = { profile: 'match', match: 'diagnosis', diagnosis: 'assembly', assembly: 'guidance', review: 'guidance' }[workId];
    if (!task || !stepNames.includes(workId)) return { ready: false, reasons: ['没有找到可确认的工作事项'], nextWork: null, versionId: '', fingerprint: '' };
    const version = state.versions.filter(item => item.taskId === taskId).sort((a, b) => b.number - a.number)[0];
    const policy = DATA.policies.find(item => item.id === task.policyId);
    const reasons = [];
    // 地区和行业由企业数据提供，不要求用户填写。
    const profileMissing = [['name', '企业名称']].filter(([key]) => !String(task.company[key] || '').trim());
    if (workId === 'profile') {
      profileMissing.forEach(([, label]) => reasons.push(`请补充${label}`));
      const employees = task.company.employees;
      if (employees !== '' && employees !== null && employees !== undefined && (!Number.isSafeInteger(Number(employees)) || Number(employees) < 0)) reasons.push('员工人数需填写非负整数');
    } else {
      // 企业资料只在最后确认材料时必须齐全，前面的步骤都可以先走。
      // 组稿确认就是最终确认：有版本后按最终要求检查。
      const final = workId === 'review' || (workId === 'assembly' && version);
      if (final && (!task.steps.profile || profileMissing.length)) reasons.push('请先补充企业资料');
      if (!policy) reasons.push('请先选择拟申报政策');
      if (!task.steps.match && !(workId === 'assembly' && policy?.noPolicy && !version)) reasons.push('请先执行政策匹配并选择申报项目');
      if ((workId === 'diagnosis' || final) && !task.steps.diagnosis) reasons.push('请先核对申报差距');
      if (workId === 'diagnosis' && !task.requirements.length) reasons.push('尚未建立材料核对清单');
      if (['assembly', 'review'].includes(workId)) {
        if (!policy?.template) reasons.push('尚未提供申报模板，当前只能整理材料清单');
        if (!version) reasons.push('请先按资料组稿并保存一个材料版本');
        else reasons.push(...getVersionBlockers(version.id));
      }
    }
    return { ready: reasons.length === 0, reasons: [...new Set(reasons)], nextWork, versionId: version?.id || '', fingerprint: confirmationFingerprint(task, version), confirmed: ['assembly', 'review'].includes(workId) && version?.status === 'confirmed' && task.steps.review };
  }

  function confirmWork(taskId, workId, expectedFingerprint = '', expectedVersionId = '') {
    const task = getTask(taskId);
    const result = getWorkConfirmation(taskId, workId);
    if (!task) return { ok: false, ...result };
    if (expectedFingerprint && expectedFingerprint !== result.fingerprint || expectedVersionId && expectedVersionId !== result.versionId) return { ...result, ok: false, reasons: ['当前结果已更新，请重新核对后确认'] };
    if (!result.ready) return { ...result, ok: false };
    if (['assembly', 'review'].includes(workId)) {
      if (!confirmVersion(result.versionId)) return { ...result, ok: false, reasons: getVersionBlockers(result.versionId) };
      if (!task.steps.review || task.status !== 'done') updateTask(taskId, { status: 'done', steps: { assembly: true, review: true } });
    } else if (!task.steps[workId]) {
      updateTask(taskId, { steps: { [workId]: true }, status: workId === 'assembly' ? 'review' : 'processing' });
    }
    return { ...getWorkConfirmation(taskId, workId), ok: true };
  }

  window.PolicyStore = Object.freeze({
    storageKey: STORAGE_KEY,
    getState: () => state,
    getTask,
    subscribe(fn) {
      if (typeof fn !== 'function') return () => {};
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },
    hasPendingMark, createTask, deleteTask, updateTask, saveVersion, confirmVersion, getVersionBlockers, getWorkConfirmation, confirmWork,
    saveTaskDraft(value) {
      if (typeof value !== 'string') return false;
      state.draft = text(value);
      publish();
      return true;
    },
    getTaskDraft: () => state.draft,
    setActiveTask(taskId) {
      if (!getTask(taskId)) return false;
      state.activeTaskId = taskId;
      publish();
      return true;
    },
  });
})();
