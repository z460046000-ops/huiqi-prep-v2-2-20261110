/* 全部企业、政策和证明资料均为虚构演示案例，不对应真实政策结论。 */
(() => {
  'use strict';
  const services = [
    { id: 'profile', title: '采集企业信息', description: '把企业资料整理为可核对的档案，标出待补字段。', output: '企业档案与资料来源', tags: ['企业档案', '资料整理'], icon: 'building' },
    { id: 'search', title: '检索适用政策', description: '根据地区、行业和申报目标查看候选政策。', output: '候选政策与匹配原因', tags: ['政策匹配', '条件对照'], icon: 'search' },
    { id: 'interpret', title: '解读申报条件', description: '整理适用条件、材料要求和需要确认的事项。', output: '条件摘要与申报清单', tags: ['政策解读', '申报清单'], icon: 'book' },
    { id: 'diagnosis', title: '诊断申报差距', description: '区分资料缺失、条件不符和信息待核实。', output: '差距诊断与补充建议', tags: ['条件诊断', '改进建议'], icon: 'check' },
    { id: 'assembly', title: '按模板整理材料', description: '将已有资料放入模板，保留段落来源与待补内容。', output: '有来源的材料草稿与版本', tags: ['模板组稿', '版本记录'], icon: 'file' },
    { id: 'guidance', title: '查看办理指引', description: '整理提交前检查、办理步骤和需人工核实的问题。', output: '办理步骤与提交前检查', tags: ['办理指引', '人工确认'], icon: 'route' },
  ];
  const teams = [
    { id: 'application-preparation', title: '申报材料准备', description: '从企业档案开始，核对条件、补齐材料，再按模板整理和确认。', output: '企业档案、诊断清单与申报材料版本', serviceIds: ['profile', 'search', 'interpret', 'diagnosis', 'assembly', 'guidance'], tags: ['完整准备流程', '材料交付'] },
    { id: 'company-checkup', title: '企业申报体检', description: '先看看企业目前适合申报什么，以及哪些条件还需要核实。', output: '候选政策、准备情况与差距建议', serviceIds: ['profile', 'search', 'interpret', 'diagnosis'], tags: ['条件核对', '差距建议'] },
  ];
  const policies = [
    {
      id: 'innovation-support', title: '研发创新项目支持计划', agency: '政策库', region: '杭州市', deadline: '以原文为准',
      summary: '准备研发项目申报资料，实际适用条件和办理时间以正式文件为准。',
      conditions: ['企业注册地区与项目范围一致，需核对营业执照。', '拟申报研发项目能够提供项目记录和相关成果证明。', '财务及研发费用口径需依据材料核实。'],
      materials: ['营业执照', '企业简介', '知识产权证明', '研发项目记录', '研发费用归集表', '年度财务报告'],
      matchedReasons: ['企业档案中的注册地区为杭州市。', '已提供软件研发项目记录和知识产权材料。', '申报目标与研发创新项目材料准备相关。'],
      template: true, mockSuccess: 78, sourceLabel: '政策模板',
    },
    {
      id: 'digital-upgrade', title: '数字化应用项目扶持计划', agency: '政策库', region: '杭州市', deadline: '以原文为准',
      summary: '核对企业数字化项目的条件，并归档相关材料。',
      conditions: ['提供项目应用场景和企业基本资料。', '提供实施记录与可核实的成果说明。', '投入金额、年度收入等数据须由原始材料支持。'],
      materials: ['营业执照', '企业简介', '知识产权证明', '研发项目记录', '研发费用归集表', '年度财务报告'],
      matchedReasons: ['企业从事软件与信息服务。', '已有数字化管理软件的研发记录。', '可按现有资料进一步核对应用成果与财务口径。'],
      template: true, mockSuccess: 78, sourceLabel: '政策模板',
    },
    {
      id: 'growth-consulting', title: '成长型企业培育项目', agency: '政策库', region: '浙江省', deadline: '以原文为准',
      summary: '暂未配置申报模板，提供材料清单与填写指引。',
      conditions: ['企业所在地区在项目范围内。', '企业成长与研发情况需逐项核实。', '具体门槛和办理要求以正式文件为准。'],
      materials: ['营业执照', '企业简介', '知识产权证明', '研发项目记录', '研发费用归集表', '年度财务报告'],
      matchedReasons: ['企业档案位于浙江省内。', '已有研发与知识产权资料，可先进行准备情况核对。'],
      template: false, mockSuccess: 78, sourceLabel: '政策模板',
    },
  ];
  // 官方公开政策可被项目选用，用通用章节组稿（不是按政策原文整理），没有模拟成功率。枚举演示政策的地方按 public 过滤。
  const publicWindow = (policy) => policy.applicationEnd ? `截止 ${policy.applicationEnd}` : '暂无统一申报窗口';
  // 只组稿、还没选政策的项目用这一项，不出现在任何政策列表里。
  policies.push({ id: 'no-policy', title: '未选政策', agency: '', region: '', deadline: '', summary: '', conditions: [], materials: [], matchedReasons: [], template: true, genericTemplate: true, noPolicy: true, public: true, sourceLabel: '' });
  (window.PolicyPublicPolicies || []).forEach((policy) => policies.push({
    id: policy.id, title: policy.title, agency: policy.agency, region: policy.region, deadline: policy.applicationTimeNote || publicWindow(policy),
    summary: policy.summary, conditions: [...policy.conditions], materials: policy.materials.length ? [...policy.materials] : ['以原文要求为准'],
    matchedReasons: ['由政策匹配流程按企业所选内容列出，仍需核对原文。'], template: true, genericTemplate: true, sourceLabel: '官方公开政策', sourceUrl: policy.sourceUrl, public: true, application: policy.application,
  }));
  const sourceTemplates = [
    { id: 'business-license', name: '营业执照', type: 'registration', provided: true, text: '企业名称：杭州澄川数字科技有限公司；注册地区：杭州市；成立日期：2021-06-18；经营方向：软件与信息服务。' },
    { id: 'company-introduction', name: '企业简介', type: 'profile', provided: true, text: '企业从事企业管理软件与数据协作工具的开发和服务，现有员工 28 人。简介未提供年度营业收入、研发投入金额或认定资质。' },
    { id: 'intellectual-property', name: '知识产权证明', type: 'qualification', provided: true, text: '已提供“澄川协同管理软件”软件著作权证明。' },
    { id: 'research-project', name: '研发项目记录', type: 'project', provided: true, text: '研发项目：企业协同数据管理工具。现有记录包括需求整理、数据协作模块开发与内部功能验证。记录未提供研发费用、销售收入或外部验收结果。' },
    { id: 'research-expenses', name: '研发费用归集表', type: 'finance', provided: false, text: '' },
    { id: 'annual-financial', name: '年度财务报告', type: 'finance', provided: false, text: '' },
  ];
  const requirements = sourceTemplates.map((source) => ({
    id: source.id, label: source.name, status: source.provided ? 'ready' : 'missing', kind: 'material',
    evidence: source.provided ? `已提供${source.name}，可查看来源。` : `尚未提供${source.name}，不能据此判断企业条件不满足。`,
    sourceId: source.id, action: source.provided ? '查看资料' : '补充资料',
  }));
  const clone = (value) => JSON.parse(JSON.stringify(value));
  function createTaskSeed(overrides = {}) {
    const now = new Date().toISOString();
    const loadDemo = overrides.loadDemo === true || overrides.materials === true;
    const task = {
      id: '', title: '研发创新项目材料准备', request: '根据企业现有资料，核对研发创新项目准备情况并按模板整理申报材料。',
      company: loadDemo ? { name: '杭州澄川数字科技有限公司', region: '杭州市', industry: '软件与信息服务', established: '2021-06-18', employees: 28, revenue: null } : { name: '', region: '', industry: '', established: '', employees: '', revenue: null },
      policyId: policies[0].id, status: 'needs-input',
      steps: { profile: loadDemo, match: loadDemo, diagnosis: loadDemo, assembly: false, review: false },
      requirements: loadDemo ? clone(requirements) : requirements.map((item) => ({ ...item, status: 'unknown', evidence: '尚未核对企业资料，需先确认来源与适用要求。', action: '核对资料' })),
      sources: loadDemo ? clone(sourceTemplates) : sourceTemplates.map((source) => ({ ...source, text: '', provided: false })),
      createdAt: now, updatedAt: now, notes: '',
    };
    return { ...task, ...clone(overrides), company: { ...task.company, ...clone(overrides.company || {}) }, steps: { ...task.steps, ...clone(overrides.steps || {}) } };
  }
  const now = Date.now();
  const seedTasks = [
    createTaskSeed({ loadDemo: true, id: 'task-innovation', title: '研发创新项目材料准备', createdAt: new Date(now - 3 * 3600000).toISOString(), updatedAt: new Date(now - 12 * 60000).toISOString() }),
    createTaskSeed({ loadDemo: true, id: 'task-digital', title: '数字化应用项目条件核对', policyId: 'digital-upgrade', status: 'processing', request: '核对已有数字化项目资料，并整理需要进一步确认的申报条件。', createdAt: new Date(now - 5 * 3600000).toISOString(), updatedAt: new Date(now - 32 * 60000).toISOString() }),
    createTaskSeed({ loadDemo: true, id: 'task-review', title: '研发项目草稿待确认', status: 'review', steps: { assembly: true }, notes: '已保存 V1。缺少财务资料的段落保留待补标记，确认版本不等于已达到申报条件。', createdAt: new Date(now - 24 * 3600000).toISOString(), updatedAt: new Date(now - 65 * 60000).toISOString() }),
  ];
  const seedVersions = [{
    id: 'version-seed-v1', taskId: 'task-review', number: 1, status: 'draft', note: '根据已提供资料整理首版，财务与研发投入信息仍待补充。', createdAt: new Date(now - 65 * 60000).toISOString(),
    sections: [
      { id: 'company', title: '企业基本情况', body: '杭州澄川数字科技有限公司于2021年6月18日成立，注册地区为杭州市，从事软件与信息服务。企业简介载明现有员工28人。', sourceIds: ['business-license', 'company-introduction'] },
      { id: 'project', title: '研发项目与成果', body: '企业已提供“企业协同数据管理工具”的研发记录，涉及需求整理、数据协作模块开发与内部功能验证，并提供相关软件著作权材料。现有记录未包含外部验收结果。', sourceIds: ['research-project', 'intellectual-property'] },
      { id: 'finance', title: '经营与研发投入', body: '【待补充】尚未提供年度财务报告与研发费用归集表，不能填写年度营业收入、研发投入金额及相关比例。', sourceIds: [] },
    ],
  }];
  window.PolicyData = Object.freeze({ schemaVersion: 1, services, teams, policies, seedTasks, seedVersions, createTaskSeed });
})();
