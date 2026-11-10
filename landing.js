/* 公开政策查询、推荐与专家工作展示；只读当前项目的行业和地区。 */
(() => {
  'use strict';
  const D = window.PolicyLandingData;
  if (!D) return;
  const esc = (value = '') => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const state = {region:'all', industry:'all', support:'all', status:'all', query:'', distribution:'industry', visible:6, expertTab:'experts', workStep:'profile'};
  const statuses = {open:'申报中',upcoming:'即将开始',closed:'已截止',deadline:'查看截止日',unknown:'时间待明确',notice:'政策公告',result:'结果公示'};
  let readerTrigger = null;
  const date = value => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const parsed = new Date(`${value}T00:00:00Z`);
    return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0,10) !== value ? null : value;
  };
  const asOf = date(D.snapshot.date) || '2026-10-30';
  function classifyWindow(policy, at = asOf) {
    if (policy.category === '结果公示') return 'result';
    if (policy.category !== '申报通知') return 'notice';
    const start = date(policy.applicationStart), end = date(policy.applicationEnd), today = date(at);
    if (!today) return 'unknown';
    if (end && today > end) return 'closed';
    if (!start && end) return 'deadline';
    if (!start || !end || start > end) return 'unknown';
    if (today < start) return 'upcoming';
    if (today > end) return 'closed';
    return 'open';
  }
  function uniquePolicies(items) {
    const seen = new Map();
    for (const item of items) {
      const key = JSON.stringify([item.projectId || item.id, item.batchId || item.id]);
      if (!seen.has(key) || String(item.publishedAt) > String(seen.get(key).publishedAt)) seen.set(key,item);
    }
    return [...seen.values()];
  }
  const policies = uniquePolicies(D.policies);
  const industryPolicyIds = {
    '人工智能': new Set(['gd-ai-2027', 'cn-tech-commerce-2026']),
    '金融行业': new Set(['cn-finance-2025']),
  };
  function matchesIndustry(policy, industry) {
    if (!industry || industry === 'all') return true;
    if (industry === '物流行业') return /物流/.test(`${policy.title} ${policy.summary}`);
    if (industryPolicyIds[industry]) return industryPolicyIds[industry].has(policy.id);
    return policy.industries.includes(industry);
  }
  function filterPolicies(filters = state, input = policies) {
    const terms = String(filters.query || '').trim().toLocaleLowerCase('zh-CN').split(/\s+/).filter(Boolean);
    return uniquePolicies(input).filter(policy => {
      const haystack = [policy.title,policy.region,policy.supportType,policy.summary,...policy.industries].join(' ').toLocaleLowerCase('zh-CN');
      return (!filters.region || filters.region === 'all' || policy.region === filters.region)
        && matchesIndustry(policy,filters.industry)
        && (!filters.support || filters.support === 'all' || policy.supportType === filters.support)
        && (!filters.status || filters.status === 'all' || classifyWindow(policy) === filters.status)
        && terms.every(term => haystack.includes(term));
    }).sort((a,b) => String(b.publishedAt).localeCompare(String(a.publishedAt)) || a.id.localeCompare(b.id));
  }
  const arrow = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg>';
  const check = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';
  const displayDate = value => date(value) ? value.replaceAll('-','.') : '待明确';
  function period(policy) {
    if (policy.category !== '申报通知') return '不适用';
    if (!date(policy.applicationStart) && date(policy.applicationEnd)) return `截至 ${displayDate(policy.applicationEnd)}${policy.deadlineAt ? ' '+policy.deadlineAt.slice(11,16) : ''}`;
    if (!date(policy.applicationStart) || !date(policy.applicationEnd)) return '申报时间待明确';
    return `${displayDate(policy.applicationStart)} — ${displayDate(policy.applicationEnd)}`;
  }
  const statusTag = policy => `<span class="policy-status status-${classifyWindow(policy)}">${esc(statuses[classifyWindow(policy)])}</span>`;
  function recommendationProfile() {
    const fallback = {industry:'软件信息',support:'研发支持',region:'',fromProject:false};
    try {
      const raw=localStorage.getItem('huiqi-prep-v2-2-20261110-huiqi-policy-demo-v1');
      if (!raw || raw.length > 5000000) return fallback;
      const saved=JSON.parse(raw);
      if (saved.schemaVersion !== 1 || !Array.isArray(saved.tasks) || saved.tasks.length > 500) return fallback;
      const task=saved.tasks.find(item=>item.id === saved.activeTaskId);
      if (!task || !task.company || typeof task.company.industry !== 'string') return fallback;
      const text=task.company.industry.slice(0,200);
      const mapping=[[/人工智能|AI/i,'人工智能'],[/物流|运输|供应链/,'物流行业'],[/金融|银行|保险/,'金融行业'],[/软件|信息|数字/,'软件信息'],[/制造|工业/,'先进制造'],[/能源|电力/,'新能源'],[/医疗|生物|健康/,'生命健康'],[/服务/,'现代服务']];
      const industry=mapping.find(([pattern])=>pattern.test(text))?.[1];
      if (!industry) return fallback;
      const location=typeof task.company.region === 'string' ? task.company.region.slice(0,100) : '';
      const region=[[/浙江|杭州|宁波/,'浙江省'],[/广东|深圳|广州/,'广东省'],[/北京/,'北京市'],[/上海/,'上海市']].find(([pattern])=>pattern.test(location))?.[1] || '';
      return {...fallback,industry,region,fromProject:true};
    } catch { return fallback; }
  }
  const recommendation = recommendationProfile();
  function currentRecommendation() {
    return {...recommendation,
      industry:state.industry !== 'all' ? state.industry : recommendation.industry,
      region:state.region !== 'all' ? state.region : recommendation.region,
      support:state.support !== 'all' ? state.support : recommendation.support,
    };
  }
  function recommendedPolicies(items) {
    const preference=currentRecommendation();
    return items.filter(item=> !['closed','result'].includes(classifyWindow(item))).map(item=>{
      const reasons=[]; let score=0;
      if (matchesIndustry(item,preference.industry)) { score+=4; reasons.push(`行业：${preference.industry}`); }
      if (preference.region && item.region === preference.region) { score+=2; reasons.push(`地区：${preference.region}`); }
      if (item.supportType === preference.support) { score+=1; reasons.push(`方向：${preference.support}`); }
      return {item,score,reasons};
    }).filter(entry=>entry.score>0).sort((a,b)=>b.score-a.score || b.item.publishedAt.localeCompare(a.item.publishedAt)).slice(0,3);
  }
  function renderDistribution(items) {
    const total=$('#opportunity-summary [data-stat="total"]');
    if (total) total.textContent=String(items.length);
    const counts=new Map();
    for (const policy of policies) counts.set(policy.supportType,0);
    for (const policy of filterPolicies({...state,support:'all'})) counts.set(policy.supportType,(counts.get(policy.supportType)||0)+1);
    const maximum=Math.max(1,...counts.values());
    if ($('#distribution-chart')) $('#distribution-chart').innerHTML=[...counts].sort((a,b)=>b[1]-a[1]).map(([label,count],index)=>`<button type="button" class="distribution-row${state.support === label ? ' is-active' : ''}" data-support="${esc(label)}" aria-pressed="${state.support === label}" aria-label="${esc(label)}，${count}项"><span class="distribution-label">${esc(label)}</span><span class="distribution-track" aria-hidden="true"><span class="distribution-bar bar-${index}" style="width:${count/maximum*100}%"></span></span><span class="distribution-value">${count}<small>项</small></span></button>`).join('');
    const regionCounts=new Map([...new Set(policies.map(item=>item.region))].map(region=>[region,0]));
    for (const policy of filterPolicies({...state,region:'all'})) regionCounts.set(policy.region,(regionCounts.get(policy.region)||0)+1);
    if ($('#region-summary')) $('#region-summary').innerHTML=[...regionCounts].map(([region,count])=>`<button type="button" data-region="${esc(region)}" aria-pressed="${state.region === region}" class="${state.region === region ? 'is-active' : ''}">${esc(region === '全国' ? '全国适用' : region)}<span>${count}项</span></button>`).join('');
    $$('[data-industry]').forEach(button=>{
      const selected=button.dataset.industry === state.industry;
      button.setAttribute('aria-pressed',String(selected));
      button.classList.toggle('is-active',selected);
    });
    const selected=[];
    if (state.industry !== 'all') selected.push(state.industry);
    if (state.region !== 'all') selected.push(state.region === '全国' ? '全国适用' : state.region);
    if (state.support !== 'all') selected.push(state.support);
    if (state.query) selected.push(`关键词“${state.query}”`);
    if ($('#selection-summary')) $('#selection-summary').textContent=`${selected.length ? '当前范围：'+selected.join(' · ') : '全部政策'} · ${items.length}项`;
    if ($('#reset-selection')) $('#reset-selection').hidden=!selected.length;
  }
  function dates(policy) {
    return `<dl class="policy-row-dates"><div><dt>发布</dt><dd>${esc(displayDate(policy.publishedAt))}</dd></div>${policy.category === '申报通知' ? `<div><dt>申报</dt><dd>${esc(period(policy))}</dd></div>` : ''}</dl>`;
  }
  function renderPolicies(items) {
    if ($('#policy-list')) $('#policy-list').innerHTML=items.slice(0,state.visible).map(item=>`<article class="policy-row"><div class="policy-row-copy"><div class="policy-meta"><span>${esc(item.region === '全国' ? '全国适用' : item.region)}</span>${statusTag(item)}</div><h3><button type="button" data-policy-id="${esc(item.id)}">${esc(item.title)}</button></h3><p class="policy-agency">${esc(item.agency)}</p></div>${dates(item)}<button class="policy-row-open" type="button" data-policy-id="${esc(item.id)}" aria-label="查看${esc(item.title)}">${arrow}</button></article>`).join('');
    if ($('#policy-empty')) $('#policy-empty').hidden=items.length>0;
    if ($('#policy-count')) $('#policy-count').textContent=`${items.length}项`;
    if ($('#show-more-policies')) { $('#show-more-policies').hidden=state.visible>=items.length; $('#show-more-policies').textContent=`再看${Math.min(6,Math.max(0,items.length-state.visible))}项`; }
    const preference=currentRecommendation();
    const hasSelection=[state.industry,state.region,state.support].some(value=>value !== 'all');
    if ($('#recommendation-context')) $('#recommendation-context').textContent=`${hasSelection ? '按所选范围推荐' : recommendation.fromProject ? '参考当前项目' : '推荐方向'}：${[preference.industry,preference.region,preference.support].filter(Boolean).join(' · ')}`;
    const entries=recommendedPolicies(items);
    if ($('#recommended-policy-list')) $('#recommended-policy-list').innerHTML=entries.map(({item,reasons},index)=>`<article class="recommendation-card"><div class="policy-meta"><span>${esc(item.supportType)}</span>${statusTag(item)}</div><h3><button type="button" data-policy-id="${esc(item.id)}">${esc(item.title)}</button></h3>${index===0 ? `<p>${esc(item.summary)}</p>` : ''}<p class="recommendation-reason"><strong>推荐依据</strong><br>${reasons.map(esc).join(' · ')}</p>${dates(item)}<button class="text-button" type="button" data-policy-id="${esc(item.id)}">查看政策 ${arrow}</button></article>`).join('') || '<p class="recommendation-empty">当前范围内暂无推荐，试试其他行业、地区或关键词。</p>';
  }
  function render() {
    const items=filterPolicies();
    renderDistribution(items); renderPolicies(items);
    if ($('#hero-query-status')) $('#hero-query-status').textContent=state.query ? `“${state.query}” · 找到${items.length}项政策` : '';
    if ($('#policy-reader') && !$('#policy-reader').hidden) closeReader(false);
  }
  function changeFilter(key,value) {
    if (!['query','industry','region','support'].includes(key)) return;
    state[key]=key !== 'query' && state[key] === value ? 'all' : value;
    state.visible=6;
    render();
    if (key !== 'query') $$(`[data-${key}]`).find(button=>button.dataset[key] === value)?.focus({preventScroll:true});
  }
  function resetSelection() {
    Object.assign(state,{region:'all',industry:'all',support:'all',status:'all',query:'',visible:6});
    if ($('#hero-query')) $('#hero-query').value='';
    render();
  }
  function openReader(id,trigger) {
    const policy = policies.find(item => item.id === id);
    const reader = $('#policy-reader');
    if (!policy || !reader) return;
    readerTrigger = trigger;
    reader.innerHTML = `<div class="policy-reader-head"><button id="policy-reader-close" class="text-button" type="button">收起详情 <span aria-hidden="true">×</span></button></div><div class="policy-meta"><span>${esc(policy.region === '全国' ? '全国适用' : policy.region)}</span><span>${esc(policy.category)}</span>${statusTag(policy)}</div><h3>${esc(policy.title)}</h3><p>${esc(policy.summary)}</p><dl class="policy-dates"><div><dt>发布部门</dt><dd>${esc(policy.agency)}</dd></div><div><dt>发布日期</dt><dd>${esc(displayDate(policy.publishedAt))}</dd></div><div><dt>申报时间</dt><dd>${esc(period(policy))}</dd></div></dl><div class="policy-reader-columns"><section><h4>先核对这些条件</h4><ul>${policy.conditions.map(item => `<li>${esc(item)}</li>`).join('')}</ul></section><section><h4>需要准备的材料</h4><ul>${policy.materials.map(item => `<li>${esc(item)}</li>`).join('') || '<li>按主管部门对应申报指南核对。</li>'}</ul></section></div><div class="policy-reader-foot"><p>来源：${esc(policy.agency)} · <a href="${esc(policy.sourceUrl)}" target="_blank" rel="noopener noreferrer">查看政策原文</a></p><a class="button button-primary" href="index.html#new">创建申报准备任务 ${arrow}</a></div>`;
    reader.hidden = false;
    reader.focus({preventScroll:true});
    reader.scrollIntoView?.({behavior:'instant',block:'nearest'});
  }
  function closeReader(restore = true) {
    const reader = $('#policy-reader');
    if (reader) reader.hidden = true;
    if (restore && readerTrigger?.isConnected) readerTrigger.focus({preventScroll:true});
    readerTrigger = null;
  }
  function portrait(index,className = 'expert-portrait') {
    const safe = Number.isInteger(index) && index >= 0 && index < 6 ? index : 0;
    return `<div class="${className}" style="--portrait-x:${safe%3*50}%;--portrait-y:${Math.floor(safe/3)*100}%" aria-hidden="true"></div>`;
  }
  function expertLink(serviceId) {
    const work = {profile:'profile',search:'match',interpret:'match',diagnosis:'diagnosis',assembly:'assembly',guidance:'review'}[serviceId];
    return `index.html#task?task=task-innovation${work ? `&work=${work}` : ''}`;
  }
  function renderExperts() {
    if ($('#expert-grid')) $('#expert-grid').innerHTML = D.experts.map((expert,index) => `<article class="expert-card expert-card-${index}"><div class="expert-copy"><h3>${esc(expert.title)}</h3><h4>${esc(expert.headline)}</h4><div class="expert-tags">${expert.deliverables.map(item => `<span>${esc(item)}</span>`).join('')}</div><a class="expert-action" href="${esc(expertLink(expert.serviceId))}">让TA帮我 ${arrow}</a></div>${portrait(expert.portraitIndex)}</article>`).join('');
    const rosters=[['profile','search','diagnosis'],['interpret','assembly','guidance']];
    const roleDescriptions={profile:'整理企业资料',search:'查找候选政策',diagnosis:'核对申报差距',interpret:'解读申报要求',assembly:'按模板组稿',guidance:'核对办理步骤'};
    if ($('#team-grid')) $('#team-grid').innerHTML = D.teams.map((team,index) => `<article class="team-card team-card-${index}"><header class="team-card-heading"><h3>${esc(team.title)}</h3><p>${esc(team.headline)}</p></header><div class="team-roster" aria-label="协作专家">${rosters[index].map(role=>{const person=window.PolicyPersonas.get(role);return `<div class="team-member"><span class="team-member-avatar" aria-hidden="true"><span class="team-member-photo" style="--portrait-x:${person.x}%;--portrait-y:${person.y}%"></span></span><strong>${esc(person.name)}</strong><small>${esc(roleDescriptions[role])}</small></div>`;}).join('')}</div><div class="team-deliverables" aria-label="交付成果">${team.deliverables.map(item=>`<span>${esc(item)}</span>`).join('')}</div><a class="expert-action" href="index.html#task?task=${index ? 'task-review' : 'task-innovation'}">开始协作 ${arrow}</a></article>`).join('');
    selectExpertTab(state.expertTab);
  }
  function selectExpertTab(tab,focus = false) {
    if (!['experts','teams'].includes(tab)) return;
    state.expertTab = tab;
    $$('[data-expert-tab]').forEach(button => {
      const selected = button.dataset.expertTab === tab;
      button.classList.toggle('is-active',selected);
      button.setAttribute('aria-selected',String(selected));
      button.tabIndex = selected ? 0 : -1;
      if (selected && focus) button.focus();
    });
    if ($('#expert-grid')) $('#expert-grid').hidden = tab !== 'experts';
    if ($('#team-grid')) $('#team-grid').hidden = tab !== 'teams';
  }
  const workSteps = {
    profile:{number:'01',title:'先了解企业，再找候选项目',user:'我们是杭州的软件企业，有研发项目，能看看哪些政策值得准备吗？',reply:'先把地区、行业和项目资料理清楚。候选政策会列出匹配原因，条件不明确的地方再逐项核对。',result:'企业档案',lines:[['注册地区','杭州市'],['所属行业','软件与信息服务'],['已有资料','企业简介、研发项目记录'],['下一步','核对候选政策与适用条件']],link:'profile',action:'看看企业档案'},
    diagnosis:{number:'02',title:'对照条件，把差距列清楚',user:'这个项目我们还缺什么？现在开始准备来得及吗？',reply:'当前6项资料里已有4项，还缺研发费用归集表和年度财务报告。资料缺失需要补证据，不能直接判断为不符合条件。',result:'申报准备清单',lines:[['准备度','4 / 6项 · 67%'],['待补资料','研发费用归集表'],['待补资料','年度财务报告'],['下一步','补充资料，再核对申报条件']],link:'diagnosis',action:'查看差距清单'},
    assembly:{number:'03',title:'用已有资料组稿，留下来源和版本',user:'按模板帮我整理材料，缺少的信息先留出来。',reply:'可以。章节会引用你提供的资料，未提供的数据明确留待补充。你可以修改、保存版本，再由企业负责人确认。',result:'申报材料草稿',lines:[['企业情况','引用：企业简介'],['项目介绍','引用：研发项目记录'],['费用说明','待补：费用归集资料'],['版本管理','草稿、来源、修改记录']],link:'assembly',action:'查看组稿过程'},
  };
  function selectWorkStep(step,focus = false) {
    const data = workSteps[step];
    if (!data) return;
    state.workStep = step;
    $$('#work-steps [data-work-step]').forEach(button => {
      const selected = button.dataset.workStep === step;
      button.classList.toggle('is-active',selected);
      button.setAttribute('aria-selected',String(selected));
      button.tabIndex = selected ? 0 : -1;
      if (focus && selected) button.focus();
    });
    if ($('#work-preview')) $('#work-preview').setAttribute('aria-labelledby',`step-${step}`);
    const expert=window.PolicyPersonas.get(step);
    const personStyle=`--portrait-x:${expert.x}%;--portrait-y:${expert.y}%`;
    if ($('#work-preview')) $('#work-preview').innerHTML = `<div class="work-chat"><header class="chat-preview-heading"><strong>${esc(data.title)}</strong></header><div class="work-message message-user"><span class="work-chat-avatar work-user-avatar" aria-hidden="true"><svg class="icon" viewBox="0 0 24 24"><path d="M5 21V4h14v17M2 21h20M9 8h1m4 0h1M9 12h1m4 0h1M10 21v-5h4v5"/></svg></span><div class="work-message-body"><span>企业负责人</span><p>${esc(data.user)}</p></div></div><div class="work-message message-adviser"><span class="work-chat-avatar portrait" style="${personStyle}" aria-hidden="true"></span><div class="work-message-body"><span>${esc(expert.name)}</span><p>${esc(data.reply)}</p></div></div><a class="text-button work-chat-entry" href="index.html#task?task=task-innovation&amp;work=${data.link}">${esc(data.action)} ${arrow}</a></div><div class="work-result"><div class="work-result-title">${check}<h3>${esc(data.result)}</h3></div><dl>${data.lines.map(([label,value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl></div>`;
  }
  function renderCases() {
    if ($('#case-grid')) $('#case-grid').innerHTML = D.cases.map((item,index) => `<article class="case-card case-card-${index}"><div class="case-meta"><span>${esc(item.industry)} · ${esc(item.region)}</span><span>${esc(item.yearLabel)}</span></div><h3 class="case-company" title="${esc(item.company)}">${esc(item.displayName)}</h3><p class="case-program">${esc(item.project)}<br>${esc(item.supportLabel)}</p><div class="case-grant"><span>获得补助</span><div><strong class="case-amount">${esc(item.amount)}</strong><span class="case-unit">${esc(item.unit)}</span></div></div><p class="case-description">${esc(item.description)}</p><a class="case-source" href="${esc(item.sourceUrl)}" target="_blank" rel="noopener noreferrer">查看公开报道 ${arrow}</a></article>`).join('');
  }

  function closeMenu() {
    $('#menu-toggle')?.setAttribute('aria-expanded','false');
    $('#landing-nav')?.classList.remove('is-open');
    document.body.classList.remove('landing-menu-open');
  }
  function init() {
    renderExperts(); renderCases(); selectWorkStep(state.workStep); render();
    $('#hero-query-form')?.addEventListener('submit',event => {
      event.preventDefault();
      const input = event.currentTarget.querySelector('[name="query"]');
      changeFilter('query',String(input?.value || '').trim().slice(0,100));
      $('#policy-feed')?.scrollIntoView?.({behavior:'instant',block:'start'});
    });
    document.addEventListener('click',event => {
      const target = event.target.closest('button,a');
      if (!target) return;
      if (target.id === 'menu-toggle') {
        const expanded = target.getAttribute('aria-expanded') === 'true';
        target.setAttribute('aria-expanded',String(!expanded));
        $('#landing-nav')?.classList.toggle('is-open',!expanded);
        document.body.classList.toggle('landing-menu-open',!expanded);
      }
      if (target.closest('#landing-nav') && target.tagName === 'A') closeMenu();
      const filterKey=['industry','region','support'].find(key=>Object.hasOwn(target.dataset,key));
      if (filterKey) { changeFilter(filterKey,target.dataset[filterKey]); $('#policy-feed')?.scrollIntoView?.({behavior:'instant',block:'start'}); }
      if (target.id === 'reset-selection' || target.id === 'clear-search') { resetSelection(); $('#policy-feed')?.scrollIntoView?.({behavior:'instant',block:'start'}); }
      if (target.id === 'show-more-policies') { state.visible += 6; renderPolicies(filterPolicies()); }
      if (target.dataset.policyId) openReader(target.dataset.policyId,target);
      if (target.id === 'policy-reader-close') closeReader();
      if (target.dataset.expertTab) selectExpertTab(target.dataset.expertTab);
      if (target.dataset.workStep) selectWorkStep(target.dataset.workStep);
    });
    document.addEventListener('keydown',event => {
      if (event.key === 'Escape') closeMenu();
      const target = event.target.closest('[data-expert-tab],[data-work-step]');
      if (!target || !['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
      event.preventDefault();
      const expert = Boolean(target.dataset.expertTab);
      const tabs = expert ? $$('[data-expert-tab]') : $$('#work-steps [data-work-step]');
      const current = tabs.indexOf(target);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length-1 : (current+(event.key === 'ArrowRight' ? 1 : -1)+tabs.length)%tabs.length;
      if (expert) selectExpertTab(tabs[next].dataset.expertTab,true); else selectWorkStep(tabs[next].dataset.workStep,true);
    });
  }
  window.PolicyLanding = Object.freeze({classifyWindow,uniquePolicies,filterPolicies,getState:() => ({...state}),getAsOf:() => asOf,recommendedPolicies,getRecommendationProfile:()=>({...recommendation})});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();
