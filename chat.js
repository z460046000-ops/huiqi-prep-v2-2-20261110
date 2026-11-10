/* 项目与事项分开的本地对话；回答读取当前资料，业务执行只由明确按钮触发。 */
(() => {
  'use strict';
  const S = () => window.PolicyStore;
  const U = () => window.PolicyUI;
  const drafts = new Map();
  const scrollPositions = new Map();
  const experts = {
    profile: { ...window.PolicyPersonas.get('profile'), subject: '企业档案', icon: 'building', prompts: ['企业档案还缺什么？', '哪些资料已经提供？'], placeholder: '补充企业情况，或问问档案还缺什么……' },
    match: { ...window.PolicyPersonas.get('match'), subject: '政策匹配', icon: 'search', prompts: ['为什么匹配这个政策？', '申报条件是什么？'], placeholder: '问问匹配原因、政策条件或适用范围……' },
    interpret: { ...window.PolicyPersonas.get('interpret'), subject: '条件解读', icon: 'book', prompts: ['申报条件怎么看？', '需要准备哪些材料？'], placeholder: '问问政策条款、适用范围或材料要求……' },
    diagnosis: { ...window.PolicyPersonas.get('diagnosis'), subject: '差距诊断', icon: 'check', prompts: ['还差哪些材料？', '应该先补什么？'], placeholder: '问问当前缺口，或需要补充哪些证明……' },
    assembly: { ...window.PolicyPersonas.get('assembly'), subject: '材料组稿', icon: 'file', prompts: ['还缺哪些材料？', '材料怎么润色？'], placeholder: '问问缺什么材料，或者该怎么写……' },
    guidance: { ...window.PolicyPersonas.get('guidance'), subject: '办理指引', icon: 'route', prompts: ['提交前需要核对什么？', '去哪里办理申报？'], placeholder: '问问办理步骤、签章或提交前的检查……' },
    review: { ...window.PolicyPersonas.get('review'), subject: '人工确认', icon: 'book', prompts: ['这个版本还要核对什么？', '有哪些历史版本？'], placeholder: '问问当前版本、引用来源或待核对内容……' },
    general: { ...window.PolicyPersonas.get('general'), subject: '项目沟通', icon: 'book', prompts: ['当前项目进展如何？', '接下来先处理什么？'], placeholder: '问问项目进度、资料缺口或材料版本……' },
  };
  const validWork = value => Object.hasOwn(experts, value) ? value : 'general';
  const versionsFor = task => S().getState().versions.filter(version => version.taskId === task.id).sort((a, b) => b.number - a.number);
  const policyFor = task => window.PolicyData.policies.find(policy => policy.id === task.policyId);
  const incomplete = task => task.requirements.filter(item => item.status !== 'ready' && item.required !== false);
  const keyFor = (taskId, workId) => `${taskId}:${workId}`;
  const summary = task => `${Object.values(task.steps).filter(Boolean).length}/5 项工作已完成；资料准备 ${task.requirements.filter(item => item.status === 'ready').length}/${task.requirements.length} 项。`;
  const gapsText = task => {
    const missing = task.requirements.filter(item => item.status === 'missing');
    const unknown = task.requirements.filter(item => item.status === 'unknown');
    const unmet = task.requirements.filter(item => item.status === 'unmet');
    const parts = [];
    if (missing.length) parts.push(`待补资料：${missing.map(item => item.label).join('、')}。`);
    if (unknown.length) parts.push(`待核实：${unknown.map(item => item.label).join('、')}。`);
    if (unmet.length) parts.push(`当前不满足的条件：${unmet.map(item => item.label).join('、')}。`);
    return parts.join('\n') || '资料清单已具备，正文和有效性仍需人工核对。';
  };

  function answer(task, message = '', requestedWork = 'general') {
    const workId = validWork(requestedWork);
    const policy = policyFor(task);
    const versions = versionsFor(task);
    const latest = versions[0];
    const gaps = incomplete(task);
    // 政策解读与匹配合成一步：选中哪条，就按哪条回答。
    if (workId === 'interpret' || workId === 'match' && task.interpretPolicyId) {
      const picked = window.PolicyData.policies.find(item => item.id === (task.interpretPolicyId || (workId === 'interpret' && task.steps.match ? task.policyId : '')));
      if (!picked) return '先选一项政策，我就能按它回答。';
      if (/通过率|成功率|概率|几率|能过|获批/.test(message)) return window.PolicyMatch.scoreText(task, window.PolicyPublicPolicies?.find(item => item.id === picked.id));
      if (/材料|资料|准备|证明/.test(message)) return `${picked.title}\n所需材料：${picked.materials.join('、')}\n材料要和企业实际情况逐项对应。`;
      if (/时间|截止|什么时候|期限|还来得及/.test(message)) return `${picked.title}\n申报时间：${picked.deadline}\n具体批次以原文为准。`;
      if (/符合|能不能|能否|满足|够格/.test(message)) return `${picked.title}\n申报条件：\n${picked.conditions.map((condition,index)=>`${index+1}. ${condition}`).join('\n')}\n我只能帮你对照已有信息，能否申报要看原文和证明材料。`;
      if (/原文|链接|哪里看|出处/.test(message)) return picked.sourceUrl ? `政策原文：${picked.sourceUrl}` : '这项政策暂无原文链接。';
      if (/部门|谁发|哪里办|受理/.test(message)) return `${picked.title}\n发布部门：${picked.agency}`;
      return `${picked.title}\n${picked.summary}\n申报条件：\n${picked.conditions.map((condition,index)=>`${index+1}. ${condition}`).join('\n')}\n所需材料：${picked.materials.join('、')}`;
    }
    if (workId === 'guidance') {
      if (/已提交|已经提交|通过了吗|获批/.test(message)) return '当前没有官方平台的提交回执或审批结果，不能据此判断已经提交或获批。可以先核对材料版本与办理渠道。';
      return `办理前先核对四件事：\n1. 确认政策原文、申报批次与截止时间。\n2. 按清单整理正文及附件，核对签字、盖章和文件格式。\n3. 由企业负责人确认准备提交的版本。\n4. 按政策指定的官方渠道办理并保存回执。\n${latest ? `本项目最新材料为 V${latest.number}，${latest.status==='confirmed'?'已由你确认':'仍待核对'}。` : '本项目尚未保存材料版本，可以先准备资料。'}本平台不会代为提交政府申报。`;
    }
    if (/成功|概率|几率|获批/.test(message)) return '本产品不估算获批概率。可以到“政策解读与匹配”看匹配度和材料准备度，并逐项核对差距。';
    if (/已经(?:查|匹配|保存|补)|帮我(?:查|匹配|保存|补|生成|组稿)|开始(?:查|匹配|组稿)|直接(?:查|保存|生成)/.test(message)) {
      return '可以，点下方的按钮继续。' + '';
    }
    if (/版本|历史|保存/.test(message)) {
      return latest ? `本项目已保存 ${versions.length} 个材料版本，最新为 V${latest.number}（${latest.status === 'confirmed' ? '已确认' : '待核对'}）。每个版本保留当时的正文和引用资料，修改后需要另存新版本。` : '本项目还没有材料版本。传好材料后可以生成 Word。';
    }
    if (/来源|依据|正文|引用/.test(message) && ['assembly', 'review'].includes(workId)) {
      const available = task.sources.filter(source => source.provided && source.text.trim());
      return `当前可用来源 ${available.length} 份：${available.map(source => source.name).join('、') || '尚未提供'}。组稿只组织这些资料，缺失事实保留待补；保存的版本会同时保留引用快照。`;
    }
    if (/进度|进展|处理什么|接下来/.test(message)) return `${summary(task)}\n${gapsText(task)}\n可以先处理需要你补充或核对的事项；已有资料支持的工作可以继续准备。`;
    if (workId === 'profile') {
      const fields = [['name', '企业名称'], ['region', '地区'], ['industry', '行业']].filter(([field]) => !String(task.company[field] || '').trim()).map(([, label]) => label);
      const available = task.sources.filter(source => source.provided && source.text.trim());
      if (/已经|哪些资料|已提供/.test(message)) return available.length ? `本项目目前有 ${available.length} 份资料：${available.map(source => source.name).join('、')}。可以打开资料正文核对，不能仅凭文件名称认定条件满足。` : '本项目尚未录入资料。请先核对企业名称、注册地区、行业，再补充对应的企业资料。';
      return fields.length ? `企业档案还缺：${fields.join('、')}。先补充这些基本信息，已有资料也可以同时整理。` : `${task.company.name}，${task.company.region}，${task.company.industry}。${task.steps.profile ? '企业档案已确认。' : '基本信息已录入，尚待你确认。'}当前可用资料 ${available.length} 份，修改企业事实后需要重新核对政策匹配。`;
    }
    if (workId === 'match') {
      if (!task.steps.match) return '点一条政策，我按它给你解读。';
      if (/条件|范围|要求/.test(message)) return `${policy.title}\n${policy.conditions.join('\n')}\n以上条件来自当前政策模板，实际申报仍需核对正式文件。`;
      return `${policy.title}\n当前匹配依据：\n${policy.matchedReasons.join('\n')}\n这是候选项目，仍需结合具体条件和企业证明资料核对。`;
    }
    if (workId === 'diagnosis') {
      if (!task.steps.match) return '我负责对照政策，查出还缺什么材料。现在还没选政策，也可以先问我一般要准备什么。';
      if (!task.steps.diagnosis) return `已选政策：${policy.title}。点“开始核对”就能看到缺什么。`;
      if (!message) return '缺少证明材料只表示还不能判断，不等于企业不符合条件。缺的可以直接在这里补。';
      return `${gapsText(task)}\n缺少证明材料表示尚不能判断，不等于企业不符合条件。补充后可以继续核对。`;
    }
    if (workId === 'assembly') {
      if (!task.steps.match) return '先选一项要申报的政策，我就能按它列出要准备的材料。';
      if (!policy.template) return '当前项目没有申报模板，可先整理材料清单与填写指引。模板明确后再按章节组稿。';
      if (/润色|怎么写/.test(message)) return '上传或生成材料后，点“AI 建议”右边的“查看”，我会逐条列出原文、问题和修改建议。';
      return gaps.length ? `${gapsText(task)}
缺的内容传上来后，我帮你解析和润色。` : '政策要求的材料都齐了，可以生成 Word，下载修改后再传回来。';
    }
    if (workId === 'review') {
      if (!latest) return '当前还没有材料版本。传好材料后可以生成 Word。';
      const pending = latest.sections.filter(section => S().hasPendingMark(section.body));
      if (latest.status === 'confirmed') return `V${latest.number} 已由你确认。可以查看正文和引用快照；后续修改请保存新版本。材料确认不代表已向政府提交或获批。`;
      return `待核对版本：V${latest.number}。${gaps.length ? `还有 ${gaps.length} 项资料或条件待处理。` : '准备清单已具备。'}${pending.length ? `其中 ${pending.length} 个章节保留待补或待核对标记。` : ''}\n请核对企业事实、财务口径与引用来源，最终确认由你完成。`;
    }
    if (!task.steps.profile) return '先核对企业档案，确认地区、行业和可用资料。政策资料可以同时了解，针对企业的判断需要这些基本信息。';
    if (!task.steps.match) return '企业档案已确认，可以查找候选政策，也可以继续补充企业资料。';
    if (!task.steps.diagnosis) return '候选政策已确定，可以核对申报条件和材料差距。';
    return `${summary(task)}\n${gapsText(task)}${gaps.length ? '\n可以先准备已有资料支持的章节，缺失部分继续补充。' : '\n可继续整理草稿，并由你核对材料版本。'}`;
  }

  function actionFor(task, workId) {
    const latest = versionsFor(task)[0];
    if (workId === 'interpret') return { route: 'policy', id: task.policyId, label: '查看政策条件', detail: '对照适用对象、申报条件和材料要求。' };
    if (workId === 'guidance') return latest && latest.status !== 'confirmed' ? { route: 'task', work: 'review', label: `先核对 V${latest.number}`, detail: '提交前先逐段核对材料，确认后再看办理清单。' } : { route: 'guidance', label: '查看办理清单', detail: '核对提交前准备、材料版本及官方办理渠道。' };
    if (workId === 'profile') return { route: 'profile', label: '核对企业档案', detail: '确认企业信息，查看并补充资料来源。' };
    if (workId === 'match') {
      if (!task.steps.profile) return { route: 'profile', label: '先核对企业档案', detail: '企业地区与行业确认后，可以筛选候选政策。' };
      return task.steps.match ? { route: 'policy', label: '查看候选政策', detail: '查看匹配原因、适用条件和材料要求。' } : { action: 'run-match', label: '查找候选政策', detail: '根据当前企业档案筛选政策。' };
    }
    if (workId === 'diagnosis') {
      if (!task.steps.match) return { route: 'policy', label: '先选择候选政策', detail: '明确申报要求后，再核对企业差距。' };
      return task.steps.diagnosis ? { route: 'diagnosis', label: '查看并补充缺口', detail: '逐项补充资料，核对待确认的条件。' } : { action: 'run-diagnosis', label: '核对申报差距', detail: '对照政策要求，核对已有资料和缺口。' };
    }
    if (workId === 'review') return latest ? { route: 'version', id: latest.id, label: `核对 V${latest.number}`, detail: '查看正文与来源，由你确认材料版本。' } : { route: 'assembly', label: '先保存材料草稿', detail: '保存首版后，才能核对正文与来源快照。' };
    if (workId === 'assembly') return { route: 'task', work: 'assembly', label: '继续准备材料', detail: '传好材料后可以生成 Word。' };
    const next = !task.steps.profile ? 'profile' : !task.steps.match ? 'match' : !task.steps.diagnosis ? 'diagnosis' : !task.steps.assembly ? 'assembly' : 'review';
    return actionFor(task, next);
  }

  /* 政策申报辅助：每份材料一张卡。两条路得到同一份文件：上传完整文件，或批量传零散资料由 AI 生成。 */
  function prepMarkup(task) {
    const E=U().escape,I=U().icon,expert=experts.assembly;
    const materials=task.requirements.filter(item=>item.kind==='material'&&item.required!==false);
    const optional=task.requirements.filter(item=>item.kind==='material'&&item.required===false);
    const done=materials.filter(item=>item.status==='ready').length;
    const accept='.doc,.docx,.txt,.md,.htm,.html,.pdf,.jpg,.jpeg,.png';
    const card=(item,compact=false)=>{
      const attrs=`data-task="${E(task.id)}" data-source="${E(item.sourceId||'')}"`;
      const source=task.sources.find(entry=>entry.id===item.sourceId);
      const count=window.PolicyMaterials?.generatingCount(task.id,item.sourceId)||0;
      const ready=item.status==='ready'&&source;
      const generated=ready&&source.type==='generated';
      const note=!ready?window.PolicyMatch?.applicationNote(task,item)||'':'';
      const state=count?['is-busy','生成中']:generated?['is-done','AI 已生成']:ready?['is-done','已上传']:item.required===false?['','选填']:['','待准备'];
      const head=`<header class="prep-card-head"><span class="prep-card-icon" aria-hidden="true">${I('file')}</span><h4><button type="button" class="prep-card-open" data-action="material-review" ${attrs}>${E(item.label)}</button></h4><span class="prep-state ${state[0]}">${state[0]==='is-done'?I('check'):''}${state[1]}</span></header>`;
      const generate=label=>`<label class="prep-alt-link">${I('spark')}<span>${label}</span><input type="file" multiple data-source-generate ${attrs} accept="${accept}" aria-label="批量选择零散资料，AI 生成${E(item.label)}"></label>`;
      let body='';
      if(count)body=`<div class="prep-busy" role="status"><span class="prep-spinner" aria-hidden="true"></span><div><strong>AI 正在生成《${E(item.label)}》</strong><small>正在从 ${count} 份资料里提取内容</small></div></div>`;
      else if(ready){
        const fileName=source.fileName||`${item.label}.doc`;
        body=`<div class="prep-file"><span class="prep-file-icon" aria-hidden="true">${I('file')}</span><div class="prep-file-text"><strong title="${E(fileName)}">${E(fileName)}</strong></div><div class="prep-file-actions"><button type="button" class="text-button prep-file-delete" data-action="material-delete" ${attrs}>删除</button><label class="chat-gap-upload">重新上传<input type="file" data-source-upload ${attrs} accept="${accept}" aria-label="重新上传${E(item.label)}"></label></div></div><div class="prep-advice"><div class="prep-advice-head"><span class="prep-advice-mark" aria-hidden="true">${I('spark')}</span><b>AI 建议</b><button type="button" class="text-button prep-advice-view" data-action="material-review" ${attrs}>查看 ${I('chevron')}</button></div><p>${E(window.PolicyMatch?.materialAdvice(task,source)||'')}</p></div>`;
      }else if(compact)body=`<div class="prep-compact-actions"><label class="prep-compact-upload">上传文件<input type="file" data-source-upload ${attrs} accept="${accept}" aria-label="上传${E(item.label)}"></label>${generate('AI 生成')}</div>`;
      else body=`<label class="prep-drop"><span class="prep-drop-icon" aria-hidden="true">${I('upload')}</span><span class="prep-drop-title"><b>上传完整文件</b><small>Word、PDF、图片</small></span><input type="file" data-source-upload ${attrs} accept="${accept}" aria-label="上传${E(item.label)}"></label><div class="prep-alt"><span>只有零散资料？</span>${generate('批量上传，AI 生成')}${I('chevron')}</div>`;
      return `<article class="prep-card${ready?' is-ready':''}${compact&&!ready&&!count?' is-compact':''}" data-status="${E(item.status)}">${head}${note?`<p class="prep-card-note">${E(note)}</p>`:''}${body}</article>`;
    };
    const percent=materials.length?Math.round(done/materials.length*100):0;
    return `<div class="chat-message-row is-assistant chat-prep-row"><span class="chat-message-avatar chat-message-expert-avatar" aria-hidden="true" style="--portrait-x:${expert.x}%;--portrait-y:${expert.y}%"></span><div class="chat-message-body"><span class="chat-message-name">${E(expert.name)}</span><div class="chat-message chat-assistant chat-confirmation-bubble prep-bubble" role="group" aria-label="申报材料进度"><header class="prep-head"><div class="prep-head-text"><h3>${E(policyFor(task)?.title||task.title)}</h3>${window.PolicyMatch?.applicationIntro(task)||''}</div><div class="prep-progress"><strong>已准备 ${done} / ${materials.length} 项</strong><span class="prep-progress-track" role="progressbar" aria-valuenow="${done}" aria-valuemax="${materials.length}" aria-label="已准备 ${done}/${materials.length} 项"><i style="width:${percent}%"></i></span></div></header><div class="prep-grid">${materials.map(item=>card(item)).join('')}</div>${optional.length?`<h4 class="prep-subhead">选填材料</h4><div class="prep-stack">${optional.map(item=>card(item,true)).join('')}</div>`:''}</div></div></div>`;
  }

  function confirmationMarkup(task, workId) {
    const E=U().escape,I=U().icon,expert=experts[workId],policy=policyFor(task),latest=versionsFor(task)[0];
    const model=S().getWorkConfirmation(task.id,workId);
    const pending=U().getPendingDraft?.(task.id);
    const reasons=[...(pending?[pending.reason]:[]),...model.reasons];
    const labels={ready:'已具备',missing:'待补资料',unmet:'条件不满足',unknown:'待核实'};
    const provided=task.sources.filter(source=>source.provided && source.text.trim());
    const counts=Object.fromEntries(Object.keys(labels).map(status=>[status,task.requirements.filter(item=>item.status===status).length]));
    const facts=[];let title='',description='',confirmLabel='',gapList='',skipConfirm=false,ready=false;let actions=[];let gaps=[];
    if(workId==='profile'){
      title='请核对企业资料';description='确认企业信息后，继续核对适用政策。';confirmLabel='确认企业资料，继续匹配';
      facts.push(['企业名称',task.company.name||'待填写'],['注册地区',task.company.region||'待填写'],['所属行业',task.company.industry||'待填写'],['已提供资料',`${provided.length} 份`]);
      actions.push({action:'intake-edit',label:reasons.length?'补充资料':'修改企业信息'});
      if(!task.steps.profile)actions.push({action:'load-demo',label:'载入示例企业资料'});
    }else if(workId==='match'&&policy?.public&&task.steps.match){
      // 点申报就算选定，不再确认。这里只提示接着去准备材料。
      title=`正在申报「${policy.title}」`;description='接着上传材料就行。';skipConfirm=true;
      actions.push({route:'task',work:'assembly',label:'去上传材料'});
    }else if(workId==='match'){
      title='确认本次申报项目';description='请核对政策方向和适用条件，确定本次要准备的项目。';confirmLabel='确认这个项目，继续诊断';
      facts.push(['拟申报政策',policy?.title||'尚未选择'],['政策地区',policy?.region||'待核对']);
      if(task.steps.match)gaps=Array.isArray(policy?.matchedReasons)?policy.matchedReasons:[];
      actions.push(task.steps.match?{route:'policy',id:task.policyId,label:'查看或调整政策'}:!task.steps.profile?{action:'match-chat',work:'match',label:'补充资料'}:{action:'run-match',label:'执行政策匹配'});
    }else if(workId==='diagnosis'){
      const left=incomplete(task).length;
      title=`已具备 ${counts.ready}/${task.requirements.length} 项`;
      description=left?`按这项政策，还差 ${left} 项必须补。可以现在补，也可以先去组稿，缺的内容会标成待补。`:'必须的资料都齐了，正文和有效性仍需人工核对。';
      confirmLabel=left?'先去组稿，缺的之后补':'继续组稿';

      if(!task.steps.match)actions.push({route:'task',work:'match',label:'去选政策'});
    }else{
      const sources=new Set((latest?.sections||[]).flatMap(section=>section.sourceIds));
      const pendingSections=(latest?.sections||[]).filter(section=>!section.body.trim()||S().hasPendingMark(section.body));
      // 必填材料和核对项都齐了就只说这一句；点查看时，没有版本或版本过期会自动生成新版本。
      ready=!model.confirmed&&Boolean(policy?.template)&&!policy?.noPolicy&&task.steps.profile&&task.steps.match&&task.steps.diagnosis&&!incomplete(task).length;
      if(latest&&!ready)facts.push(['材料版本',`V${latest.number}`],['正文章节',`${latest.sections.length} 章`],['引用资料',`${sources.size} 份`]);
      // 组稿确认和最终核对是同一次确认，确认后直接去办理。
      title=ready?'信息全部准备完成，请查看':!latest?'生成申报材料':model.confirmed?'材料已确认':'请确认这版材料';
      description=ready?'':!latest?'根据您的企业材料，产出 V1 版本。':model.confirmed?`V${latest.number} 已确认，接下来可以去办理。`:pendingSections.length?`有 ${pendingSections.length} 份材料还有待补充的内容，查看后可以修改，不影响继续。`:'确认后就可以下载 Word，到官方系统提交。';
      confirmLabel=latest?`确认 V${latest.number}，去办理`:'确认材料，去办理';
      if(ready){}
      else if(!latest)actions.push({action:'mat-produce',work:'assembly',label:'生成并下载 Word'});
      else if(model.confirmed)actions.push({route:'task',work:'guidance',label:'去办理'});
      else if(model.reasons.length)actions.push(...[!task.steps.match?{route:'task',work:'match',label:'去选政策'}:!task.steps.profile?{action:'match-chat',work:'match',label:'补充资料'}:!task.steps.diagnosis?{route:'task',work:'assembly',label:'继续上传资料'}:incomplete(task).length?{route:'task',work:'assembly',label:incomplete(task).some(item=>item.kind==='material')?'继续上传资料':'去核实'}:null].filter(Boolean));
    }
    if(pending)actions.unshift({route:pending.route,id:pending.params.id,label:pending.route==='assembly'?'保存当前草稿':pending.route==='source'?'保存当前资料':'保存企业修改'});
    const attrs=action=>`${action.route?`data-route="${action.route}"`:`data-action="${action.action}"`} data-task="${E(task.id)}" data-work="${E(action.work||workId)}"${action.id?` data-id="${E(action.id)}"`:''}`;
    const uniqueActions=actions.filter((action,index,list)=>list.findIndex(other=>other.route===action.route&&other.action===action.action&&other.id===action.id)===index);
    // 有必要条件没满足时不摆灰按钮，主按钮就是去补。
    const lead=skipConfirm||model.reasons.length&&latest?uniqueActions[0]:null;
    // 材料版本不在卡片上确认：点整张卡片打开抽屉，核对后在抽屉里确认。
    const reviewable=['assembly','review'].includes(workId)&&(latest||ready);
    // 齐备时版本过期不算问题，只留未保存草稿的提示。
    const shownReasons=ready?reasons.slice(0,pending?1:0):reasons;
    const showBlockers=shownReasons.length&&!(workId==='diagnosis'&&!task.steps.diagnosis)&&(latest||!['assembly','review'].includes(workId));
    return `<div class="chat-message-row is-assistant chat-confirmation-row" data-confirmation-work="${workId}"><span class="chat-message-avatar chat-message-expert-avatar" aria-hidden="true" style="--portrait-x:${expert.x}%;--portrait-y:${expert.y}%"></span><div class="chat-message-body"><span class="chat-message-name">${E(expert.name)}</span><div class="chat-message chat-assistant chat-confirmation-bubble${reviewable?' is-clickable':''}" role="group" aria-label="${E(title)}"><h3>${E(title)}</h3>${description?`<p class="chat-confirmation-summary">${E(description)}</p>`:''}${facts.length?`<dl class="chat-confirmation-facts">${facts.map(([label,value])=>`<div><dt>${E(label)}</dt><dd>${E(value)}</dd></div>`).join('')}</dl>`:''}${gapList}${gaps.length?`<ul class="chat-confirmation-details">${gaps.map(text=>`<li>${E(text)}</li>`).join('')}</ul>`:''}${showBlockers?`<ul class="chat-confirmation-blockers" aria-label="需要先处理的事项">${[...new Set(shownReasons)].map(reason=>`<li>${E(reason)}</li>`).join('')}</ul>`:''}<div class="chat-confirmation-actions">${uniqueActions.map(action=>`<button type="button" class="${action===lead?'button button-primary':'text-button'}" ${attrs(action)}>${E(action.label)} ${I('arrow')}</button>`).join('')}${reviewable?`<button type="button" class="${uniqueActions.length?'text-button':'button button-primary'} chat-card-open" data-action="mat-open-latest" data-task="${E(task.id)}" data-work="${E(workId)}"${latest?` data-version-id="${E(latest.id)}"`:''}>查看 ${I('arrow')}</button>`:''}${!reviewable&&!skipConfirm&&!model.confirmed&&!model.reasons.length?`<button type="button" class="button button-primary" data-action="confirm-work" data-task="${E(task.id)}" data-work="${workId}" data-confirmation-key="${model.fingerprint}"${['assembly','review'].includes(workId)&&model.versionId?` data-version-id="${E(model.versionId)}"`:''}${pending?' aria-disabled="true"':''}>${E(confirmLabel)}</button>`:''}</div></div></div></div>`;
  }

  function consultationMarkup(task, workId, action) {
    const E=U().escape,expert=experts[workId];
    const attrs=`${action.route?`data-route="${action.route}"`:`data-action="${action.action}"`} data-task="${E(task.id)}" data-work="${E(action.work||workId)}"${action.id?` data-id="${E(action.id)}"`:''}`;
    return `<div class="chat-message-row is-assistant"><span class="chat-message-avatar chat-message-expert-avatar" aria-hidden="true" style="--portrait-x:${expert.x}%;--portrait-y:${expert.y}%"></span><div class="chat-message-body"><span class="chat-message-name">${E(expert.name)}</span><div class="chat-message chat-assistant chat-confirmation-bubble"><p>${E(action.detail)}</p><div class="chat-confirmation-actions"><button type="button" class="text-button" ${attrs}>${E(action.label)} ${U().icon('arrow')}</button></div></div></div></div>`;
  }

  function render(taskId, requestedWork = 'general', options = {}) {
    const task = S().getTask(taskId);
    if (!task) return '';
    const E = U().escape, I = U().icon;
    const workId = validWork(requestedWork);
    const expert = experts[workId];
    const action = actionFor(task, workId);
    const messages = (task.messages || []).filter(message => validWork(message.workId) === workId);
    const history = workId === 'general' ? [] : (task.messages || []).filter(message => validWork(message.workId) === 'general');
    const messageHtml = (message, context = false) => {
      const isUser = message.role === 'user';
      const author = experts[validWork(message.workId)];
      const avatar = isUser
        ? '<span class="chat-message-avatar chat-message-user-avatar" aria-hidden="true">企</span>'
        : `<span class="chat-message-avatar chat-message-expert-avatar" aria-hidden="true" style="--portrait-x:${author.x}%;--portrait-y:${author.y}%"></span>`;
      return `<div class="chat-message-row ${isUser ? 'is-user' : 'is-assistant'}">${avatar}<div class="chat-message-body"><span class="chat-message-name">${isUser ? '企业负责人' : E(author.name)}</span><p class="chat-message chat-${message.role}${context ? ' chat-context' : ''}">${E(message.text)}</p></div></div>`;
    };
    const statusLabel = options?.statusLabel ? `<span class="chat-expert-status">${E(options.statusLabel)}</span>` : '';
    // 申报辅助还没选政策：先选，选好才知道要备哪些材料。
    const choosingPolicy=workId==='assembly'&&!task.steps.match&&!versionsFor(task).length;
    const noTemplate=workId==='assembly'?window.PolicyMatch?.noTemplateNotice(task)||'':'';
    const interpreting=noTemplate||(choosingPolicy?window.PolicyMatch?.assemblyPicker(task)||'':workId==='interpret'?window.PolicyMatch?.interpretMarkup(task)||'':workId==='guidance'?window.PolicyMatch?.guidanceMarkup(task)||'':'');
    const intake=interpreting||(workId==='profile'?window.PolicyMatch?.intakeMarkup(task)||'':workId==='match'?window.PolicyMatch?.matchChatMarkup(task)||'':'');
    const collecting=workId==='profile'&&window.PolicyMatch?.intakeActive(task)||workId==='match'&&window.PolicyMatch?.matchPending(task)||workId==='interpret'&&window.PolicyMatch?.interpretPicking(task);
    const attach=window.PolicyMatch?.composerAttach(task,workId==='profile'||workId==='match'&&window.PolicyMatch.intakeActive(task))||'';
    const needsPolicy=['diagnosis','assembly','review'].includes(workId)&&!task.steps.match&&!(workId==='assembly'&&policyFor(task)?.noPolicy);
    const prep=workId==='assembly'&&task.steps.match&&task.steps.diagnosis&&!noTemplate?prepMarkup(task):'';
    const prepOnly=prep&&incomplete(task).length>0;
    const currentTaskBubble=collecting||interpreting||prepOnly?'':needsPolicy?consultationMarkup(task,workId,{route:'task',work:'match',label:'去选政策',detail:'选定要申报的政策后，我就能开始。没选之前可以先问我。'}):['profile','match','diagnosis','assembly','review'].includes(workId)?confirmationMarkup(task,workId):consultationMarkup(task,workId,action);
    return `<section class="adviser-card${collecting?(workId==='interpret'?' is-picking':' has-intake'):''}" data-chat-task="${E(task.id)}" data-chat-work="${workId}" aria-label="${E(expert.name)}对话">
      <header><span class="role-avatar chat-expert-avatar" aria-hidden="true" style="--portrait-x:${expert.x}%;--portrait-y:${expert.y}%"></span><div class="chat-header-identity"><h2>${E(expert.name)}</h2><div class="chat-expert-meta"><span class="muted chat-expert-subject">${expert.doing ? `正在帮你${E(expert.doing)}` : E(expert.can)}</span>${statusLabel}</div></div></header>
      <div class="chat-scroll-region" tabindex="0" aria-label="对话记录"><div class="chat-messages" aria-live="polite">${intake || (prep ? '' : messageHtml({ role: 'assistant', text: answer(task, '', workId), workId }, true))}${messages.map(message => messageHtml(message)).join('')}${window.PolicyMatch?.uploadsMarkup(task,workId)||''}${prep}${currentTaskBubble}</div>
        ${history.length ? `<details class="chat-project-history"><summary>项目历史对话 <span>${history.length} 条</span></summary><div class="chat-messages">${history.map(message => messageHtml(message)).join('')}</div></details>` : ''}
      </div>
      <div class="chat-composer"><div class="chat-suggestions">${expert.prompts.map(prompt => `<button data-action="chat-prompt" data-task="${E(task.id)}" data-work="${workId}" data-prompt="${E(prompt)}">${E(prompt.replace(/[？?]$/, ''))}</button>`).join('')}</div>
        <form id="adviser-chat-form" data-task="${E(task.id)}" data-work="${workId}">${attach}<label class="sr-only" for="adviser-message">向${E(expert.name)}提问</label><textarea id="adviser-message" name="message" rows="1" maxlength="2000" required placeholder="${E(expert.placeholder)}">${E(drafts.get(keyFor(task.id, workId)) || '')}</textarea><button type="submit" class="icon-button chat-send" aria-label="发送问题">${I('arrow')}</button></form>
      </div>
    </section>`;
  }

  function captureView() {
    const panel = document.querySelector('.adviser-card[data-chat-task]');
    if (!panel || !S().getTask(panel.dataset.chatTask)) return false;
    const key = keyFor(panel.dataset.chatTask, validWork(panel.dataset.chatWork));
    const region = panel.querySelector(':scope > .chat-scroll-region');
    const input = panel.querySelector('#adviser-message');
    if (region) scrollPositions.set(key, region.scrollTop);
    if (input) drafts.set(key, input.value.slice(0, 2000));
    return true;
  }

  function restoreView({ followLatest = false } = {}) {
    const panel = document.querySelector('.adviser-card[data-chat-task]');
    if (!panel) return false;
    const key = keyFor(panel.dataset.chatTask, validWork(panel.dataset.chatWork));
    const region = panel.querySelector(':scope > .chat-scroll-region');
    const input = panel.querySelector('#adviser-message');
    if (input && drafts.has(key)) input.value = drafts.get(key);
    if (region) {
      const hasPosition = scrollPositions.has(key);
      let top = followLatest || !hasPosition ? region.scrollHeight : scrollPositions.get(key);
      if (region.clientHeight > 0 && (followLatest || !hasPosition)) {
        const regionBounds = region.getBoundingClientRect();
        if (followLatest) {
          const reply = [...region.querySelectorAll(':scope > .chat-messages > .chat-message-row.is-assistant')]
            .filter(row => row.querySelector('p.chat-assistant:not(.chat-context)')).at(-1);
          const replyBounds = reply?.getBoundingClientRect();
          if (replyBounds?.height > 0) top = region.scrollTop + replyBounds.bottom - regionBounds.top - region.clientHeight + 10;
        } else {
          const confirmation = region.querySelector(':scope > .chat-messages > .chat-confirmation-row, :scope > .chat-messages > .chat-prep-row');
          const confirmationBounds = confirmation?.getBoundingClientRect();
          if (confirmationBounds?.height > region.clientHeight) top = region.scrollTop + confirmationBounds.top - regionBounds.top - 10;
        }
        // 资料卡片从头开始看，不直接滚到卡片底部。
        const intakeRow = [...region.querySelectorAll('.intake-body')].at(-1)?.closest('.chat-message-row');
        const intakeBounds = intakeRow?.getBoundingClientRect();
        if (intakeBounds?.height > 0) top = region.scrollTop + intakeBounds.top - regionBounds.top - 10;
        top = Math.max(0, Math.min(top, region.scrollHeight - region.clientHeight));
      }
      region.scrollTop = top;
      scrollPositions.set(key, region.scrollTop);
    }
    return true;
  }

  function send(taskId, message, requestedWork = 'general') {
    const task = S().getTask(taskId);
    const workId = validWork(requestedWork);
    const value = typeof message === 'string' ? message.trim().slice(0, 2000) : '';
    if (!task || !value) return;
    const expertId = experts[workId].id;
    const saved = S().updateTask(task.id, { selectedWorkId: workId, messages: [...(task.messages || []), { role: 'user', text: value, workId, expertId }, { role: 'assistant', text: answer(task, value, workId), workId, expertId }] });
    if (!saved) { U().toast('对话未能保存，请重试。'); return; }
    const input = document.querySelector('#adviser-message');
    if (input?.closest('form')?.dataset.task === task.id && validWork(input.closest('form').dataset.work) === workId) input.value = '';
    drafts.delete(keyFor(task.id, workId));
    U().refresh();
    restoreView({ followLatest: true });
    document.querySelector('#adviser-message')?.focus({ preventScroll: true });
  }
  document.addEventListener('input', event => {
    if (event.target.id !== 'adviser-message') return;
    // 默认一行，内容多时再长高。
    event.target.style.height = 'auto';
    event.target.style.height = `${Math.min(event.target.scrollHeight, 96)}px`;
    const form = event.target.closest('form');
    if (form?.dataset.task) drafts.set(keyFor(form.dataset.task, validWork(form.dataset.work)), event.target.value.slice(0, 2000));
  });
  // 回车发送，Shift+回车换行；输入法选词时的回车不算。
  document.addEventListener('keydown', event => {
    if (event.target.id !== 'adviser-message' || event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
    event.preventDefault();
    event.target.form?.requestSubmit();
  });
  window.PolicyChat = Object.freeze({ render, captureView, restoreView, answerFor: answer,
    forgetTask(taskId) {
      for (const map of [drafts,scrollPositions]) {
        for (const key of map.keys()) if(key.startsWith(`${taskId}:`)) map.delete(key);
      }
    },
    handleClick(target) {
      if (target.dataset.action !== 'chat-prompt') return false;
      send(target.dataset.task, target.dataset.prompt, target.dataset.work);
      return true;
    },
    handleSubmit(form, event) {
      if (form.id !== 'adviser-chat-form') return false;
      event.preventDefault();
      send(form.dataset.task, new FormData(form).get('message') || '', form.dataset.work);
      return true;
    },
  });
})();
