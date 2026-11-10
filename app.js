/* 路由、表单和演示操作。没有真实政策检索、AI调用或政府申报请求。 */
(() => {
  'use strict';
  const S = window.PolicyStore;
  const D = window.PolicyData;
  const V = window.PolicyViews;
  const M = window.PolicyMaterials;
  const W = window.PolicyWorkspace;
  const B = window.PolicyBatch;
  const page = document.querySelector('#page-content');
  const formDrafts = new Map();
  const documentPositions = new Map();
  const indexPositions = new Map();
  let confirmationFocus = null;
  let companyStartDraft = '';
  const startDraft = {files:[],question:''};
  const expertCompanyDrafts = new Map();
  const serviceWork = {profile:'profile',search:'match',interpret:'interpret',diagnosis:'diagnosis',assembly:'assembly',guidance:'guidance'};
  const validService = value => Object.hasOwn(serviceWork,value) ? value : 'profile';
  const serviceForWork = work => Object.keys(serviceWork).find(key=>serviceWork[key]===work) || 'profile';
  function draftKey(form) {
    return form && form.id === 'source-form'
      ? `${form.dataset.task}:${form.id}:${form.dataset.source || ''}` : '';
  }
  function captureFormDraft() {
    const form=page.querySelector('#source-form');
    const key=draftKey(form);
    if (!key || !S.getTask(form.dataset.task) || form.dataset.draftSaved) return;
    const fields=[...form.elements].filter(input=>input.name && 'value' in input);
    if (!formDrafts.has(key) && !fields.some(input=>input.value !== input.defaultValue)) return;
    formDrafts.set(key,Object.fromEntries(fields.map(input=>[input.name,input.value])));
  }
  function restoreFormDraft() {
    const form=page.querySelector('#source-form');
    const values=formDrafts.get(draftKey(form));
    if (!values) return;
    Object.entries(values).forEach(([name,value])=>{const input=form.elements.namedItem(name);if(input && 'value' in input)input.value=value;});
  }
  function discardFormDraft(form) {
    const key=draftKey(form);
    if(key){formDrafts.delete(key);form.dataset.draftSaved='true';}
  }
  function getPendingDraft(taskId) {
    const task=S.getTask(taskId);
    if(!task)return null;
    for(const [key,values] of formDrafts){
      if(!key.startsWith(`${taskId}:`))continue;
      const [,formId,sourceId]=key.split(':');
      const original={text:task.sources.find(source=>source.id===sourceId)?.text || ''};
      const dirty=Object.entries(values).some(([name,value])=>String(value)!==String(original[name] ?? ''));
      if(!dirty)continue;
      return {reason:'原始资料有未保存的修改，请先保存后再确认。',route:'source',params:{task:taskId,id:sourceId}};
    }
    if(M.hasUnsavedDraft?.(taskId))return {reason:'申报材料有未保存的修改，请先保存新版本。',route:'assembly',params:{task:taskId}};
    return null;
  }
  function forgetProject(taskId) {
    for (const map of [formDrafts,documentPositions]) {
      for (const key of map.keys()) if(key.startsWith(`${taskId}:`)) map.delete(key);
    }
    indexPositions.delete(taskId);
    window.PolicyChat.forgetTask(taskId);
    M.forgetTask(taskId);
    W.leave(taskId);
  }
  const documentKey = (taskId,route,params={}) => `${taskId}:${route}:${params.policy || params.id || ''}:${params.left || ''}:${params.right || ''}`;
  function syncExpertControls() {
    const nav=page.querySelector('.workspace-status-grid');
    if (!nav) return;
    const max=Math.max(0,nav.scrollWidth-nav.clientWidth);
    page.querySelectorAll('.expert-scroll-control').forEach(button=>{
      button.hidden=max <= 1;
      button.disabled=Number(button.dataset.direction)<0 ? nav.scrollLeft <= 1 : nav.scrollLeft >= max-1;
    });
  }
  const paths = {
    plus:'M12 5v14M5 12h14', grid:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
    layers:'m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5', folder:'M3 7V5h6l2 2h10v13H3V7Z',
    file:'M14 3H5v18h14V8l-5-5ZM14 3v6h5M8 13h8M8 17h6', check:'m5 12 4 4L19 6',
    arrow:'M5 12h14m-5-5 5 5-5 5', search:'m16 16 5 5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
    building:'M5 21V3h14v18M2 21h20M9 7h1m4 0h1M9 11h1m4 0h1M10 21v-5h4v5',
    book:'M12 5C9 3 5 3 2 4v15c3-1 7-1 10 1m0-15c3-2 7-2 10-1v15c-3-1-7-1-10 1V5Z',
    route:'M5 4h14v5H5zM12 9v6M4 20h16M4 20v-5h16v5M12 15v5',
    menu:'M4 6h16M4 12h16M4 18h16', close:'m6 6 12 12M6 18 18 6', clock:'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
    download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5', alert:'M12 8v5m0 4h.01M12 3 2 21h20L12 3Z',
    trash:'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7',
    'step-match':'M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14Zm5-2 5 5M8 11l2 2 4-4',
    'step-read':'M12 6C10 4.5 7 4 3 4v15c4 0 7 .5 9 2 2-1.5 5-2 9-2V4c-4 0-7 .5-9 2Zm0 0v15M6.5 9H9m-2.5 4H9m6-4h2.5M15 13h2.5',
    'step-gap':'M9 3.5h6v3H9zM9 5H5.5v15.5h13V5H15M8.5 12l1.5 1.5 2.5-2.5M8.5 17h7M15 11.5h.01',
    'step-compose':'M12 21H5V3h8l5 5v3M13 3v5h5M8 12h4.5M8 16h2.5M13.5 21l.7-2.8 5-5 2.1 2.1-5 5-2.8.7Z',
    'step-submit':'M21 3 3 10.5l7 3 3 7.5L21 3ZM10 13.5 21 3',
    'step-score':'M3.5 18a9.5 9.5 0 1 1 17 0M12 15.5l4.5-5.5M12 15.5h.01',
    'step-shield':'M12 3l7.5 3v5.5c0 4.8-3.2 8-7.5 9.5-4.3-1.5-7.5-4.7-7.5-9.5V6L12 3ZM8.8 12l2.2 2.2 4.2-4.4',
    clip:'m21 11-9 9a6 6 0 0 1-8.5-8.5l9-9a4 4 0 0 1 5.7 5.7l-9 9a2 2 0 0 1-2.9-2.9l8.3-8.3',
    upload:'M12 16V4m-5 5 5-5 5 5M4 15v5h16v-5',
    chevron:'m9 6 6 6-6 6',
    refresh:'M20 11a8 8 0 0 0-14.3-4.3L3 9.5M3 4v5.5h5.5M4 13a8 8 0 0 0 14.3 4.3l2.7-2.8M21 20v-5.5h-5.5',
    spark:'M11 3l1.9 5.6 5.6 1.9-5.6 1.9L11 18l-1.9-5.6-5.6-1.9 5.6-1.9L11 3ZM18.5 15l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9.9-2.6Z',
  };
  const escape = (value = '') => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const icon = (name) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name] || paths.file}"/></svg>`;
  let toastTimer;
  function toast(message) {
    const target = document.querySelector('#toast');
    clearTimeout(toastTimer);
    target.textContent = message;
    target.hidden = false;
    toastTimer = setTimeout(() => { target.hidden = true; }, 5200);
  }
  // 示例内容写成当前企业，不带入别家公司的名称。
  const sampleFor = (task,text) => String(text).replaceAll('杭州澄川数字科技有限公司',task.company.name || '本企业').replaceAll('注册地区：杭州市',`注册地区：${task.company.region || '待补充'}`).replaceAll('澄川协同管理软件','协同管理软件');
  function runDiagnosis(task) {
    const requirements = task.requirements.map(item => {
      if (item.kind !== 'material' || item.status === 'unmet') return item;
      const source = task.sources.find(source=>source.id === item.sourceId);
      return {...item,status:source?.provided && source.text.trim() ? 'ready':'missing',evidence:source?.provided && source.text.trim() ? '已提供资料，可继续核对正文与有效性。':'未提供对应证明材料，暂不能判断条件是否满足。'};
    });
    return S.updateTask(task.id,{requirements,steps:{diagnosis:true},status:requirements.some(item=>item.status !== 'ready' && item.required !== false) ? 'needs-input':'processing'});
  }
  const allowedRoutes = new Set(['dashboard','home-classic','batch','expert','new','services','library','task','profile','policy','diagnosis','assembly','guidance','version','compare','source']);
  function currentRoute() {
    const [route, raw = ''] = location.hash.slice(1).split('?');
    return { route: allowedRoutes.has(route) ? route : 'dashboard', params: Object.fromEntries(new URLSearchParams(raw)) };
  }
  function closeMenu() {
    document.body.classList.remove('menu-open');
    document.querySelector('.sidebar-backdrop').hidden = true;
    document.querySelector('[data-action="open-menu"]').setAttribute('aria-expanded','false');
  }
  // 企业资料和差距诊断都只在员工对话里处理，旧入口统一回到对话。
  function navigate(route, params = {}) {
    if (route === 'profile' || route === 'diagnosis') {
      const taskId=params.task || params.id || S.getState().activeTaskId;
      navigate(S.getTask(taskId) ? 'task' : 'dashboard',S.getTask(taskId) ? {task:taskId,work:route} : {});
      return;
    }
    if (!allowedRoutes.has(route)) return;
    const query = new URLSearchParams(Object.entries(params).filter(([,value]) => value !== undefined && value !== null && value !== ''));
    const hash = `${route}${query.size ? '?' + query : ''}`;
    closeMenu();
    if (location.hash.slice(1) === hash) render();
    else location.hash = hash;
  }
  function advanceWork(taskId, workId) {
    if (!S.getTask(taskId) || !['profile','match','diagnosis','assembly','review','guidance'].includes(workId)) return;
    confirmationFocus = { taskId, workId };
    navigate('task', { task: taskId, work: workId });
  }
  function sidebar() {
    const state = S.getState();
    const {route,params} = currentRoute();
    const researcher = B.getRole() === 'researcher';
    document.querySelector('#user-type').value = B.getRole();
    document.querySelector('[data-nav="batch"]').hidden = !researcher;
    document.querySelector('.demo-identity strong').textContent = researcher ? '政策研究工作空间' : '企业服务空间';
    document.querySelectorAll('[data-nav]').forEach(link => {
      const startWork = route === 'dashboard' && ['interpret','assembly','guidance'].includes(params.work) ? params.work : '';
      const active = startWork ? link.dataset.nav === startWork : link.dataset.nav === route || link.dataset.nav === 'library' && ['assembly','version','compare'].includes(route);
      link.classList.toggle('is-active',active);
      if (active) link.setAttribute('aria-current','page'); else link.removeAttribute('aria-current');
    });
    const projectRoute = ['task','profile','policy','diagnosis','assembly','guidance','version','compare','source'].includes(route) || route==='expert' && Boolean(params.task && S.getTask(params.task));
    document.querySelector('#recent-projects').innerHTML = state.tasks.map(task => `<div class="recent-project-row"><button class="recent-project${projectRoute && state.activeTaskId === task.id ? ' is-active' : ''}" data-route="task" data-task="${escape(task.id)}"${projectRoute && state.activeTaskId === task.id ? ' aria-current="page"' : ''} title="${escape(task.title)}">${escape(task.title)}</button><button type="button" class="icon-button project-delete" data-action="delete-project" data-task="${escape(task.id)}" aria-label="删除项目：${escape(task.title)}" title="删除项目">${icon('trash')}</button></div>`).join('');
    document.querySelector('#storage-status').textContent = state.storageError || state.loadWarning || '';
  }
  function renderSource(taskId, sourceId) {
    const task = S.getTask(taskId);
    const source = task?.sources.find(item => item.id === sourceId);
    if (!source) return '<div class="empty-state"><h1>没有找到这份资料</h1><button class="button button-secondary" data-route="dashboard">返回首页</button></div>';
    return `<div class="source-page"><header class="page-header"><div><h1>${escape(source.name)}</h1><p class="muted">${escape(task.company.name)}</p></div><button class="button button-secondary" data-route="profile" data-task="${escape(task.id)}">返回企业档案</button></header><p class="source-context">${source.provided ? '当前资料已用于准备清单。修改后请重新核对材料；历史版本的引用保持原样。' : '录入这份资料的内容，保存后会更新对应的准备项。'}</p><form id="source-form" data-task="${escape(task.id)}" data-source="${escape(source.id)}"><label class="form-field" for="source-text" style="margin-top:26px"><span>资料内容</span></label><textarea id="source-text" name="text" class="source-editor" maxlength="40000" required placeholder="粘贴已确认的资料内容……">${escape(source.text)}</textarea><div class="form-actions source-form-actions"><button type="submit" class="button button-primary">保存资料</button></div></form></div>`;
  }
  function render() {
    window.PolicyHomeFeed?.unmount();
    const previousWorkspace = page.querySelector('.project-workspace');
    const previousContextTop = page.querySelector('.workspace-context')?.scrollTop || 0;
    const previousCardsLeft = page.querySelector('.workspace-status-grid')?.scrollLeft || 0;
    const previousContentTop = page.querySelector('.workspace-content')?.scrollTop || 0;
    const focusedExpert = document.activeElement?.closest('.work-status-card')?.dataset.work;
    const focusedInput = document.activeElement?.id === 'adviser-message';
    captureFormDraft();
    if(previousWorkspace && S.getTask(previousWorkspace.dataset.task)){
      if(['task','expert'].includes(previousWorkspace.dataset.viewRoute))indexPositions.set(previousWorkspace.dataset.task,previousContextTop);
      else documentPositions.set(previousWorkspace.dataset.documentKey,previousContentTop);
    }
    window.PolicyChat.captureView();
    const {route,params} = currentRoute();
    if (route === 'profile' || route === 'diagnosis') {
      const legacyTask=params.task || params.id || S.getState().activeTaskId;
      history.replaceState(null,'',S.getTask(legacyTask) ? `#task?task=${encodeURIComponent(legacyTask)}&work=${route}` : '#dashboard');
      render();
      return;
    }
    if (route === 'batch' && B.getRole() !== 'researcher') B.setRole('researcher');
    const versionId = route === 'version' ? params.id : route === 'compare' ? params.left : '';
    const versionTask = S.getState().versions.find(version => version.id === versionId)?.taskId;
    // 首页专家入口必须显式绑定企业项目，不能用最近活动项目兜底。
    const taskId = route === 'expert' ? (params.task || '') : versionTask || params.task || (['task','profile','diagnosis','assembly','guidance'].includes(route) ? params.id : '') || S.getState().activeTaskId;
    if (taskId && S.getTask(taskId) && S.getState().activeTaskId !== taskId) S.setActiveTask(taskId);
    const task = S.getTask(taskId);
    const projectRoutes = ['task','profile','policy','diagnosis','assembly','guidance','version','compare','source'];
    const isProject = projectRoutes.includes(route) || route==='expert' && Boolean(task);
    const sameProject = isProject && previousWorkspace?.dataset.task === taskId;
    if (previousWorkspace && !sameProject) W.leave(previousWorkspace.dataset.task);
    const routeWork = {profile:'profile',policy:'match',diagnosis:'diagnosis',assembly:'assembly',guidance:'review',version:'review',compare:'review'};
    const workId = task ? W.selectedWork(task,route==='expert' ? serviceWork[validService(params.service || serviceForWork(params.work))] : params.work || routeWork[route]) : '';
    const capabilities = route==='expert' || params.experts==='1' || ['interpret','guidance'].includes(workId);
    const nextDocumentKey=documentKey(taskId,route,params);
    if (task && isProject && task.selectedWorkId !== workId) S.updateTask(task.id,{selectedWorkId:workId});
    // 选好政策后直接核对，用户看到的就是结果。
    if (task && ['task','expert'].includes(route) && workId === 'assembly' && task.steps.match && !task.steps.diagnosis) runDiagnosis(S.getTask(task.id));
    const renderers = {
      dashboard:() => ['interpret','assembly','guidance'].includes(params.work) ? W.renderStart(params.work,{name:companyStartDraft,...startDraft}) : V.startHome(), 'home-classic':() => V.dashboard({filter:params.filter}), new:() => V.newTask({intent:params.intent}), services:() => V.services({type:params.type,query:params.query}),
      batch:() => B.render(),
      expert:() => task ? '' : V.expertEntry(validService(params.service)),
      library:() => M.renderLibrary(params.company), task:() => '', policy:() => V.policy(taskId,params.policy || params.id),
      assembly:() => M.renderAssembly(taskId), guidance:() => V.guidance(taskId),
      version:() => M.renderVersion(params.id), compare:() => M.renderCompare(params.left,params.right), source:() => renderSource(taskId,params.id),
    };
    try {
      const content = renderers[route]();
      page.innerHTML = isProject ? W.render(taskId,{workId,content,route,capabilities}) : content;
      const workspace=page.querySelector('.project-workspace');
      if(workspace)workspace.dataset.documentKey=nextDocumentKey;
      document.body.classList.toggle('in-project',Boolean(page.querySelector('.project-workspace')));
      M.syncBodyClamps();
      if(workspace && !['task','expert'].includes(route) && previousWorkspace?.dataset.documentKey!==nextDocumentKey)requestAnimationFrame(()=>page.querySelector('.workspace-document-close')?.focus({preventScroll:true}));
    }
    catch (error) {
      console.error('页面呈现失败',error);
      document.body.classList.remove('in-project');
      page.innerHTML = '<section class="empty-state"><h1>当前页面未能打开</h1><p>已保存的任务会保留，请返回首页重试。</p><button class="button button-primary" data-route="dashboard">返回首页</button></section>';
    }
    sidebar();
    B.syncSelection();
    window.PolicyHomeFeed?.mount();
    const title = page.querySelector('h1')?.textContent || '惠企政策平台';
    document.title = `${title} · 惠企政策平台`;
    window.PolicyChat.restoreView();
    restoreFormDraft();
    const documentContent=page.querySelector('.workspace-content');
    if(documentContent)documentContent.scrollTop=documentPositions.get(nextDocumentKey) || 0;
    const context=page.querySelector('.workspace-context');
    if(context && ['task','expert'].includes(route))context.scrollTop=indexPositions.get(taskId) || 0;
    if (sameProject) {
      const cards = page.querySelector('.workspace-status-grid');
      if (cards) cards.scrollLeft = previousCardsLeft;
      const focusTarget = focusedExpert ? page.querySelector(`#expert-tab-${focusedExpert}`)
        : focusedInput ? page.querySelector('#adviser-message') : null;
      focusTarget?.focus({preventScroll:true});
    } else {
      page.focus({preventScroll:true});
      window.scrollTo({top:0,behavior:'instant'});
    }
    syncExpertControls();
    const cards = page.querySelector('.workspace-status-grid');
    const activeCard = cards?.querySelector('[aria-selected="true"]');
    if (cards && activeCard && cards.scrollWidth > cards.clientWidth) {
      const bounds = cards.getBoundingClientRect();
      const activeBounds = activeCard.getBoundingClientRect();
      if (activeBounds.left < bounds.left) cards.scrollLeft -= bounds.left - activeBounds.left + 10;
      else if (activeBounds.right > bounds.right) cards.scrollLeft += activeBounds.right - bounds.right + 10;
    }
    cards?.addEventListener('scroll',syncExpertControls,{passive:true});
    syncExpertControls();
    if(route==='dashboard'){
      const tab=focusedExpert && page.querySelector(`#expert-tab-${focusedExpert}`);
      if(tab)tab.focus({preventScroll:true});
      else if(window.matchMedia?.('(pointer: fine)')?.matches)(page.querySelector('#start-company-name') || page.querySelector('#adviser-message'))?.focus({preventScroll:true});
    }
    if(confirmationFocus?.taskId===taskId && confirmationFocus.workId===workId){
      page.querySelector('.work-status-card[aria-selected="true"]')?.focus({preventScroll:true});
      confirmationFocus=null;
    }
  }
  window.PolicyUI = Object.freeze({escape,icon,navigate,advanceWork,toast,refresh:render,getPendingDraft,getCompanyDraft:service=>service ? expertCompanyDrafts.get(service) || '' : companyStartDraft,clearCompanyDraft:()=>{companyStartDraft='';}});
  document.querySelectorAll('[data-icon]').forEach(element => {element.innerHTML = icon(element.dataset.icon);});
  S.subscribe(sidebar);
  window.addEventListener('hashchange',render);
  window.addEventListener('resize',syncExpertControls);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeMenu();
      if(!document.querySelector('#match-drawer'))page.querySelector('.workspace-document-close')?.click();
    }
    const current = event.target instanceof Element ? event.target.closest('.work-status-card[role="tab"]') : null;
    if (!current || !['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    const cards = [...page.querySelectorAll('.work-status-card[role="tab"]')];
    const index = cards.indexOf(current);
    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? cards.length-1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + cards.length) % cards.length;
    event.preventDefault();
    cards[nextIndex].focus({preventScroll:true});
    cards[nextIndex].click();
  });

  function updateSource(task, sourceId, text, type = '', fileName = '') {
    const provided = Boolean(text.trim());
    // 生成的材料算文件；用户改好传回来后就是普通上传。
    const sources = task.sources.map(source => source.id === sourceId ? {...source,text:text.trim(),provided,type:type || (source.type === 'generated' ? 'document' : source.type),fileName} : source);
    const requirements = task.requirements.map(item => item.sourceId === sourceId && item.kind === 'material' ? {...item,status:provided ? 'ready':'missing',evidence:provided ? '已提供资料正文，需人工核对内容与有效性。':'尚未提供这份资料。'} : item);
    return S.updateTask(task.id,{sources,requirements,status:requirements.some(item=>item.status !== 'ready') ? 'needs-input':'processing',steps:{assembly:false,review:false}});
  }
  function useService(serviceId, taskId) {
    const task = S.getTask(taskId || S.getState().activeTaskId);
    if (!task) { navigate('new',{intent:serviceId}); return; }
    const destinations = serviceWork;
    if (!destinations[serviceId]) return;
    navigate('task',{task:task.id,work:destinations[serviceId]});
  }
  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target.closest('button[data-action],a[data-action],button[data-route],a[data-route]') : null;
    if (!target) return;
    if (window.PolicyHomeFeed?.handleClick(target)) return;
    if (window.PolicyMatch?.handleClick(target)) return;
    if (target.dataset.action==='home-expert') {
      navigate('expert',{service:validService(target.dataset.service)});
      return;
    }
    if (target.dataset.action==='nav-work') {
      // 在项目里就切到这个项目的对应标签，否则从首页入口开始。
      event.preventDefault();
      // 侧栏入口每次都开新会话；旧会话留在“最近对话”里。
      companyStartDraft='';
      Object.assign(startDraft,{files:[],question:''});
      window.PolicyMatch?.resetGuest();
      navigate('dashboard',{work:target.dataset.work});
      return;
    }
    if (target.dataset.action==='home-start-expert') {
      startDraft.question='';
      navigate('dashboard',{work:target.dataset.work==='match'?'interpret':target.dataset.work});
      return;
    }
    if (target.dataset.action==='home-remove-file') {
      startDraft.files=startDraft.files.filter(file=>file.id!==target.dataset.file);
      render();
      return;
    }
    if (target.dataset.action==='home-start-focus') {
      const input=page.querySelector('#start-company-name');
      input?.scrollIntoView({block:'center',behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
      input?.focus({preventScroll:true});
      return;
    }
    if (target.dataset.action === 'delete-project') {
      event.preventDefault();
      const task=S.getTask(target.dataset.task);
      if (!task) {toast('没有找到这个项目，请刷新后重试。');return;}
      const versionCount=S.getState().versions.filter(version=>version.taskId===task.id).length;
      if (!window.confirm(`删除项目“${task.title}”？\n将一并删除本项目的对话、资料和 ${versionCount} 个材料版本，且无法恢复。`)) return;
      const current=currentRoute();
      const versionIds=current.route==='version' ? [current.params.id] : current.route==='compare' ? [current.params.left,current.params.right] : [];
      const inDeletedProject=page.querySelector('.project-workspace')?.dataset.task===task.id || S.getState().versions.some(version=>versionIds.includes(version.id) && version.taskId===task.id);
      if (!S.deleteTask(task.id)) {toast(S.getState().storageError);return;}
      forgetProject(task.id);
      if (inDeletedProject) navigate('dashboard');
      else if (['dashboard','batch','library','services'].includes(current.route)) render();
      toast('项目已删除。');
      return;
    }
    if (B.handleClick(target)) return;
    if(window.PolicyChat.handleClick(target)) return;
    if (M.handleClick(target)) return;
    if (target.dataset.route) {
      const params = {};
      if (target.dataset.task) params.task = target.dataset.task;
      if (target.dataset.work) params.work = target.dataset.work;
      const fromCapabilities=page.querySelector('.project-workspace')?.dataset.capabilities==='true';
      if (target.dataset.experts==='1' || fromCapabilities && target.dataset.task) params.experts='1';
      if (target.dataset.route==='expert') params.service=serviceForWork(target.dataset.work);
      if (target.dataset.id) {
        if (target.dataset.route === 'policy') params.policy = target.dataset.id;
        else params.id = target.dataset.id;
      }
      navigate(target.dataset.route,params);return;
    }
    const action = target.dataset.action;
    const task = S.getTask(target.dataset.task || S.getState().activeTaskId);
    if (action === 'open-menu') {
      document.body.classList.add('menu-open');
      document.querySelector('.sidebar-backdrop').hidden = false;
      target.setAttribute('aria-expanded','true');
      document.querySelector('.sidebar .brand').focus();
    } else if (action === 'close-menu') { closeMenu(); document.querySelector('[data-action="open-menu"]').focus(); }
    else if (action === 'prompt-fill') {
      const input = page.querySelector('#task-request');
      if (input) { const addition = target.dataset.prompt || '';input.value = `${input.value.trim()}${input.value.trim() ? '\n':''}${addition}`.slice(0,5000);S.saveTaskDraft(input.value);input.focus(); }
    } else if (action === 'dashboard-filter') navigate('dashboard',{filter:target.dataset.id});
    else if(action==='confirm-work'){
      const workspace=page.querySelector('.project-workspace');
      const currentWork=page.querySelector('.adviser-card')?.dataset.chatWork;
      if(!task || workspace?.dataset.task!==target.dataset.task || currentWork!==target.dataset.work){toast('当前工作已切换，请确认正在查看的事项。');return;}
      captureFormDraft();
      const pending=getPendingDraft(task.id);
      if(pending){toast(pending.reason);render();return;}
      const result=S.confirmWork(task.id,target.dataset.work,target.dataset.confirmationKey || '',target.dataset.versionId || '');
      if(!result.ok){toast(result.reasons[0] || '当前事项尚未满足确认条件。');render();return;}
      advanceWork(task.id,result.nextWork || target.dataset.work);
    }
    else if (action === 'workspace-expert' && task) {
      const current=currentRoute();
      navigate(current.route,{...current.params,task:task.id,work:target.dataset.work,...(current.route==='expert'?{service:serviceForWork(target.dataset.work)}:{})});
    } else if (action === 'workspace-expert-scroll') {
      const nav=page.querySelector('.workspace-status-grid');
      if(nav){nav.scrollLeft+=Number(target.dataset.direction)*Math.max(140,nav.clientWidth*.7);syncExpertControls();}
    } else if (action === 'service-tab') navigate('services',{type:target.dataset.id});
    else if (action === 'service-use') useService(target.dataset.id,target.dataset.task);
    else if (action === 'team-use') navigate('new',{intent:target.dataset.id});
    else if (action === 'load-demo' && task) {
      const demo = D.createTaskSeed({loadDemo:true});
      const company={...demo.company,name:task.company.name || demo.company.name,region:task.company.region || demo.company.region,industry:task.company.industry || demo.company.industry};
      const named={...task,company};
      const sources=demo.sources.map(source=>({...source,text:sampleFor(named,source.text)}));
      S.updateTask(task.id,{company,sources:[...sources,...task.sources.filter(source=>!sources.some(item=>item.id===source.id))],requirements:demo.requirements,status:'processing',steps:{profile:true,match:false,diagnosis:false,assembly:false,review:false}});
      render();toast('已载入示例资料，可以继续查找政策。');
    } else if (action === 'run-match' && task) {
      if (!task.steps.profile) {toast('请先确认企业名称。');navigate('profile',{task:task.id});return;}
      S.updateTask(task.id,{steps:{match:true},status:'processing'});navigate('policy',{task:task.id});toast('已按企业档案筛选候选政策，请逐项核对适用条件。');
    } else if (action === 'choose-policy' && task) {
      const policy = D.policies.find(item=>item.id === target.dataset.id);
      if (!policy || !task.steps.profile || !task.steps.match) {toast('请先确认档案并检索候选项目。');return;}
      if (task.policyId !== policy.id) S.updateTask(task.id,{policyId:policy.id,status:'processing',steps:{diagnosis:false,assembly:false,review:false}});
      navigate('diagnosis',{task:task.id});
    } else if (action === 'run-diagnosis' && task) {
      if (!task.steps.match) {navigate('task',{task:task.id,work:'match'});return;}
      runDiagnosis(task);navigate('task',{task:task.id,work:'diagnosis'});
    } else if (action === 'material-review' && task) {
      window.PolicyMatch.openMaterialReview(task,target);
    } else if (action === 'material-delete' && task) {
      const sourceId=target.dataset.source,source=task.sources.find(item=>item.id===sourceId);
      if(!source || !window.confirm(`删除《${source.name}》？删除后需要重新上传或生成。`))return;
      if(!updateSource(task,sourceId,'')){toast('未能删除，请重试。');return;}
      window.PolicyMatch.forgetUpload(task.id,sourceId);
      M.forgetFile(task.id,sourceId);
      window.PolicyMatch.closeDrawer();
      if(currentRoute().route==='version')navigate('task',{task:task.id,work:'assembly'});else render();
      toast(`已删除《${source.name}》。`);
    } else if (action === 'view-source' && task) navigate('source',{task:task.id,id:target.dataset.id,work:target.dataset.work || task.selectedWorkId});
  });
  /* 右上角头像的账号弹窗：点头像开合，点别处或按 Esc 关闭。账号信息接入万大圣单点登录后替换。 */
  function setAccountMenu(open) {
    const menu=document.querySelector('.account-menu'),toggle=document.querySelector('[data-account-toggle]');
    if(!menu||!toggle)return;
    menu.hidden=!open;
    toggle.setAttribute('aria-expanded',String(open));
  }
  document.addEventListener('click', event => {
    const target=event.target instanceof Element?event.target:null;
    if(target?.closest('[data-account-toggle]')){setAccountMenu(document.querySelector('.account-menu').hidden);return;}
    if(target?.closest('[data-account-logout]')){setAccountMenu(false);navigate('dashboard');return;}
    if(target?.closest('.account-menu-verify')||!target?.closest('.account-menu'))setAccountMenu(false);
  });
  document.addEventListener('keydown', event => {
    if(event.key!=='Escape'||document.querySelector('.account-menu')?.hidden!==false)return;
    setAccountMenu(false);
    document.querySelector('[data-account-toggle]').focus({preventScroll:true});
  });
  document.addEventListener('change', event => {
    const target=event.target;
    if (!(target instanceof Element)) return;
    if (target.matches('[data-source-generate]')) {
      const taskId=target.dataset.task,sourceId=target.dataset.source,files=Array.from(target.files || []);
      if(!S.getTask(taskId) || !files.length)return;
      window.PolicyMatch?.closeDrawer();M.generateMaterial(taskId,sourceId,files,(text,label)=>updateSource(S.getTask(taskId),sourceId,text,'generated',`${label}.doc`));
      return;
    }
    if (target.matches('[data-section-upload]')) {
      const taskId=target.dataset.task,file=target.files?.[0];
      if(!S.getTask(taskId) || !file)return;
      M.reuploadSection(taskId,target.dataset.versionId,Number(target.dataset.sectionIndex),file,(sourceId,text,name)=>{
        window.PolicyMatch?.rememberUpload(file,taskId,'assembly',sourceId);
        return updateSource(S.getTask(taskId),sourceId,text,'',name);
      });
      return;
    }
    if (target.matches('[data-source-upload]')) {
      const taskId=target.dataset.task,sourceId=target.dataset.source,file=target.files?.[0];
      if(!S.getTask(taskId) || !file)return;
      window.PolicyMatch?.rememberUpload(file,taskId,'assembly',sourceId);
      M.rememberFile(taskId,sourceId,file);
      // 能读出文字就存原文用于解析；读不出的只记文件名，并在解析里说明。
      M.readFileText(file).then(text=>{
        const task=S.getTask(taskId);
        if(!task)return;
        if(!updateSource(task,sourceId,text || `【已上传文件：${file.name}，请人工核对内容】`,'',file.name)){toast('资料未能保存，请重试。');return;}
        render();window.PolicyMatch?.refreshMaterialReview(S.getTask(taskId),sourceId);toast(text ? '已上传并读取内容。' : '已上传。');
      });
      return;
    }
    if (target.id === 'home-files') {
      const added=Array.from(target.files || []).map((file,index)=>({id:`file-${Date.now()}-${index}`,name:file.name,size:file.size}));
      Array.from(target.files || []).forEach(file=>window.PolicyMatch?.rememberUpload(file,'',target.closest('#adviser-chat-form')?.dataset.work || ''));
      if(added.length){startDraft.files=[...startDraft.files,...added].slice(-20);render();toast('已上传。');}
      return;
    }
    if (target.id === 'user-type') {
      B.setRole(target.value);
      const {route}=currentRoute();
      if (['dashboard','batch'].includes(route)) navigate(B.getRole()==='researcher' ? 'batch' : 'dashboard');
      else sidebar();
      return;
    }
    B.handleChange(target);
  });
  document.addEventListener('input', event => {
    if (event.target?.id === 'start-company-name') {
      const service=event.target.closest('form')?.dataset.service;
      if(service)expertCompanyDrafts.set(service,event.target.value.slice(0,300));
      else companyStartDraft=event.target.value.slice(0,300);
    }
    if (event.target?.id === 'task-request') S.saveTaskDraft(event.target.value);
    const form=event.target?.closest?.('#source-form');
    if(form){delete form.dataset.draftSaved;captureFormDraft();}
  });
  function formError(form,message) {
    let box = form.querySelector('.form-error');
    if (!box) {box=document.createElement('p');box.className='form-error';box.setAttribute('role','alert');form.prepend(box);}
    box.textContent=message;toast(message);
  }
  document.addEventListener('submit', event => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    if(!form.dataset.home && window.PolicyChat.handleSubmit(form,event)) return;
    if (M.handleSubmit(form,event)) return;
    event.preventDefault();
    const values = new FormData(form);
    const value = name=>String(values.get(name) || '').trim();
    if (form.dataset.guest) {
      const question=value('message');
      if(!question)return;
      window.PolicyMatch.guestAsk(question);render();
      return;
    }
    if (form.id === 'company-start-form' || form.dataset.home) {
      const name=form.dataset.home ? value('message') : value('companyName');
      if (!name || name.length>300) {formError(form,'请填写企业名称，最多300字。');return;}
      // 快捷入口的名称和选择器在同一张表单里，回车等于点确定。
      if (form.matches('.start-quick-form')) {form.querySelector('.button-primary[data-action="home-intake-finish"]').click();return;}
      // 首页先原地展开表单，确定或跳过时才建项目。
      if (form.matches('.start-hero-form')) {
        window.PolicyMatch.openHomeIntake();
        render();
        const first=page.querySelector('[data-home-intake] input');
        first?.closest('.intake-question')?.scrollIntoView?.({block:'nearest'});
        first?.focus({preventScroll:true});
        return;
      }
      if (form.dataset.started) return;
      form.dataset.started='true';
      const button=form.querySelector('[type="submit"]');
      button.disabled=true;
      const task=S.createTask({title:`${name} · 政策申报`,request:`为${name}梳理企业资料，查找适用政策并准备申报材料。`,company:{name,region:'',industry:''},...(form.dataset.work==='assembly'?{policyId:'no-policy'}:{}),...(form.dataset.service?{}:{intake:{stage:'fields',answers:{},files:startDraft.files}})});
      if (!task) {delete form.dataset.started;button.disabled=false;formError(form,'任务未能创建，请重试。');return;}
      if(form.dataset.service){
        const service=validService(form.dataset.service);
        expertCompanyDrafts.delete(service);
        navigate('expert',{task:task.id,service});
      } else {
        companyStartDraft='';
        Object.assign(startDraft,{files:[],question:''});
        window.PolicyMatch?.beginPortrait(task.id);
        window.PolicyMatch?.adoptUploads(task.id);
        if(form.dataset.applyPolicy)window.PolicyMatch.finishGuest(task,form.dataset.applyPolicy);
        navigate('task',{task:task.id,work:form.dataset.work || 'profile'});
      }
    } else if (form.id === 'new-task-form') {
      const request=value('request'),name=value('companyName'),region=value('region'),industry=value('industry');
      if (!request || !name || !region || !industry) {formError(form,'请填写企业名称、地区、行业和申报目标。');return;}
      const title = request.replace(/[\n\r]+/g,' ').slice(0,36);
      const task = S.createTask({title,request,company:{name,region,industry}});
      if (!task) {formError(form,'任务没有创建成功，请检查填写内容。');return;}
      S.saveTaskDraft('');navigate('task',{task:task.id,work:'profile'});toast('任务已建立，请确认企业档案与资料。');
    }
    else if (form.id === 'source-form') {
      const task=S.getTask(form.dataset.task);
      if (!task || !value('text')) {formError(form,'请填写资料正文。');return;}
      if (!updateSource(task,form.dataset.source,value('text'))) {formError(form,'资料未能保存，请重试。');return;}
      discardFormDraft(form);
      navigate('diagnosis',{task:task.id});toast('资料已保存，请重新组稿后核对新版本。');
    }
  });
  render();
})();
