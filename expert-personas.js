/* 角色形象唯一来源：同一能力在首页、集市、事项卡和对话中保持一致。 */
(() => {
  'use strict';
  const atlas = Object.freeze({ src: 'assets/landing/policy-advisers.webp', columns: 3, rows: 2, backgroundSize: '300% 200%' });
  const definitions = {
    profile: { id: 'company-assistant', name: '企业画像专员', index: 0, can: '收集企业信息和资料，让匹配更准', goal: '先把企业情况理清楚', tags: ['企业画像', '资料缺口'], doing: '理清企业情况' },
    search: { id: 'policy-adviser', name: '政策匹配与诊断专员', index: 3, can: '按企业情况找出能申报的政策', goal: '找到值得进一步核对的政策', tags: ['候选政策', '匹配原因'], doing: '找能申报的政策' },
    interpret: { id: 'policy-interpreter', name: '政策解读专员', index: 2, can: '讲清申报条件和材料要求', goal: '把申报条件讲明白', tags: ['条件摘要', '材料清单'], doing: '讲清申报条件' },
    diagnosis: { id: 'application-adviser', name: '政策匹配与诊断专员', index: 5, can: '对照政策，查出还缺什么材料', goal: '还差什么，先补什么', tags: ['差距诊断', '补充建议'], doing: '查还差什么' },
    assembly: { id: 'material-editor', name: '申报材料专员', index: 4, can: '把已有资料整理成申报材料初稿', goal: '把已有资料整理进模板', tags: ['有来源的草稿', '版本对比'], doing: '整理申报材料' },
    guidance: { id: 'procedure-adviser', name: '政策申报指引专员', index: 1, can: '说明办理步骤和提交渠道', goal: '提交前，再逐项核对', tags: ['办理步骤', '核对清单'], doing: '弄清怎么办理' },
    // 提交前核对和办理指引是同一位员工。
    review: { id: 'procedure-adviser', name: '政策申报指引专员', index: 1, can: '逐段核对材料，由你确认定稿', goal: '提交前，再逐项核对', tags: ['办理步骤', '核对清单'], doing: '核对材料' },
    general: { id: 'policy-adviser', name: '政策项目经理', index: 5, can: '解答申报过程中的问题' },
  };
  const roles = Object.fromEntries(Object.entries(definitions).map(([key, value]) => {
    const col = value.index % atlas.columns;
    const row = Math.floor(value.index / atlas.columns);
    return [key, Object.freeze({ ...value, key, col, row, x: col * 50, y: row * 100, asset: atlas.src })];
  }));
  // 项目“政策匹配”与前台“政策匹配与诊断专员”使用同一位检索角色。
  roles.match = roles.search;
  Object.freeze(roles);
  window.PolicyPersonas = Object.freeze({ atlas, roles, get: key => Object.hasOwn(roles, key) ? roles[key] : roles.general });
})();
