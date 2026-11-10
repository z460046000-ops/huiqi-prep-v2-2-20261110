/* 官方公开政策摘录，核对日2026-10-30；收录范围不代表全部政策，行业标签为平台整理。 */
(() => {
  'use strict';
  const policies = [
    {
      id: 'zj-tech-sme-2026', projectId: 'zj-tech-sme', batchId: 'binjiang-2026',
      title: '2026年度浙江省科技型中小企业申报通知',
      region: '浙江省', industries: ['软件信息', '先进制造', '新能源', '生命健康', '现代服务'], supportType: '资质培育',
      publishedAt: '2026-04-23', applicationStart: null, applicationEnd: '2026-10-31', deadlineOnly: true,
      category: '申报通知', agency: '杭州高新区（滨江）科技局',
      sourceUrl: 'https://www.hhtz.gov.cn/col/col1485818/art/2026/art_11ec09ec4a6e4be6adee68e40d0b6ad4.html',
      summary: '面向滨江区科技型中小企业，核对技术成果、研发投入与人员证明，截止10月31日。',
      conditions: ['滨江区注册满一年，具有技术成果与研发投入，科技人员占比原则上不低于10%。'],
      materials: ['营业执照、技术成果证明、研发投入材料、职工社保证明。'],
      applicationTimeNote: '原文仅列截止日期，未列明申报开始日。',
    },
    {
      id: 'gd-ai-2027', projectId: 'gd-ai-rd', batchId: '2027',
      title: '2027年度广东省重点领域研发计划“人工智能”专项申报通知',
      region: '广东省', industries: ['软件信息', '先进制造'], supportType: '研发支持',
      publishedAt: '2026-09-10', applicationStart: '2026-09-04', applicationEnd: '2026-10-05',
      deadlineAt: '2026-10-05T17:00:00+08:00', category: '申报通知', agency: '深圳市科技创新局',
      sourceUrl: 'https://stic.sz.gov.cn/gkmlpt/content/12/12975/post_12975014.html',
      summary: '深圳转发广东省人工智能专项申报通知，本批次集中申报已于10月5日17时结束。',
      conditions: ['项目资格和研究方向须继续核对省科技厅专项指南。'],
      materials: [],
      applicationTimeNote: '申报截止时间为2026年10月5日17:00。',
    },
    {
      id: 'cn-tech-commerce-2026', projectId: 'cn-tech-commerce', batchId: '2026-551',
      title: '商务部等9部门关于加快推进科技兴商的意见',
      region: '全国', industries: ['软件信息', '先进制造', '现代服务'], supportType: '数字化改造',
      publishedAt: '2026-10-19', issuedAt: '2026-10-13', applicationStart: null, applicationEnd: null,
      category: '政策公告', agency: '商务部等9部门',
      sourceUrl: 'https://www.mofcom.gov.cn/zwgk/zcfb/art/2026/art_787f0441da1f4c0e8b5bad10118247f3.html',
      summary: '推进商贸数字化与技术应用，涵盖智能消费、供应链和商业新场景；本意见不是单项申报通知。',
      conditions: ['具体支持项目须按后续配套安排核对。'], materials: [],
    },
    {
      id: 'cn-logistics-2026', projectId: 'cn-logistics-leaders', batchId: '2026-4',
      title: '加快培育交通物流领军企业、提升产业链供应链服务保障能力行动方案',
      region: '全国', industries: ['现代服务', '软件信息'], supportType: '数字化改造',
      publishedAt: '2026-01-21', issuedAt: '2026-01-16', applicationStart: null, applicationEnd: null,
      category: '政策公告', agency: '交通运输部等8部门',
      sourceUrl: 'https://xxgk.mot.gov.cn/jigou/ysfws/202601/t20260121_4198258.html',
      summary: '引导物流企业整合网络、提高供应链服务与数字协同能力，未在本文件设置统一申报窗口。',
      conditions: ['具体项目和试点资格按有关配套通知核对。'], materials: [],
    },
    {
      id: 'cn-finance-2025', projectId: 'cn-finance-five-areas', batchId: '2025-8',
      title: '国务院办公厅关于做好金融“五篇大文章”的指导意见',
      region: '全国', industries: ['软件信息', '先进制造', '新能源', '生命健康', '现代服务'], supportType: '金融支持',
      publishedAt: '2025-03-05', issuedAt: '2025-03-02', applicationStart: null, applicationEnd: null,
      category: '政策公告', agency: '国务院办公厅',
      sourceUrl: 'https://app.www.gov.cn/govdata/gov/202503/05/525163/article.html',
      summary: '提出科技、绿色、普惠等领域金融服务方向；并非企业可以直接申请的固定补贴项目。',
      conditions: ['融资产品与申请要求按对应金融机构及配套政策核对。'], materials: [],
    },
    {
      id: 'sh-smart-grid-2026', projectId: 'national-smart-grid', batchId: '2026-open-call',
      title: '智能电网国家科技重大专项专题攻关公开项目申报通知',
      region: '上海市', industries: ['新能源', '软件信息'], supportType: '研发支持',
      publishedAt: '2026-10-28', issuedAt: '2026-10-26', applicationStart: '2026-10-28', applicationEnd: '2026-12-07',
      category: '申报通知', agency: '上海市科学技术委员会',
      sourceUrl: 'https://stcsm.sh.gov.cn/zwgk/kyjhxm/xmsb/20261028/c956023f49094f1a939b92ada9a8d61e.html',
      summary: '上海组织智能电网专项申报，线上填报期为10月28日至12月7日，附件须上传扫描件。',
      conditions: ['项目与单位资格须依国家能源局该专项指南核对。'],
      materials: ['网上申报书及指南要求的电子扫描附件。'],
      applicationTimeNote: '此为上海组织推荐通知，国家项目资格仍按专项指南核对。',
      // 依上海市科委通知和国家能源局指南通知整理，核对日2026-11-03。
      application: {
        checklist: [
          { id: 'application-form', label: '项目申报书', note: '在国科管系统在线填写', expects: ['目标', '指标', '创新思路', '技术路线', '研究基础'] },
          { id: 'joint-agreement', label: '联合申报协议', note: '牵头单位与所有课题单位签署，写明签署时间' },
          { id: 'integrity-letter', label: '诚信承诺书', note: '牵头单位、课题单位、项目和课题负责人都要签署' },
          { id: 'recommendation-letter', label: '推荐函', note: '推荐单位盖章，12月10日16:00前上传扫描件' },
          // 模拟数据：用来展示选填材料，不是通知原文列的要求。
          { id: 'supporting-proof', label: '佐证材料', required: false, note: '选填，有专利、获奖证明可以一起传' },
        ],
        templates: [{ label: '国家能源局申报指南通知', url: 'https://service2.most.gov.cn/kjjh_tztg_all/20261020/5916.html' }],
        templateNote: '这项政策在系统里在线填报。',
        submit: {
          name: '国家科技管理信息系统公共服务平台', url: 'http://service.most.gov.cn', deadline: '2026年12月7日16:00',
          steps: ['登录系统，在“公开公示-申报指南”里查看形式审查条件（指南附件2）。', '按指南方向在线填写申报材料。', '附件全部以电子扫描件上传。', '联系推荐单位，12月10日16:00前确认推荐并上传推荐函。'],
          contact: '项目申报咨询 010-57305701',
        },
      },
    },
    // 模拟数据：演示“库表缺失”——原文附件里有申请表，但数据表里没收录。不是真实政策。
    {
      id: 'digital-template-missing-demo', projectId: 'digital-template-missing-demo', batchId: '2026',
      title: '中小企业数字化改造补贴申报（示例：模板暂未收录）',
      subsidy: { prefix: '最高', value: '50', unit: '万' },
      region: '全国', industries: ['软件信息', '先进制造', '现代服务'], supportType: '数字化改造',
      publishedAt: '2026-10-25', issuedAt: '2026-10-22', applicationStart: '2026-10-25', applicationEnd: '2027-01-31',
      category: '申报通知', agency: '示例主管部门',
      sourceUrl: 'https://www.miit.gov.cn/',
      summary: '面向中小企业数字化改造项目的补贴。原文附件里有申报书模板，但数据表里暂未收录，需要从原文下载后上传。',
      conditions: ['申报主体为依法登记的中小企业。'],
      materials: ['申报书（按原文附件模板填写）', '营业执照', '数字化改造项目说明'],
      application: {
        templateStatus: 'missing',
        checklist: [
          { id: 'apply-form', label: '申报书', note: '按原文附件里的模板填写' },
          { id: 'business-license', label: '营业执照', note: '加盖公章的扫描件' },
          { id: 'project-brief', label: '数字化改造项目说明', note: '写明改造内容和投资额' },
        ],
        templates: [],
        templateNote: '原文附件有模板，数据表暂未收录',
        submit: {
          name: '示例办理平台', url: 'https://www.miit.gov.cn/', deadline: '2027年1月31日',
          steps: ['登录系统，选择数字化改造补贴事项。', '填写企业和项目信息。', '上传材料后提交。'],
          contact: '',
        },
      },
    },
    // 模拟数据：演示“没有申报模板的政策”，选它直接转到办理指引。不是真实政策。
    {
      id: 'ne-no-template-demo', projectId: 'ne-no-template-demo', batchId: '2026',
      title: '新能源装备技术改造补贴申报（示例）',
      subsidy: { prefix: '最高', value: '100', unit: '万' },
      region: '全国', industries: ['新能源'], supportType: '财政补贴',
      publishedAt: '2026-10-20', issuedAt: '2026-10-18', applicationStart: '2026-10-20', applicationEnd: '2027-03-31',
      category: '申报通知', agency: '示例主管部门',
      sourceUrl: 'https://www.nea.gov.cn/',
      summary: '面向新能源装备企业的技术改造补贴。这项政策没有统一的申报模板，按材料清单准备后到官方系统填报。',
      conditions: ['申报主体为新能源装备制造企业。'],
      materials: ['营业执照', '技术改造项目说明', '项目投资凭证'],
      application: {
        noTemplate: true,
        checklist: [
          { id: 'business-license', label: '营业执照', note: '加盖公章的扫描件' },
          { id: 'project-brief', label: '技术改造项目说明', note: '写明改造内容、投资额和完成时间' },
          { id: 'investment-proof', label: '项目投资凭证', note: '合同、发票和付款凭证' },
          { id: 'new-energy-entity', label: '申报主体为新能源装备制造企业', kind: 'condition', note: '' },
        ],
        templates: [],
        templateNote: '',
        submit: {
          name: '示例办理平台', url: 'https://www.nea.gov.cn/', deadline: '2027年3月31日',
          steps: ['登录系统，选择技术改造补贴事项。', '按页面要求填写企业和项目信息。', '上传清单里的材料扫描件后提交。'],
          contact: '',
        },
      },
    },
    {
      id: 'bj-application-scenarios-2026', projectId: 'bj-application-scenarios', batchId: '2026-second',
      title: '2026年第二批重点应用场景储备项目征集通知',
      region: '北京市', industries: ['软件信息', '生命健康'], supportType: '研发支持',
      publishedAt: '2026-10-28', applicationStart: '2026-10-29', applicationEnd: '2026-11-17',
      applicationStartAt: '2026-10-29T09:00:00+08:00', deadlineAt: '2026-11-17T18:00:00+08:00',
      category: '申报通知', agency: '北京市科委、中关村管委会',
      sourceUrl: 'https://www.beijing.gov.cn/zhengce/zhengcefagui/202610/t20261028_4921615.html',
      summary: '征集在京实施的技术应用场景，须明确需求方与供给方，申报截止11月17日18时。',
      conditions: ['需求方与供给方不得有关联关系，项目在京实施，并取得分园推荐资格。'],
      materials: ['在线申报信息、分园推荐函及系统要求的附件。'],
      applicationTimeNote: '申报期为10月29日09:00至11月17日18:00。',
      // 依北京市科委、中关村管委会通知整理，核对日2026-11-03。
      application: {
        checklist: [
          { id: 'online-form', label: '在线申报信息', note: '在系统里在线填写' },
          { id: 'recommendation-letter', label: '分园推荐函', note: '向所在中关村分园管理部门申请，申报期内上传' },
          { id: 'scenario-parties', label: '需求开放单位和能力供给单位', note: '场景项目要写明这两方，鼓励联合申报', expects: ['需求开放单位', '能力供给单位', '解决方案'] },
          { id: 'other-attachments', label: '系统要求的其他附件', required: false, note: '以系统显示为准' },
          { id: 'zgc-entity', label: '申报主体在中关村示范区范围内', kind: 'condition', note: '北京市其他区域的创新主体参照执行' },
          { id: 'no-relation', label: '两方没有关联关系', kind: 'condition', note: '持股、同一法定代表人或实控人、董监高重叠都算关联' },
          { id: 'in-beijing', label: '项目实施地在北京市内', kind: 'condition', note: '' },
        ],
        templates: [{ label: '各区中关村分园管理部门联系方式（PDF）', url: 'https://www.beijing.gov.cn/zhengce/zhengcefagui/202610/W020261028412880921149.pdf' }],
        templateNote: '这项政策在系统里在线填报，原文没有单独的申报模板。',
        submit: {
          name: '北京市科技计划综合管理平台', url: 'https://mis.kw.beijing.gov.cn', deadline: '2026年11月17日18:00',
          steps: ['登录系统，点“项目申报”，在“中关村政策资金”里选择这项通知。', '也可以从北京市政府门户网站的“政策兑现专区”进入。', '在线填写信息，上传分园推荐函和其他附件。'],
          contact: '政策咨询 010-88828863',
        },
      },
    },
    {
      id: 'sz-ai-corpus-voucher-2026', projectId: 'sz-ai-corpus-voucher', batchId: '2026',
      title: '2026年深圳市人工智能语料券专项资金',
      subsidy: { prefix: '最高', value: '200', unit: '万' },
      region: '广东省', industries: ['软件信息'], supportType: '研发支持',
      publishedAt: '2026-03-31', applicationStart: '2026-09-01', applicationEnd: '2026-11-10',
      deadlineAt: '2026-11-10T18:00:00+08:00', category: '申报通知', agency: '深圳市政务服务和数据管理局',
      sourceUrl: 'https://www.sz.gov.cn/szzsj/gkmlpt/content/12/12712/mpost_12712533.html',
      summary: '深圳企业通过数据交易所采购语料，按不超过采购费用30%、最高200万元资助；开放语料最高奖励100万元。受理至11月10日18时。',
      conditions: ['在深圳实际从事生产经营活动，2025年9月30日至2026年9月30日期间签署语料采购合同或完成语料开放。', '语料须通过合规评估，并提交数据交易所或律师事务所出具的数据合规报告。', '申请采购资助的，须从事大模型研发和应用，通过省、市批准的数据交易所采购非关联方语料，实施地在深圳。'],
      materials: ['资助项目申请书、营业执照、真实性承诺书、深圳纳税记录、数据合规报告、项目投入明细表、情况说明，采购或开放另有专项材料。'],
      applicationTimeNote: '官方建议在截止日前至少3个工作日提交，以免预审退回后来不及重新提交。',
      // 依申报指南和在线预审要点整理，核对日2026-11-03。
      application: {
        checklist: [
          { id: 'application-form', label: '资助项目申请书', note: '在申报系统填写后打印，盖章扫描' },
          { id: 'business-license', label: '营业执照', note: '三证合一且已关联电子证照的可不交' },
          { id: 'integrity-letter', label: '申报材料真实性承诺书', note: '' },
          { id: 'tax-record', label: '深圳纳税记录', note: '2025年1月1日以来，或其他在深圳经营的证明' },
          { id: 'compliance-report', label: '数据合规报告', note: '由数据交易所或具备评估能力的律师事务所出具' },
          { id: 'investment-detail', label: '项目投入明细表', note: '参考官方模板附件2-1' },
          { id: 'scenario-note', label: '语料适用场景等情况说明', note: '参考官方模板附件2-2', expects: ['适用场景', '合规', '知识产权', '科技伦理', '财政资助'] },
          { id: 'purchase-documents', label: '采购合同、发票、验收单、银行回单', required: false, note: '申请采购资助时提供' },
          { id: 'open-documents', label: '开放数据集成本证明和说明文档', required: false, note: '申请开放奖励时提供，详见申报指南' },
          { id: 'in-shenzhen', label: '企业在深圳实际从事生产经营', kind: 'condition', note: '含深汕特别合作区' },
          { id: 'contract-window', label: '合同或开放时间在规定期间内', kind: 'condition', note: '2025年9月30日至2026年9月30日' },
          { id: 'non-affiliated', label: '语料来自非关联方', kind: 'condition', note: '不支持采购自身及关联方的语料' },
        ],
        templates: [
          { label: '申报指南', url: 'https://www.sz.gov.cn/szzsj/attachment/1/1699/1699398/12712533.docx' },
          { label: '申请书参考模板及配套材料', url: 'https://www.sz.gov.cn/szzsj/attachment/1/1699/1699555/12712533.zip' },
          { label: '在线预审要点', url: 'https://www.sz.gov.cn/szzsj/attachment/1/1699/1699400/12712533.docx' },
        ],
        templateNote: '官方提供了申请书模板，下载后按模板填写。其他按需材料见申报指南。',
        submit: {
          name: '广东政务服务网（深圳站）', url: 'https://www.gdzwfw.gov.cn/', deadline: '2026年11月10日18:00',
          steps: ['登录后选择深圳市，搜索“深圳市人工智能语料券专项资金”办理；也可以在“i深圳”APP的企业服务里搜索。', '材料盖章（多页加骑缝章）后扫描上传，对照在线预审要点自查。', '线上预审通过后，按需到市政务服务中心递交纸质材料。'],
          contact: '业务咨询 0755-88127457',
        },
      },
    },
  ];
  const deepFreeze = value => {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.values(value).forEach(deepFreeze);
      Object.freeze(value);
    }
    return value;
  };
  window.PolicyPublicPolicies = deepFreeze(policies);
})();
