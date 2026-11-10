/* 研究员批量工作区。使用本地企业与政策案例，不执行外部检索或政府提交。 */
(() => {
  'use strict';
  const storageKey = 'huiqi-prep-v2-2-20261110-huiqi-policy-research-v1';
  const companies = [
    {id:'chengchuan',name:'杭州澄川数字科技有限公司',short:'澄川数字科技',region:'杭州市',province:'浙江省',industry:'软件与信息服务',research:true,digital:true,authorized:true},
    {id:'qinghe',name:'杭州青禾智能装备有限公司',short:'青禾智能装备',region:'杭州市',province:'浙江省',industry:'先进制造',research:true,digital:true,authorized:true},
    {id:'yunce',name:'杭州云策人工智能有限公司',short:'云策人工智能',region:'杭州市',province:'浙江省',industry:'人工智能',research:null,digital:true,authorized:true},
    {id:'yuanchuan',name:'宁波远川物流有限公司',short:'远川物流',region:'宁波市',province:'浙江省',industry:'物流行业',research:false,digital:null,authorized:true},
    {id:'jinyue',name:'绍兴锦越新材料有限公司',short:'锦越新材料',region:'绍兴市',province:'浙江省',industry:'新材料',research:true,digital:null,authorized:true},
    {id:'huizhi',name:'杭州汇智企业服务有限公司',short:'汇智企业服务',region:'杭州市',province:'浙江省',industry:'金融服务',research:null,digital:null,authorized:false},
  ];
  const defaults = {role:'enterprise',mode:'policy',policy:'innovation-support',company:companies[0].id,selected:[]};
  let state = {...defaults,selected:[]};
  let storageError = '';
  const E = value => window.PolicyUI.escape(value);
  const I = name => window.PolicyUI.icon(name);
  const policies = () => window.PolicyData.policies.filter(policy => !policy.public);
  const title = policy => policy.title.replace(/（演示）/g,'');
  const period = '2026年度';
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (saved && typeof saved === 'object') {
      state.role = saved.role === 'researcher' ? 'researcher' : 'enterprise';
      state.mode = saved.mode === 'company' ? 'company' : 'policy';
      if (policies().some(item => item.id === saved.policy)) state.policy = saved.policy;
      if (companies.some(item => item.id === saved.company)) state.company = saved.company;
      if (Array.isArray(saved.selected)) state.selected = [...new Set(saved.selected.filter(key => typeof key === 'string' && key.length < 160))].slice(0,100);
    }
  } catch { storageError = '无法读取上次的筛选，本次已恢复默认选项。'; }
  function save() {
    try {localStorage.setItem(storageKey,JSON.stringify(state));storageError='';}
    catch {storageError='当前筛选无法保存到本机，刷新后可能需要重新选择。';}
  }
  function match(company,policy) {
    if (!company.authorized) return {status:'unauthorized',label:'待企业授权',reason:'取得企业资料使用授权后，再核对画像与政策条件。'};
    if (policy.region !== company.region && policy.region !== company.province) return {status:'unmatched',label:'地区不匹配',reason:`企业注册地为${company.region}，本政策适用范围为${policy.region}。`};
    const field = policy.id === 'innovation-support' ? 'research' : policy.id === 'digital-upgrade' ? 'digital' : null;
    if (field && company[field] === false) return {status:'unmatched',label:'方向不匹配',reason:field === 'research' ? '企业档案尚无研发项目，先确认是否有对应申报业务。' : '企业档案尚无数字化项目，先确认是否有对应申报业务。'};
    if (!field || company[field] === null) return {status:'unknown',label:'待核实',reason:field ? '地区在适用范围内，项目情况与证明材料仍待补充核对。' : '地区在适用范围内，成长条件、申报要求与模板需进一步核实。'};
    return {status:'matched',label:'初步匹配',reason:field === 'research' ? '注册地区与研发方向相符；研发费用、年度财务及其他条件待核对。' : '注册地区与数字化方向相符；实施记录、投入凭证及其他条件待核对。'};
  }
  function opportunity(company,policy) {
    const key = `${company.id}:${policy.id}:2026`;
    const task = window.PolicyStore.getState().tasks.find(item => item.request.includes(`申报机会编号：${key}\n`) && item.policyId === policy.id && item.company.name === company.name);
    return {key,company,policy,task,...match(company,policy)};
  }
  function rows() {
    const items = state.mode === 'policy'
      ? companies.map(company => opportunity(company,policies().find(item=>item.id===state.policy)))
      : policies().map(policy => opportunity(companies.find(item=>item.id===state.company),policy));
    return items.sort((a,b)=>({matched:0,unknown:1,unmatched:2,unauthorized:3}[a.status] - {matched:0,unknown:1,unmatched:2,unauthorized:3}[b.status]));
  }
  const selectable = row => !row.task && ['matched','unknown'].includes(row.status);
  function selectedRows() {return rows().filter(row => selectable(row) && state.selected.includes(row.key));}
  function syncSelection() {
    const selected = selectedRows();
    const all = document.querySelector('#batch-select-all');
    if (all) {
      const count = rows().filter(selectable).length;
      all.checked = count > 0 && selected.length === count;
      all.indeterminate = selected.length > 0 && selected.length < count;
      all.disabled = count === 0;
    }
    document.querySelectorAll('[data-batch-select]').forEach(input => {
      input.checked = state.selected.includes(input.value) && !input.disabled;
      input.closest('tr').classList.toggle('is-selected',input.checked);
    });
    const summary = document.querySelector('#batch-selection-count');
    if (summary) summary.textContent = `已选 ${selected.length} 项`;
    const button = document.querySelector('[data-action="batch-create"]');
    if (button) {button.disabled=!selected.length;button.textContent=selected.length ? `创建 ${selected.length} 个项目` : '创建申报项目';}
    const warning = document.querySelector('#batch-storage-status');
    if (warning) warning.textContent=storageError;
  }
  function setRole(role) {
    state.role = role === 'researcher' ? 'researcher' : 'enterprise';
    save();
  }
  function renderEntry() {
    if (state.role !== 'researcher') return '';
    return `<section class="batch-entry"><div class="batch-entry-icon">${I('layers')}</div><div><h2>为多家企业寻找申报机会</h2><p>从一条政策筛选企业，或为一家企业查找更多政策。</p></div><button type="button" class="button button-primary" data-route="batch">批量匹配 ${I('arrow')}</button></section>`;
  }
  function render() {
    const list = rows();
    const counts = {matched:list.filter(row=>row.status==='matched').length,unknown:list.filter(row=>row.status==='unknown').length,created:list.filter(row=>row.task).length};
    const modePolicy = state.mode === 'policy';
    const item = modePolicy ? policies().find(item=>item.id===state.policy) : companies.find(item=>item.id===state.company);
    const chooser = modePolicy
      ? `<label for="batch-policy">选择政策</label><select id="batch-policy">${policies().map(policy=>`<option value="${E(policy.id)}"${state.policy===policy.id?' selected':''}>${E(title(policy))}</option>`).join('')}</select><span class="batch-scope">${E(item.region)} · ${period}</span>`
      : `<label for="batch-company">选择企业</label><select id="batch-company">${companies.map(company=>`<option value="${E(company.id)}"${state.company===company.id?' selected':''}>${E(company.name)}</option>`).join('')}</select><span class="batch-scope">${E(item.region)} · ${E(item.industry)}</span>`;
    return `<div class="batch-page"><header class="page-header"><div><h1>批量匹配</h1><p class="muted">筛选机会，确认跟进，再交给专家推进。</p></div><span class="batch-customer-count">${companies.filter(item=>item.authorized).length} 家已授权企业</span></header>
      <section class="batch-search-card" aria-label="匹配范围"><div class="batch-modes" role="group" aria-label="匹配方向">${[['policy','从政策找企业','search'],['company','从企业找政策','building']].map(([mode,label,icon])=>`<button type="button" class="batch-mode${mode===state.mode?' is-active':''}" data-action="batch-mode" data-mode="${mode}" aria-pressed="${mode===state.mode}">${I(icon)}${label}</button>`).join('')}</div><div class="batch-chooser">${chooser}</div></section>
      <div class="batch-summary" aria-label="当前匹配结果"><div><strong>${counts.matched}</strong><span>初步匹配</span></div><div><strong>${counts.unknown}</strong><span>条件待核实</span></div><div><strong>${counts.created}</strong><span>已创建项目</span></div><p>按企业档案筛选，具体资格与材料由顾问逐项核对。</p></div>
      <section class="batch-results" aria-labelledby="batch-results-title"><div class="batch-results-heading"><h2 id="batch-results-title">${modePolicy?'企业匹配结果':'候选政策'}</h2><span>${list.length} 项结果</span></div><div class="batch-table-scroll" tabindex="0" role="region" aria-label="匹配结果列表，可横向滚动"><table class="batch-table"><thead><tr><th class="batch-checkbox-cell"><input id="batch-select-all" type="checkbox" aria-label="选择所有可跟进机会"${list.some(selectable)?'':' disabled'}></th><th scope="col">${modePolicy?'企业':'政策'}</th><th scope="col">匹配情况</th><th scope="col">依据与待核对事项</th><th scope="col">项目</th></tr></thead><tbody>${list.map(row=>`<tr data-opportunity="${E(row.key)}" data-authorized="${row.company.authorized}" data-match="${row.status}"${row.task?` data-task="${E(row.task.id)}"`:''} class="${selectable(row)&&state.selected.includes(row.key)?'is-selected':''}"><td class="batch-checkbox-cell"><input type="checkbox" data-batch-select value="${E(row.key)}" aria-label="选择${E(modePolicy?row.company.name:title(row.policy))}"${selectable(row)?'':' disabled'}${selectable(row)&&state.selected.includes(row.key)?' checked':''}></td><th scope="row"><strong>${E(modePolicy?row.company.name:title(row.policy))}</strong><span>${E(modePolicy?`${row.company.region} · ${row.company.industry}`:`${row.policy.region} · ${period}`)}</span></th><td><span class="tag ${row.status==='matched'?'tag-success':row.status==='unknown'?'tag-warn':'tag-muted'}">${row.label}</span></td><td class="batch-reason">${E(row.reason)}</td><td>${row.task?`<button type="button" class="text-button" data-route="task" data-task="${E(row.task.id)}" data-work="profile">继续处理 ${I('arrow')}</button>`:`<span class="batch-project-state">${row.status==='unauthorized'?'授权后匹配':row.status==='unmatched'?'暂不跟进':'待创建'}</span>`}</td></tr>`).join('')}</tbody></table></div><div class="batch-actions"><div><strong id="batch-selection-count">已选 ${selectedRows().length} 项</strong><span>每项机会创建独立项目，对话、材料和进度分别管理。</span></div><button type="button" class="button button-primary" data-action="batch-create"${selectedRows().length?'':' disabled'}>${selectedRows().length?`创建 ${selectedRows().length} 个项目`:'创建申报项目'}</button></div></section><p id="batch-storage-status" class="batch-storage-status" role="status">${E(storageError)}</p></div>`;
  }
  function handleChange(target) {
    if (!target || state.role !== 'researcher') return false;
    if (target.id === 'batch-policy' || target.id === 'batch-company') {
      const kind = target.id === 'batch-policy' ? 'policy' : 'company';
      const items = kind === 'policy' ? policies() : companies;
      if (!items.some(item=>item.id===target.value)) return true;
      state[kind]=target.value;state.selected=[];save();window.PolicyUI.refresh();
      document.getElementById(target.id)?.focus({preventScroll:true});return true;
    }
    if (target.id === 'batch-select-all') {
      state.selected=target.checked ? rows().filter(selectable).map(row=>row.key) : [];
    } else if (target.matches('[data-batch-select]')) {
      if (!rows().some(row=>row.key===target.value && selectable(row))) return true;
      state.selected=state.selected.filter(key=>key!==target.value);
      if(target.checked)state.selected.push(target.value);
    } else return false;
    save();syncSelection();return true;
  }
  function handleClick(target) {
    if (!target.dataset.action?.startsWith('batch-')) return false;
    if (state.role !== 'researcher') return true;
    if (target.dataset.action === 'batch-mode') {
      if (!['policy','company'].includes(target.dataset.mode) || state.mode===target.dataset.mode) return true;
      state.mode=target.dataset.mode;state.selected=[];save();window.PolicyUI.refresh();
      document.querySelector(`[data-action="batch-mode"][data-mode="${state.mode}"]`)?.focus({preventScroll:true});
    } else if (target.dataset.action === 'batch-create') {
      const selection=selectedRows();
      let count=0;
      for(const row of selection) {
        const task=window.PolicyStore.createTask({
          title:`${row.company.short} · ${title(row.policy)}`,policyId:row.policy.id,
          company:{name:row.company.name,region:row.company.region,industry:row.company.industry},
          request:`申报机会编号：${row.key}\n为${row.company.name}核对${period}${title(row.policy)}。\n初筛依据：${row.reason}\n请先确认企业资料、政策适用条件与申报批次，再推进组稿。`,
          notes:`${period}；批量匹配后待顾问核对。`,
        });
        if (task) count++;
      }
      state.selected=[];save();window.PolicyUI.refresh();
      window.PolicyUI.toast(count ? `已创建 ${count} 个项目，可从“继续处理”或最近对话进入。` : '没有新增项目，请选择尚未跟进的机会。');
    }
    return true;
  }
  window.PolicyBatch=Object.freeze({storageKey,getRole:()=>state.role,setRole,render,renderEntry,handleClick,handleChange,syncSelection});
})();
