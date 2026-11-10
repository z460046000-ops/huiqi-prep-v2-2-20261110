/* 公开政策来源、角色分工与申报应用场景。 */
(() => {
  'use strict';
  const snapshot = Object.freeze({ date:'2026-10-30', timeZone:'Asia/Shanghai', asOf:'2026-10-30T12:00:00+08:00', countingUnit:'项目批次' });
  const policies = window.PolicyPublicPolicies || [];
  const regions = [...new Set(policies.map(item=>item.region))];
  const industries = ['物流行业','人工智能','金融行业','软件信息','先进制造','新能源','生命健康','现代服务'];
  const supportTypes = [...new Set(policies.map(item=>item.supportType))];
  const experts = [
    { id: 'enterprise-specialist', title: '企业画像专员', headline: '先把企业情况理清楚', description: '整理地区、行业、项目与资质信息，标出还需要补充的资料。', deliverables: ['企业画像', '资料缺口'], portraitIndex: 0, serviceId: 'profile' },
    { id: 'policy-matcher', title: '政策匹配与诊断专员', headline: '找到值得进一步核对的政策', description: '围绕企业画像筛选候选项目，把地区、行业与项目方向的匹配原因说清楚。', deliverables: ['候选政策', '匹配原因'], portraitIndex: 1, serviceId: 'search' },
    { id: 'policy-interpreter', title: '政策解读专员', headline: '把申报条件讲明白', description: '拆解适用条件、申报时间与材料要求，留下需要人工确认的问题。', deliverables: ['条件摘要', '材料清单'], portraitIndex: 2, serviceId: 'interpret' },
    { id: 'application-adviser', title: '政策匹配与诊断专员', headline: '还差什么，先补什么', description: '对照现有资料查找缺口，区分资料缺失、信息待核实与条件不满足。', deliverables: ['差距诊断', '补充建议'], portraitIndex: 3, serviceId: 'diagnosis' },
    { id: 'material-editor', title: '申报材料专员', headline: '把已有资料整理进模板', description: '引用企业提供的资料组织章节，缺失内容明确留待补充，并保存修改版本。', deliverables: ['有来源的草稿', '版本对比'], portraitIndex: 4, serviceId: 'assembly' },
    { id: 'submission-guide', title: '办理指引助手', headline: '提交前，再逐项核对', description: '整理办理步骤与提交前检查事项，将需要企业确认的内容单独列出。', deliverables: ['办理步骤', '核对清单'], portraitIndex: 5, serviceId: 'guidance' },
  ];
  experts.forEach(expert => { expert.portraitIndex = window.PolicyPersonas.get(expert.serviceId).index; });
  const teams = [
    { id: 'company-checkup', title: '企业政策体检团', headline: '看看企业适合申请什么，还差什么', serviceIds: ['profile', 'search', 'interpret', 'diagnosis'], portraitIndices: [0, 3, 5], steps: ['建立企业画像', '查找候选政策', '核对条件差距'], deliverables: ['候选政策清单', '条件核对结果', '补充建议'] },
    { id: 'application-preparation', title: '申报材料准备团', headline: '把资料整理成一份可核对的申报草稿', serviceIds: ['profile', 'search', 'interpret', 'diagnosis', 'assembly', 'guidance'], portraitIndices: [2, 4, 1], steps: ['解读材料要求', '补齐企业资料', '按模板组稿', '人工确认版本'], deliverables: ['材料草稿', '章节来源', '历史版本'] },
  ];
  const cases = [
    {id:'grant-qiutian',company:'重庆秋田齿轮有限责任公司',displayName:'重庆秋田齿轮',industry:'智能制造',region:'重庆',amount:'500',unit:'万元',supportLabel:'市级工业和信息化专项资金补助',project:'数字化车间建设',yearLabel:'2025年报道',awardYear:null,sourcePublishedAt:'2025-03-14',description:'建设数字化车间，获得市级工信专项资金支持。',sourceUrl:'https://czj.cq.gov.cn/zwxx_268/czdt/cjsd/202503/t20250317_14413736.html'},
    {id:'grant-hithium',company:'重庆海辰储能科技有限公司',displayName:'重庆海辰储能',industry:'新能源',region:'重庆',amount:'300',unit:'万元',supportLabel:'智能工厂建设资金支持',project:'智能工厂建设',yearLabel:'2025年报道',awardYear:null,sourcePublishedAt:'2025-03-14',description:'推进智能工厂建设，获得专项资金支持。',sourceUrl:'https://czj.cq.gov.cn/zwxx_268/czdt/cjsd/202503/t20250317_14413736.html'},
    {id:'grant-novasky',company:'湖南华诺星空电子技术有限公司',displayName:'华诺星空',industry:'电子信息',region:'长沙',amount:'50',unit:'万元',supportLabel:'市级研发补助',project:'企业研发投入',yearLabel:'2020年研发补助',awardYear:2020,sourcePublishedAt:'2021-10-27',description:'获得市级研发补助，支持企业研发投入。',sourceUrl:'https://gxt.hunan.gov.cn/xxgk_71033/gzdt/dfgz/202110/t20211027_20885053.html'},
  ];
  const deepFreeze = (value) => {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.values(value).forEach(deepFreeze);
      Object.freeze(value);
    }
    return value;
  };
  window.PolicyLandingData = deepFreeze({ snapshot, regions, industries, supportTypes, policies, experts, teams, cases });
})();
