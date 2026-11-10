/* 页面只负责呈现；写入与导航由 app.js 统一处理。企业与政策数据为演示案例。 */
(() => {
  'use strict';
  const E = (value = '') => window.PolicyUI?.escape ? window.PolicyUI.escape(String(value ?? '')) : String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const I = (name) => window.PolicyUI?.icon ? window.PolicyUI.icon(name) : '';
  const D = () => window.PolicyData;
  const S = () => window.PolicyStore;
  const persona = (key) => window.PolicyPersonas.get(key);
  const steps = [['profile', '企业档案', 'profile'], ['match', '政策匹配', 'policy'], ['diagnosis', '差距诊断', 'diagnosis'], ['assembly', '材料组稿', 'assembly'], ['review', '人工确认', 'assembly']];
  const statusLabels = { ready: '资料已具备', missing: '缺少资料', unmet: '条件未满足', unknown: '待核实' };
  const statusClasses = { ready: 'tag-success', missing: 'tag-warn', unmet: 'tag-warn', unknown: 'tag-muted' };
  const route = (name, label, taskId = '', policyId = '', style = 'button button-secondary') => `<button type="button" class="${style}" data-route="${E(name)}"${taskId ? ` data-task="${E(taskId)}"` : ''}${policyId ? ` data-id="${E(policyId)}"` : ''}>${E(label)}</button>`;
  const action = (name, label, taskId = '', itemId = '', style = 'button button-secondary') => `<button type="button" class="${style}" data-action="${E(name)}"${taskId ? ` data-task="${E(taskId)}"` : ''}${itemId ? ` data-id="${E(itemId)}"` : ''}>${E(label)}</button>`;
  const avatar = (key) => {
    const person = persona(key);
    return `<span class="role-avatar" aria-hidden="true" data-avatar-index="${person.index}" style="--portrait-x:${person.x}%;--portrait-y:${person.y}%;background-image:url('${person.asset}');background-size:${window.PolicyPersonas.atlas.backgroundSize}"></span>`;
  };
  const stats = (task) => {
    const ready = task.requirements.filter((item) => item.status === 'ready').length;
    return { ready, total: task.requirements.length, gap: task.requirements.length - ready, completed: steps.filter(([key]) => task.steps[key]).length, percent: task.requirements.length ? Math.round(ready / task.requirements.length * 100) : 0 };
  };
  const getPolicy = (id) => D().policies.find((item) => item.id === id);
  const activeTask = () => S().getTask(S().getState().activeTaskId) || S().getState().tasks[0] || null;
  const header = (title, description = '', buttons = '') => `<header class="page-header"><div><h1>${E(title)}</h1>${description ? `<p class="muted">${E(description)}</p>` : ''}</div>${buttons ? `<div class="page-actions">${buttons}</div>` : ''}</header>`;
  const notFound = () => `${header('没有找到这个项目')}<div class="empty-state"><p class="muted">返回首页选择一个项目继续。</p>${route('dashboard', '返回首页')}</div>`;
  const missingSummary = (task) => {
    const missing = task.requirements.filter((item) => item.status === 'missing');
    const unknown = task.requirements.filter((item) => item.status === 'unknown');
    const unmet = task.requirements.filter((item) => item.status === 'unmet');
    return [missing.length ? `还缺 ${missing.length} 项资料` : '', unknown.length ? `${unknown.length} 项待核实` : '', unmet.length ? `${unmet.length} 项条件需处理` : ''].filter(Boolean).join('，') || '清单资料已具备，可核对草稿与来源';
  };
  const workflowState = (task) => task.steps.review || task.status === 'done' ? 'done' : task.steps.assembly || task.status === 'review' ? 'review' : task.status === 'processing' ? 'processing' : stats(task).gap > 0 ? 'needs-input' : 'processing';
  const nextRoute = (task) => !task.steps.profile ? 'profile' : !task.steps.match ? 'policy' : !task.steps.diagnosis || stats(task).gap ? 'diagnosis' : 'assembly';
  const progress = (task, className = '') => {
    const count = stats(task).completed;
    return `<div class="step-progress ${className}"><span>已完成 ${count}/5 步</span><progress value="${count}" max="5" aria-label="任务处理进度：已完成 ${count} 步，共 5 步"></progress></div>`;
  };
  const sourceRow = (source, taskId) => `<div class="source-row"><div>${I('file')}<span>${E(source.name)}</span><span class="tag ${source.provided ? 'tag-success' : 'tag-muted'}">${source.provided ? '已提供' : '未提供'}</span></div>${action('view-source', source.provided ? '查看来源' : '录入资料', taskId, source.id, 'text-button')}</div>`;
  const field = (label, name, value = '', options = {}) => `<label class="form-field" for="field-${E(name)}"><span>${E(label)}${options.required ? '<span aria-hidden="true"> *</span>' : ''}</span><input id="field-${E(name)}" name="${E(name)}" type="${E(options.type || 'text')}" maxlength="${options.max || 200}" value="${E(value)}"${options.required ? ' required' : ''}${options.placeholder ? ` placeholder="${E(options.placeholder)}"` : ''}${options.type === 'number' ? ' min="0" step="1"' : ''}></label>`;

  const startExperts = [
    ['profile','企业资料','理清企业情况','理清企业情况'],
    ['search','政策匹配','找到适用政策','找到适用政策'],
    ['interpret','条件解读','讲清申报要求','看懂申报条件'],
    ['diagnosis','差距诊断','找出缺口与建议','查出还缺什么'],
    ['assembly','材料组稿','整理资料与版本','整理申报材料'],
    ['guidance','办理指引','核对提交与办理','弄清怎么办理'],
  ];
  function companyStartForm(service) {
    return `<form id="company-start-form" class="company-start-form" data-service="${E(service)}"><label for="start-company-name">只需告诉我企业名称</label><input id="start-company-name" name="companyName" type="text" maxlength="300" required autocomplete="organization" placeholder="请输入企业全称" value="${E(window.PolicyUI.getCompanyDraft(service))}"><button type="submit" class="button button-primary">立即申报 ${I('arrow')}</button></form>`;
  }
  const startSteps = [
    ['interpret','政策匹配','找到适合我的政策','按企业情况筛选可申报政策','step-match'],
    ['interpret','条件解读','看懂申报条件','逐条讲清要求和依据','step-read'],
    ['interpret','差距诊断','知道还缺什么','对照条件，列出缺口和建议','step-gap'],
    ['assembly','材料组稿','整理申报材料','解析原文，给出润色建议','step-compose'],
    ['guidance','办理指引','弄清怎么办理','讲清提交步骤和截止时间','step-submit'],
  ];
  function startHome() {
    const steps = startSteps.map(([work,label,title,description,iconName],index) => `<li class="start-step"><div class="start-step-head"><span class="start-step-number">${String(index+1).padStart(2,'0')}</span><span>${E(label)}</span>${index<startSteps.length-1?`<span class="start-step-arrow" aria-hidden="true">${I('arrow')}</span>`:''}</div><button type="button" class="start-step-card" data-action="${work ? 'home-start-expert' : 'home-start-focus'}"${work ? ` data-work="${work}"` : ''} aria-label="${E(title)}，${E(description)}"><span class="start-step-icon" aria-hidden="true">${I(iconName)}</span><strong>${E(title)}</strong><span class="start-step-desc">${E(description)}</span><span class="start-step-cta" aria-hidden="true">${I('arrow')}</span></button></li>`).join('');
    return `<div class="start-home"><section class="start-hero" aria-label="开始企业政策申报"><form id="company-start-form" class="start-hero-form" data-work="match"><h1><label for="start-company-name">告诉我企业名称，为您匹配惠企政策</label></h1><p>建立企业画像，匹配适用政策，辅助材料撰写，引导政策申报</p><div class="start-hero-field"><input id="start-company-name" name="companyName" type="text" maxlength="300" required autocomplete="organization" placeholder="请输入企业全称" value="${E(window.PolicyUI.getCompanyDraft(''))}"><button type="submit" class="button button-primary start-hero-go" aria-label="开始申报" title="开始申报">${I('arrow')}</button></div>${window.PolicyMatch?.homeIntakeMarkup() || ''}</form></section><section class="start-steps" aria-labelledby="start-steps-heading"><header><h2 id="start-steps-heading">从找政策到备材料，一站完成申报准备</h2></header><ol>${steps}</ol></section></div>`;
  }
  function homeStartForm() {
    return `<form id="company-start-form" class="home-start-form"><h1 data-rise><label for="start-company-name">只需企业名称，<wbr>帮您找到能申报的政策</label></h1><div class="home-start-field" data-rise style="--i:1"><input id="start-company-name" name="companyName" type="text" maxlength="300" required autocomplete="organization" placeholder="请输入企业全称，如：XX有限公司" value="${E(window.PolicyUI.getCompanyDraft(''))}"><button type="submit" class="button button-primary">立即匹配政策 ${I('arrow')}</button></div></form>`;
  }
  function dashboard() {
    const cards = startExperts.map(([key,stage,result,goal],index) => {
      const person=persona(key);
      return `<li class="start-expert-card" data-service="${key}" data-rise style="--i:${index}"><button type="button" class="start-expert-body" data-action="home-expert" data-service="${key}" aria-label="${E(goal)}，立即召唤${E(person.name)}"><span class="start-expert-copy"><span class="start-expert-step"><span class="start-expert-number">${String(index+1).padStart(2,'0')}</span><span>${stage}</span></span><h2>${E(goal.slice(0,2))}<wbr>${E(goal.slice(2))}</h2><span class="start-expert-name">${E(person.name)}</span><span class="start-expert-cta">立即召唤 ${I('arrow')}</span></span><span class="start-expert-portrait" aria-hidden="true"><img src="assets/home/expert-${person.index}.webp" alt="" width="512" height="512" loading="lazy"></span></button></li>`;
    }).join('');
    return `<div class="company-start-page">${window.PolicyHomeFeed?.renderTicker() || ''}<section class="home-start" aria-label="开始企业政策申报">${homeStartForm()}</section><section class="home-experts" aria-labelledby="home-experts-heading"><div class="home-experts-heading" data-rise><h2 id="home-experts-heading">每一步，<wbr>都有专家帮<span data-home-name>你</span></h2></div><ol class="start-expert-row">${cards}</ol></section>${window.PolicyHomeFeed?.renderCases() || ''}<section class="home-closing home-bleed" aria-labelledby="home-closing-heading"><h2 id="home-closing-heading" data-rise><span>看看你的企业</span><span>能申报什么</span></h2><div class="home-closing-foot" data-rise><p>现在只需要企业名称。</p><button type="button" class="button button-primary" data-action="home-start-focus">填写企业名称 ${I('arrow')}</button></div></section></div>`;
  }
  function expertEntry(service) {
    const selected=startExperts.find(([key])=>key===service) || startExperts[0];
    const [key,stage,result]=selected;
    const person=persona(key);
    return `<section class="expert-entry-page"><header class="expert-entry-top"><button class="text-button expert-entry-back" type="button" data-route="dashboard">${I('arrow')} 返回惠企政策</button><span>${stage}</span></header><div class="expert-entry-conversation"><header><span class="role-avatar" aria-hidden="true" style="--portrait-x:${person.x}%;--portrait-y:${person.y}%"></span><div><h1>${E(person.name)}</h1><p>${result}</p></div></header><div class="expert-entry-message"><span class="role-avatar" aria-hidden="true" style="--portrait-x:${person.x}%;--portrait-y:${person.y}%"></span><div><span>${E(person.name)}</span><p>我可以帮你${result}。先告诉我企业名称，我们从这家企业开始。</p></div></div>${companyStartForm(key)}</div></section>`;
  }

  function newTask({ intent = '' } = {}) {
    const prompts = ['帮我查找适合企业的研发创新政策，先核对申报条件。', '看看现有企业资料还缺什么，整理一份申报准备清单。', '按已有政策模板整理材料，缺少的信息保留待补。'];
    return `<div class="new-task-layout"><div class="new-task-intro"><div class="start-work-visual"><img src="assets/start-work-ring.png" alt="" width="612" height="367"></div><h1>这次想申报什么？</h1></div><form id="new-task-form" class="new-task-form"><input type="hidden" name="intent" value="${E(intent)}"><div class="task-composer"><label class="form-field request-field" for="task-request"><span class="sr-only">申报目标</span><textarea id="task-request" name="request" rows="5" maxlength="5000" required placeholder="告诉我企业想申请的支持，或先帮你找找适合的政策……">${E(S().getTaskDraft())}</textarea></label><div class="prompt-examples"><h2>从一个具体问题开始</h2>${prompts.map((prompt, index) => `<button type="button" class="prompt-card" data-action="prompt-fill" data-prompt="${E(prompt)}"><span>${['查找适用政策', '诊断申报差距', '已有材料组稿'][index]}</span>${I('arrow')}</button>`).join('')}</div></div><div class="form-grid">${field('企业名称', 'companyName', '', { required: true, placeholder: '填写企业名称', max: 300 })}${field('所在地区', 'region', '杭州市', { required: true, max: 100 })}${field('所属行业', 'industry', '', { required: true, placeholder: '例如：软件与信息服务', max: 200 })}</div><div class="form-actions"><span class="muted">企业资料可在下一步补充。</span><button type="submit" class="button button-primary">创建任务 ${I('arrow')}</button></div></form></div>`;
  }

  function services({ type = 'services', query = '' } = {}) {
    const teamMode = ['teams', 'team', 'plans'].includes(type);
    const current = activeTask();
    const needle = query.trim().toLocaleLowerCase();
    const items = (teamMode ? D().teams : D().services).filter((item) => `${item.title} ${item.description} ${item.tags.join(' ')}`.toLocaleLowerCase().includes(needle));
    const toolbar = `<div class="services-toolbar"><div class="service-tabs" role="group" aria-label="服务类型">${action('service-tab', '单项能力', '', 'services', `service-tab${!teamMode ? ' is-active' : ''}`)}${action('service-tab', '申报协作方案', '', 'teams', `service-tab${teamMode ? ' is-active' : ''}`)}</div><form id="services-search-form" role="search" data-type="${teamMode ? 'teams' : 'services'}"><label for="service-search" class="sr-only">搜索政策服务</label><input type="search" id="service-search" name="query" maxlength="100" value="${E(query)}" placeholder="搜索能力或用途"><button type="submit" class="button button-secondary">搜索</button></form></div>`;
    const cards = items.map((item) => {
      return `<article class="service-card">${teamMode ? `<div class="team-avatar-stack">${item.serviceIds.slice(0, 3).map((serviceId) => avatar(serviceId)).join('')}</div>` : avatar(item.id)}<h2>${E(item.title)}</h2><p class="service-description">${E(item.description)}</p>${teamMode ? `<ol class="team-sequence">${item.serviceIds.map((serviceId) => `<li>${E(D().services.find((service) => service.id === serviceId)?.title || serviceId)}</li>`).join('')}</ol>` : ''}<p class="service-output"><span class="muted">产出</span>${E(item.output)}</p><div class="service-card-footer"><div class="service-tags">${item.tags.map((tag) => `<span class="tag tag-muted">${E(tag)}</span>`).join('')}</div>${action(teamMode ? 'team-use' : 'service-use', '使用', current?.id || '', item.id, 'button button-primary')}</div></article>`;
    }).join('');
    return `${header('政策服务')}${toolbar}<div class="services-grid">${cards || '<div class="empty-state"><h2>没有找到相关服务</h2><p class="muted">换个关键词试试。</p></div>'}</div>`;
  }

  function task(taskId) {
    const current = S().getTask(taskId);
    if (!current) return notFound();
    const count = stats(current);
    const selectedPolicy = getPolicy(current.policyId);
    const versions = S().getState().versions.filter((version) => version.taskId === current.id);
    return `${header(current.title, current.company.name || '企业信息待填写', route('dashboard', '返回首页'))}<ol class="task-stepper" aria-label="任务步骤">${steps.map(([key, label, destination], index) => `<li class="${current.steps[key] ? 'is-complete' : ''}"><button type="button" data-route="${destination}" data-task="${E(current.id)}"><span class="step-number">${current.steps[key] ? I('check') : index + 1}</span><span>${label}</span><small>${current.steps[key] ? '已完成' : '待处理'}</small></button></li>`).join('')}</ol><div class="task-overview"><section class="content-panel"><h2>下一步</h2><p class="next-action-text">${E(missingSummary(current))}</p>${progress(current)}${route(nextRoute(current), '继续处理', current.id, '', 'button button-primary')}</section><section class="content-panel"><h2>项目概要</h2><dl class="summary-list"><div><dt>企业地区</dt><dd>${E(current.company.region || '待填写')}</dd></div><div><dt>准备情况</dt><dd>已具备 ${count.ready}/${count.total} 项</dd></div><div><dt>申报项目</dt><dd>${current.steps.match ? E(selectedPolicy?.title || '待选择') : '待检索与选择'}</dd></div><div><dt>材料版本</dt><dd>${versions.length ? `${versions.length} 个版本` : '尚未保存'}</dd></div></dl></section></div><section class="task-results"><div class="section-heading"><h2>项目资料与结果</h2></div><div class="result-links">${[['profile', '企业档案', '核对基本信息与资料来源'], ['policy', '政策条件', '查看适用范围与材料要求'], ['diagnosis', '差距诊断', '区分资料缺失与待核实条件'], ['assembly', '材料组稿', '按模板整理并保存版本'], ['guidance', '办理指引', '检查后续办理步骤']].map(([destination, title, description]) => `<button type="button" class="result-link" data-route="${destination}" data-task="${E(current.id)}"><span>${title}</span><small>${description}</small>${I('arrow')}</button>`).join('')}</div></section>`;
  }


  function policy(taskId, policyId) {
    const current = S().getTask(taskId);
    if (!current) return notFound();
    if (policyId) {
      const item = getPolicy(policyId);
      if (!item) return notFound();
      const publicDetail = window.PolicyMatch?.policyDetail(current, item.id);
      if (publicDetail) return `${header(item.title)}${publicDetail}`;
      return `${header(item.title, `${item.agency} · ${item.region}`, route('policy', '返回候选项目', current.id))}<div class="policy-detail-grid"><section class="content-panel"><h2>项目解读</h2><p class="policy-summary">${E(item.summary)}</p><dl class="summary-list"><div><dt>申报时间</dt><dd>${E(item.deadline)}</dd></div><div><dt>资料来源</dt><dd>${E(item.sourceLabel)}</dd></div><div><dt>申报模板</dt><dd>${item.genericTemplate ? '通用模板，章节不是按政策原文整理' : item.template ? '已配置模板' : '暂未配置，提供清单与填写指引'}</dd></div></dl><h2>适用条件</h2><ol class="reading-list">${item.conditions.map((condition) => `<li>${E(condition)}</li>`).join('')}</ol><h2>材料要求</h2><ul class="material-list">${item.materials.map((material) => `<li>${E(material)}</li>`).join('')}</ul></section><aside class="content-panel policy-side">${action('choose-policy', '选用这个项目', current.id, item.id, 'button button-primary')}${route('diagnosis', '查看企业差距', current.id, '', 'text-button')}</aside></div>`;
    }
    const pageHeader = header('检索与匹配政策', current.company.name || '企业档案待填写', route('task', '返回项目', current.id));
    if (!current.steps.profile) return `${pageHeader}<section class="empty-state"><h2>先确认企业档案</h2><p class="muted">地区与行业信息用于筛选候选项目。</p>${route('profile', '核对企业档案', current.id, '', 'button button-primary')}</section>`;
    if (!current.steps.match) return `${pageHeader}<section class="content-panel match-intro"><h2>根据企业信息查找候选项目</h2><p class="muted">${E(current.company.region)} · ${E(current.company.industry)}</p>${action('run-match', '查找政策', current.id, '', 'button button-primary')}</section>`;
    const region = current.company.region.trim();
    const matches = region ? D().policies.filter((item) => !item.public || item.id === current.policyId).filter((item) => item.region === region || region.includes(item.region) || (item.region === '浙江省' && /杭州|浙江/.test(region))) : [];
    return `${pageHeader}<div class="section-heading"><p class="muted">按企业地区筛选 · ${matches.length} 个候选项目</p>${action('run-match', '重新检索', current.id, '', 'text-button')}</div><div class="policy-list">${matches.length ? matches.map((item) => `<article class="policy-card"><div class="policy-card-head"><span class="tag tag-muted">${E(item.region)}</span>${current.policyId === item.id ? '<span class="tag tag-success">当前项目</span>' : ''}</div><h2>${E(item.title)}</h2><p>${E(item.summary)}</p><p class="muted">${E(item.sourceLabel)} · ${item.template ? '有组稿模板' : '暂无组稿模板'}</p><div class="policy-reasons"><h3>匹配依据</h3><ul><li>企业注册地区为${E(current.company.region)}，在这项政策的范围内。</li><li>${current.sources.some((source) => source.id === 'research-project' && source.provided) ? '已有研发项目资料，可继续对照具体条件。' : '研发、财务等条件仍需根据资料核实。'}</li></ul></div>${route('policy', '查看条件与解读', current.id, item.id, 'button button-secondary')}</article>`).join('') : `<div class="empty-state"><h2>当前地区暂无候选项目</h2><p class="muted">可以核对企业地区后再试。</p>${route('profile', '核对企业档案', current.id)}</div>`}</div>`;
  }

  function guidance(taskId) {
    const current = S().getTask(taskId);
    if (!current) return notFound();
    const detail = window.PolicyMatch?.guidanceDetail(current);
    if (detail) return detail;
    const count = stats(current);
    const pending = [!current.steps.profile ? '确认企业基本信息' : '', !current.steps.match ? '核对适用政策及正式办理要求' : '', count.gap ? `处理 ${count.gap} 项资料或条件缺口` : '', !current.steps.assembly ? '按模板整理并保存材料版本' : '', !current.steps.review ? '人工核对并确认材料版本' : ''].filter(Boolean);
    return `${header('办理指引', current.title, route('task', '返回项目', current.id))}<section class="content-panel"><h2>提交前的三件事</h2><ol class="guidance-steps"><li><span class="step-number">1</span><div><h3>核实正式政策与窗口</h3><p>核对主管部门发布的政策原文、申报期限和受理渠道。请到主管部门指定的官方渠道办理。</p>${route('policy', '回看项目条件', current.id, current.policyId, 'text-button')}</div></li><li><span class="step-number">2</span><div><h3>检查材料与授权</h3><p>核对企业名称、证明材料、签字盖章与附件要求，确保所用资料为当前有效版本。</p>${route('diagnosis', '检查准备清单', current.id, '', 'text-button')}</div></li><li><span class="step-number">3</span><div><h3>确认版本，再按官方渠道办理</h3><p>由企业相关负责人核对最终材料并提交，保留受理凭证。这里不会发起真实申报。</p>${route('assembly', '查看材料版本', current.id, '', 'text-button')}</div></li></ol></section><section class="content-panel pending-checklist"><h2>${pending.length ? '当前待完成' : '本平台材料准备已确认'}</h2>${pending.length ? `<ul class="reading-list">${pending.map((entry) => `<li>${E(entry)}</li>`).join('')}</ul>` : '<p class="muted">后续仍需按正式政策要求核对和办理，材料确认不代表政府受理或审核通过。</p>'}</section>`;
  }

  window.PolicyViews = Object.freeze({ startHome, dashboard, expertEntry, newTask, services, task, policy, guidance });
})();
