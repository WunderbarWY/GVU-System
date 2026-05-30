/**
 * ============================================================
 * 银河先遣队作战指挥台 — 核心逻辑引擎 v2.0
 * 作者: Kimi
 * 架构: 双层映射系统（游戏层 ↔ 任务层）
 * 原则: 不点开是战棋，点开了是工作
 * ============================================================
 */

// ============================================
// 游戏配置与常量
// ============================================
const CONFIG = {
  EARTH: { x: 25, y: 48 },
  ADVANCE_RATE: 2.5,
  CRITICAL_DISTANCE: 15,
  MAX_HISTORY: 50,
  FACTION_COLORS: {
    vanguard: '#4da3ff',
    egov: '#17d7b6',
    jupiter: '#ffd251',
    remnant: '#ff3f52',
  },
};

const FACTIONS = {
  vanguard: { name: '银河先遣队', role: '玩家势力', domain: '已控制航道', color: '#4da3ff', glow: 'rgba(77,163,255,0.85)', territory: '地球、水星周围航道' },
  egov: { name: '地球联合政府', role: '商业战线敌军', domain: '商业活动', color: '#17d7b6', glow: 'rgba(23,215,182,0.82)', territory: '月球、金星周围航道' },
  jupiter: { name: '木星兵团', role: '创作战线敌军', domain: '创作线活动', color: '#ffd251', glow: 'rgba(255,210,81,0.78)', territory: '木星、土星航道' },
  remnant: { name: '星际遗民', role: '混乱势力', domain: '杂事与拖延', color: '#ff3f52', glow: 'rgba(255,63,82,0.86)', territory: '冥王星、无人航道' },
};

const SHIP_CLASSES = {
  flagship:   { label: '旗舰', size: 36, threat: 120, powerBase: 90 },
  battleship: { label: '战列舰', size: 33, threat: 100, powerBase: 80 },
  carrier:    { label: '母舰', size: 33, threat: 90, powerBase: 70 },
  cruiser:    { label: '巡洋舰', size: 30, threat: 80, powerBase: 65 },
  destroyer:  { label: '驱逐舰', size: 27, threat: 60, powerBase: 50 },
  raider:     { label: '袭扰艇', size: 25, threat: 45, powerBase: 35 },
};

const NAME_POOL = {
  prefixes: ['暗影','猎鹰','雷霆','幽冥','烈焰','霜狼','烈风','苍穹','绝影','天狼','冥河','碎星','狂澜','极光','陨铁','赤霄','寒鸦','炽羽'],
  suffixes: ['号','舰','刃','影','矢','牙','翼','芒','痕','瞳','霆','陨'],
  vanguard: ['晨曦','启明','守望','黎明','北辰','银翼','天穹','白虹','霜华','星耀'],
  egov: ['翡翠','青岚','碧落','苍玉','琉璃','碧玺','青鸾','翠微'],
  jupiter: ['金焰','熔核','日冕','耀斑','烬星','煌炎','炽阳','熔金'],
  remnant: ['血月','赤瞳','猩红','烬灭','蚀骨','暗礁','枯骨','锈锚'],
};

const WAR_TEMPLATES = {
  morning: [
    '第{{turn}}作战日：{{faction}}在{{location}}部署{{count}}支舰队，其中{{overdue}}支进入威胁范围。',
    '晨曦扫描显示{{location}}方向有{{faction}}活动，规模约{{count}}艘。',
    '近地防线传感器捕捉到{{faction}}信号，{{location}}区域压力上升。',
  ],
  victory: [
    '银河先遣队成功在{{location}}击沉{{shipName}}，{{faction}}阵型出现缺口。',
    '{{shipName}}在{{location}}遭先遣队伏击，被完全摧毁。',
    '先遣队对{{location}}发动突袭，{{faction}}损失{{shipClass}}一艘。',
  ],
  advance: [
    '警报：{{shipName}}突破{{location}}外围防线，向地球方向推进。',
    '{{faction}}舰队{{shipName}}逼近近地轨道，预计{{days}}日内接触。',
    '{{location}}观测站报告：{{shipName}}威胁等级提升，建议优先处理。',
  ],
  critical: [
    '红色警报！{{faction}}多支舰队逼近地球轨道，防线压力达到临界点。',
    '紧急战报：近地防线多处出现缺口，敌军先头部队已进入高危区域。',
  ],
  calm: [
    '近地防线稳定。各战区无异常活动。',
    '太阳系扫描完毕。当前威胁等级：低。',
  ],
};

const PLANETS = [
  { name: '水星前哨', x: 37, y: 51, size: 24, color: '#9fb5c8', glow: 'rgba(77,163,255,.55)' },
  { name: '金星航道', x: 70, y: 29, size: 40, color: '#17d7b6', glow: 'rgba(23,215,182,.6)' },
  { name: '地球司令部', x: 25, y: 48, size: 56, color: '#4da3ff', glow: 'rgba(77,163,255,.72)' },
  { name: '月球封锁线', x: 49, y: 40, size: 18, color: '#c8fff6', glow: 'rgba(23,215,182,.72)' },
  { name: '木星船坞', x: 76, y: 64, size: 86, color: '#ffd251', glow: 'rgba(255,210,81,.62)' },
  { name: '土星议庭', x: 58, y: 74, size: 70, color: '#d7b14a', glow: 'rgba(255,210,81,.5)', ring: true },
  { name: '冥王星暗港', x: 22, y: 82, size: 30, color: '#ff3f52', glow: 'rgba(255,63,82,.6)' },
];

// ============================================
// 全局状态
// ============================================
const G = {
  turn: 5,
  units: [],
  warHistory: [],
  selectedId: null,
  stats: { kills: 0, missions: 0, streak: 0, maxStreak: 0 },
};

// 模拟 Linear 数据（后续替换为真实 API）
const Linear = {
  issues: [
    { id: 'LIN-101', title: '商业合作提案定稿', priority: 'urgent', status: 'in_progress', due: '2026-05-29', faction: 'egov', estimate: 5, labels: ['商业'] },
    { id: 'LIN-118', title: '客户跟进与报价', priority: 'high', status: 'todo', due: '2026-05-30', faction: 'egov', estimate: 3, labels: ['商业'] },
    { id: 'LIN-205', title: '小说第五章结构修订', priority: 'urgent', status: 'in_progress', due: '2026-06-02', faction: 'jupiter', estimate: 8, labels: ['创作'] },
    { id: 'LIN-232', title: '世界观势力表整理', priority: 'medium', status: 'todo', due: '2026-06-01', faction: 'jupiter', estimate: 5, labels: ['创作'] },
    { id: 'LIN-309', title: '邮箱和碎片消息清理', priority: 'low', status: 'backlog', due: '2026-05-20', faction: 'remnant', estimate: 2, labels: ['杂务'] },
    { id: 'LIN-330', title: '拖延积压复盘', priority: 'medium', status: 'todo', due: '2026-05-25', faction: 'remnant', estimate: 3, labels: ['杂务'] },
  ],
  done: [
    { id: 'LIN-001', title: '今日最小胜利', priority: 'high', completedAt: '2026-05-29', faction: 'vanguard', estimate: 1 },
  ],
};

// ============================================
// Linear API 模块
// ============================================
const LinearAPI = {
  endpoint: '/api/linear',
  key: localStorage.getItem('gv_linear_key') || '',

  async query(q, vars = {}) {
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': this.key },
      body: JSON.stringify({ query: q, variables: vars }),
    });
    return res.json();
  },

  async fetchIssues() {
    const { data, errors } = await this.query(`
      query {
        issues(first: 100) {
          nodes {
            id
            identifier
            title
            description
            state { id name type }
            priority
            dueDate
            estimate
            project { name }
            team { id name }
            labels { nodes { name } }
            createdAt
            updatedAt
            completedAt
          }
        }
      }
    `);
    if (errors) throw new Error(errors[0].message);
    return data.issues.nodes;
  },

  async fetchWorkflowStates() {
    const { data, errors } = await this.query(`
      query {
        workflowStates(first: 250) {
          nodes {
            id
            name
            type
            team { id }
          }
        }
      }
    `);
    if (errors) throw new Error(errors[0].message);
    console.log('[GV] Loaded', data.workflowStates.nodes.length, 'workflow states');
    return data.workflowStates.nodes;
  },

  async updateIssueState(issueId, stateId) {
    const { data, errors } = await this.query(`
      mutation($id: String!, $stateId: String!) {
        issueUpdate(id: $id, input: { stateId: $stateId }) {
          success
          issue { identifier state { name } }
        }
      }
    `, { id: issueId, stateId });
    if (errors) throw new Error(errors[0].message);
    return data.issueUpdate;
  },

  getStateId(teamId, type, issueId) {
    if (!this.workflowStates) throw new Error('工作流状态未加载');
    console.log('[GV] getStateId called — teamId:', teamId, 'type:', type, 'issueId:', issueId);
    console.log('[GV] Available states for this team:', this.workflowStates
      .filter(s => s.team?.id === teamId)
      .map(s => ({ id: s.id, name: s.name, type: s.type })));
    let state;
    if (teamId) {
      state = this.workflowStates.find(s => s.team?.id === teamId && s.type === type);
    } else {
      state = this.workflowStates.find(s => s.type === type);
    }
    if (!state) {
      console.log('[GV] FAILED to find state. All loaded states:', this.workflowStates.map(s => ({ id: s.id, name: s.name, type: s.type, teamId: s.team?.id })));
      const hint = teamId ? '该团队' : '所有工作流中';
      throw new Error(`${hint}没有 ${type} 状态，请在 Linear 中检查工作流设置`);
    }
    console.log('[GV] Found state:', state.id, state.name, 'team:', state.team?.id);
    return state.id;
  },

  async sync() {
    const [raw, states] = await Promise.all([
      this.fetchIssues(),
      this.fetchWorkflowStates(),
    ]);
    this.workflowStates = states;
    const mapped = mapLinearIssues(raw);
    Linear.issues = mapped.issues;
    Linear.done = mapped.done;
    localStorage.setItem('gv_linear_sync', Date.now());
    return mapped;
  },
};

function detectFaction(issue) {
  const text = [
    issue.project?.name || '',
    ...(issue.labels?.nodes || []).map(l => l.name),
    issue.title || '',
  ].join(' ').toLowerCase();

  const biz = ['商业','business','客户','client','销售','sales','合作','partnership','合同','contract','报价','市场','marketing','提案','pitch','谈判','营收','revenue'];
  const cre = ['创作','creative','写作','write','小说','novel','设计','design','内容','content','文案','copy','视频','video','博客','blog','策划','编辑','产品','product'];
  const ch = ['杂务','chore','日常','daily','行政','admin','邮件','email','清理','clean','维护','maint','报销','expense','整理','归档'];

  for (const w of biz) if (text.includes(w)) return 'egov';
  for (const w of cre) if (text.includes(w)) return 'jupiter';
  for (const w of ch) if (text.includes(w)) return 'remnant';

  if (issue.priority === 1) return 'egov';
  if (issue.priority === 2) return 'jupiter';
  return 'remnant';
}

function mapLinearState(name, type) {
  const n = (name || '').toLowerCase();
  const t = (type || '').toLowerCase();
  if (t === 'completed' || n.includes('done') || n.includes('完成')) return 'done';
  if (t === 'started' || n.includes('progress') || n.includes('进行中')) return 'in_progress';
  if (t === 'canceled' || n.includes('cancel') || n.includes('取消')) return 'canceled';
  if (t === 'backlog' || n.includes('backlog')) return 'backlog';
  return 'todo';
}

function mapLinearIssues(rawIssues) {
  const issues = [];
  const done = [];

  for (const issue of rawIssues) {
    const status = mapLinearState(issue.state?.name, issue.state?.type);
    const item = {
      id: issue.identifier,
      linearId: issue.id,
      title: issue.title,
      priority: { 1: 'urgent', 2: 'high', 3: 'medium', 4: 'low', 0: 'low' }[issue.priority] || 'low',
      status,
      due: issue.dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      faction: detectFaction(issue),
      estimate: issue.estimate || 3,
      labels: (issue.labels?.nodes || []).map(l => l.name),
      teamId: issue.team?.id,
      stateId: issue.state?.id,
    };

    if (status === 'done' || status === 'canceled') {
      done.push({ ...item, completedAt: issue.completedAt || issue.updatedAt });
    } else {
      issues.push(item);
    }
  }

  return { issues, done };
}

// ============================================
// 工具函数
// ============================================
function rand(n) { return Math.floor(Math.random() * n); }
function pick(a) { return a[rand(a.length)]; }
function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }
function distToEarth(x, y) {
  const dx = x - CONFIG.EARTH.x, dy = y - CONFIG.EARTH.y;
  return Math.sqrt(dx * dx + dy * dy);
}
function daysOverdue(dateStr) {
  if (!dateStr) return 0;
  const diff = new Date() - new Date(dateStr);
  return Math.max(0, Math.ceil(diff / 86400000));
}
function daysUntil(dateStr) {
  if (!dateStr) return 7; // 无截止日期默认剩7天
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / 86400000);
}

// ============================================
// 纯军事化命名系统
// ============================================
function genShipName(faction, used) {
  const pool = NAME_POOL[faction] || NAME_POOL.prefixes;
  let name, tries = 0;
  do {
    name = pick(pool) + pick(NAME_POOL.suffixes);
    tries++;
  } while (used.has(name) && tries < 100);
  used.add(name);
  return name;
}
function genCode(faction, idx) {
  const p = { vanguard: 'V', egov: 'E', jupiter: 'J', remnant: 'R' };
  return `${p[faction] || 'X'}-${String(idx + 1).padStart(3, '0')}`;
}

// ============================================
// 映射引擎：Linear → 作战单位
// ============================================
function priorityToClass(p) {
  return { urgent: 'battleship', high: 'cruiser', medium: 'destroyer', low: 'raider' }[p] || 'destroyer';
}

function spawnZone(faction) {
  return {
    egov: { x: [55, 82], y: [18, 42] },
    jupiter: { x: [58, 88], y: [55, 82] },
    remnant: { x: [12, 42], y: [68, 92] },
  }[faction] || { x: [50, 80], y: [50, 80] };
}

function syncLinearToGame() {
  const used = new Set();
  const units = [];

  // 未完成任务 → 敌军
  Linear.issues.forEach((issue, i) => {
    const cls = priorityToClass(issue.priority);
    const zone = spawnZone(issue.faction);
    const od = daysOverdue(issue.due);
    let x = rand(zone.x[1] - zone.x[0]) + zone.x[0];
    let y = rand(zone.y[1] - zone.y[0]) + zone.y[0];

    if (od > 0) {
      const dx = CONFIG.EARTH.x - x, dy = CONFIG.EARTH.y - y;
      const d = Math.sqrt(dx * dx + dy * dy);
      const adv = od * CONFIG.ADVANCE_RATE;
      x += (dx / d) * adv;
      y += (dy / d) * adv;
    }

    x = clamp(x, 5, 95);
    y = clamp(y, 5, 95);

    units.push({
      id: genCode(issue.faction, i),
      name: genShipName(issue.faction, used),
      shipClass: cls,
      faction: issue.faction,
      x, y,
      status: od > 0 ? 'advancing' : 'stationed',
      advanceDist: distToEarth(x, y),
      power: SHIP_CLASSES[cls].powerBase + rand(25) - 10,
      supply: rand(55) + 40,
      morale: od > 0 ? rand(30) + 30 : rand(40) + 50,
      mission: {
        linearId: issue.id,
        title: issue.title,
        priority: issue.priority,
        due: issue.due,
        status: issue.status,
        estimate: issue.estimate,
        labels: issue.labels,
        overdue: od,
      },
    });
  });

  // 已完成 → 我方巡逻舰
  Linear.done.forEach((issue, i) => {
    units.push({
      id: genCode('vanguard', i),
      name: genShipName('vanguard', used),
      shipClass: 'flagship',
      faction: 'vanguard',
      x: clamp(CONFIG.EARTH.x + rand(16) - 8, 10, 90),
      y: clamp(CONFIG.EARTH.y + rand(12) - 6, 10, 90),
      status: 'patrol',
      power: rand(15) + 85,
      supply: rand(25) + 70,
      morale: rand(20) + 75,
      mission: { title: issue.title, status: 'done', completedAt: issue.completedAt },
    });
  });

  G.units = units;
}

// ============================================
// 敌军反扑引擎
// ============================================
function processAdvance() {
  G.units.filter(u => u.faction !== 'vanguard').forEach(s => {
    const od = s.mission?.overdue || 0;
    if (od > 0) {
      s.status = 'advancing';
      const dx = CONFIG.EARTH.x - s.x, dy = CONFIG.EARTH.y - s.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > CONFIG.CRITICAL_DISTANCE) {
        const step = od * CONFIG.ADVANCE_RATE * 0.35;
        s.x = clamp(s.x + (dx / d) * step, 5, 95);
        s.y = clamp(s.y + (dy / d) * step, 5, 95);
      }
      s.advanceDist = distToEarth(s.x, s.y);
      s.morale = clamp(50 + od * 8, 50, 98);
    }
  });
}

// ============================================
// 战报生成器（双层：游戏叙事 + 工作统计）
// ============================================
function nearestPlanet(x, y) {
  return PLANETS.reduce((best, p) => {
    const d = Math.hypot(x - p.x, y - p.y);
    return d < best.d ? { ...p, d } : best;
  }, { ...PLANETS[0], d: Infinity }).name;
}
function sectorName(f) {
  return { egov: '金星-月球', jupiter: '木星-土星', remnant: '冥王星' }[f] || '未知区域';
}

function generateReport() {
  const enemies = G.units.filter(u => u.faction !== 'vanguard' && u.status !== 'destroyed');
  const advancing = enemies.filter(u => u.status === 'advancing');
  const critical = advancing.filter(u => u.advanceDist < CONFIG.CRITICAL_DISTANCE);

  // --- 上层：纯游戏叙事 ---
  let narrative = '';
  if (critical.length > 0) {
    narrative = pick(WAR_TEMPLATES.critical).replace('{{faction}}', FACTIONS[critical[0].faction].name);
  } else if (advancing.length > 0) {
    const s = advancing[0];
    narrative = pick(WAR_TEMPLATES.advance)
      .replace('{{shipName}}', s.name)
      .replace('{{faction}}', FACTIONS[s.faction].name)
      .replace('{{location}}', nearestPlanet(s.x, s.y))
      .replace('{{days}}', Math.max(1, Math.ceil(s.advanceDist / CONFIG.ADVANCE_RATE)));
  } else if (enemies.length > 0) {
    const groups = {};
    enemies.forEach(u => { groups[u.faction] = (groups[u.faction] || 0) + 1; });
    const top = Object.entries(groups).sort((a, b) => b[1] - a[1])[0];
    narrative = pick(WAR_TEMPLATES.morning)
      .replace('{{turn}}', G.turn)
      .replace('{{faction}}', FACTIONS[top[0]].name)
      .replace('{{location}}', sectorName(top[0]))
      .replace('{{count}}', top[1])
      .replace('{{overdue}}', advancing.length);
  } else {
    narrative = pick(WAR_TEMPLATES.calm);
  }

  // --- 下层：工作实际摘要 ---
  const todo = Linear.issues.filter(i => i.status !== 'done');
  const odIssues = Linear.issues.filter(i => daysOverdue(i.due) > 0);
  const inProg = Linear.issues.filter(i => i.status === 'in_progress');

  return {
    narrative,
    work: {
      done: Linear.done.map(i => ({ id: i.linearId, title: i.title })),
      inProgress: inProg.map(i => ({ id: i.linearId, title: i.title, due: i.due, days: daysUntil(i.due) })),
      todo: todo.filter(i => i.status === 'todo').map(i => ({ id: i.linearId, title: i.title, due: i.due, days: daysUntil(i.due) })),
      overdue: odIssues.map(i => ({ id: i.linearId, title: i.title, days: daysOverdue(i.due) })),
    },
    counts: { done: Linear.done.length, todo: todo.length, overdue: odIssues.length, advancing: advancing.length, critical: critical.length },
  };
}

// ============================================
// 完成任务 → 击沉敌舰
// ============================================
async function completeMission(unitId) {
  const u = G.units.find(x => x.id === unitId);
  if (!u || u.faction === 'vanguard') return;

  // 1. 先回写 Linear 状态
  const statusEl = document.querySelector('#connectStatus');
  try {
    if (statusEl) { statusEl.textContent = '同步到 Linear...'; statusEl.style.color = '#ffd251'; }
    const doneStateId = LinearAPI.getStateId(u.mission.teamId, 'completed', u.mission.linearId);
    await LinearAPI.updateIssueState(u.mission.linearId, doneStateId);
    if (statusEl) { statusEl.textContent = '✓ Linear 已更新'; statusEl.style.color = '#17d7b6'; }
  } catch (err) {
    console.error('[GV] Linear update failed:', err);
    if (statusEl) { statusEl.textContent = '× Linear 同步失败: ' + err.message; statusEl.style.color = '#ff3f52'; }
    alert('击沉动画已播放，但同步到 Linear 失败：' + err.message + '\n请手动在 Linear 中标记完成。');
    return;
  }

  // 2. 本地视觉效果
  warpJump(u.x, u.y, '#4da3ff');
  setTimeout(() => explode(u.x, u.y, FACTIONS[u.faction].color), 200);

  // 战史记录
  G.warHistory.unshift({
    type: 'victory',
    turn: G.turn,
    time: new Date().toISOString(),
    shipName: u.name,
    shipClass: SHIP_CLASSES[u.shipClass].label,
    faction: u.faction,
    location: nearestPlanet(u.x, u.y),
    missionId: u.mission.linearId,
    missionTitle: u.mission.title,
  });
  if (G.warHistory.length > CONFIG.MAX_HISTORY) G.warHistory.pop();

  // 统计更新
  G.stats.kills++;
  G.stats.missions++;
  G.stats.streak++;
  if (G.stats.streak > G.stats.maxStreak) G.stats.maxStreak = G.stats.streak;

  // 标记摧毁
  u.status = 'destroyed';

  // 从 Linear 模拟数据中移除
  const idx = Linear.issues.findIndex(i => i.id === u.mission.linearId);
  if (idx >= 0) {
    const done = Linear.issues.splice(idx, 1)[0];
    Linear.done.push({ ...done, completedAt: new Date().toISOString().split('T')[0], faction: 'vanguard' });
  }

  // 生成我方增援舰
  const used = new Set(G.units.map(x => x.name));
  G.units.push({
    id: genCode('vanguard', G.units.length),
    name: genShipName('vanguard', used),
    shipClass: 'destroyer',
    faction: 'vanguard',
    x: clamp(CONFIG.EARTH.x + rand(12) - 6, 10, 90),
    y: clamp(CONFIG.EARTH.y + rand(10) - 5, 10, 90),
    status: 'patrol',
    power: rand(20) + 55,
    supply: rand(30) + 60,
    morale: rand(20) + 70,
    mission: { title: '增援舰队', status: 'reserve' },
  });

  // 延迟刷新
  setTimeout(() => {
    renderUnits();
    renderBriefing();
    renderDetail(null);
  }, 650);
}

async function startMission(unitId) {
  const u = G.units.find(x => x.id === unitId);
  if (!u || u.faction === 'vanguard') return;

  try {
    const inProgressStateId = LinearAPI.getStateId(u.mission.teamId, 'started', u.mission.linearId);
    await LinearAPI.updateIssueState(u.mission.linearId, inProgressStateId);
  } catch (err) {
    console.error('[GV] Linear update failed:', err);
    alert('开始推进失败: ' + err.message);
    return;
  }

  u.mission.status = 'in_progress';
  const issue = Linear.issues.find(i => i.id === u.mission.linearId);
  if (issue) issue.status = 'in_progress';
  renderUnits();
  renderDetail(unitId);
}

// ============================================
// Canvas 粒子爆炸特效
// ============================================
function explode(px, py, color) {
  const canvas = document.querySelector('#starfield');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const stage = document.querySelector('#mapStage');
  const rect = stage.getBoundingClientRect();
  const x = (px / 100) * rect.width;
  const y = (py / 100) * rect.height;

  const particles = Array.from({ length: 45 }, (_, i) => {
    const angle = (Math.PI * 2 * i) / 45 + (rand(40) - 20) * 0.02;
    const speed = rand(6) + 2;
    return {
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: (rand(20) + 12) / 1000,
      size: rand(3) + 1,
      color,
    };
  });

  let frame = 0;
  function tick() {
    frame++;
    let alive = false;
    particles.forEach(p => {
      if (p.life <= 0) return;
      alive = true;
      p.x += p.vx; p.y += p.vy;
      p.vx *= 0.95; p.vy *= 0.95;
      p.life -= p.decay;
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    });
    if (alive && frame < 100) requestAnimationFrame(tick);
    else drawStarfield();
  }
  tick();
}

// ============================================
// 渲染层（完全复用 Codex 的 CSS 类名）
// ============================================
function drawStarfield() {
  const c = document.querySelector('#starfield');
  const s = document.querySelector('#mapStage');
  if (!c || !s) return;
  const ctx = c.getContext('2d');
  const r = s.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  c.width = r.width * ratio;
  c.height = r.height * ratio;
  ctx.scale(ratio, ratio);
  ctx.clearRect(0, 0, r.width, r.height);
  for (let i = 0; i < 220; i++) {
    ctx.fillStyle = `rgba(232,251,255,${rand(70) * 0.01 + 0.12})`;
    ctx.beginPath();
    ctx.arc(rand(r.width), rand(r.height), rand(16) * 0.1 + 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderPlanets() {
  const el = document.querySelector('#celestialBodies');
  if (!el) return;
  el.innerHTML = PLANETS.map(p => `
    <div class="body-marker" style="left:${p.x}%;top:${p.y}%">
      <span class="planet ${p.ring ? 'has-ring' : ''}" style="--size:${p.size}px;--color:${p.color};--glow:${p.glow}"></span>
      <span>${p.name}</span>
    </div>
  `).join('');
}

function renderFactions() {
  const el = document.querySelector('#factions');
  if (!el) return;
  el.innerHTML = Object.values(FACTIONS).map(f => `
    <div class="faction">
      <span class="swatch" style="--color:${f.color}"></span>
      <div><strong>${f.name}</strong><span>${f.domain}</span></div>
      <small>${f.role}</small>
    </div>
  `).join('');
}

function shipIcon(cls) {
  const p = {
    flagship: '<path d="M50 6 L68 36 L88 48 L66 54 L58 88 L50 76 L42 88 L34 54 L12 48 L32 36 Z"/><path d="M50 19 L50 68"/><path d="M35 47 L65 47"/>',
    battleship: '<path d="M50 8 L75 38 L82 66 L59 60 L50 88 L41 60 L18 66 L25 38 Z"/><path d="M33 41 L67 41"/><path d="M39 57 L61 57"/>',
    carrier: '<path d="M50 10 L84 42 L74 74 L54 65 L50 90 L46 65 L26 74 L16 42 Z"/><path d="M28 45 L72 45"/><path d="M33 57 L67 57"/><path d="M42 31 L58 31"/>',
    cruiser: '<path d="M50 9 L70 34 L77 61 L58 58 L50 86 L42 58 L23 61 L30 34 Z"/><path d="M38 39 L62 39"/>',
    destroyer: '<path d="M50 8 L66 35 L71 58 L56 55 L50 84 L44 55 L29 58 L34 35 Z"/><path d="M39 43 L61 43"/>',
    raider: '<path d="M50 12 L72 52 L58 50 L50 84 L42 50 L28 52 Z"/><path d="M35 38 L22 31"/><path d="M65 38 L78 31"/>',
  };
  return `<svg class="ship-icon" viewBox="0 0 100 100" aria-hidden="true">${p[cls] || p.destroyer}</svg>`;
}

function renderUnits() {
  const layer = document.querySelector('#unitLayer');
  if (!layer) return;

  const active = G.units.filter(u => u.status !== 'destroyed');
  layer.innerHTML = active.map(u => {
    const f = FACTIONS[u.faction];
    const isV = u.faction === 'vanguard';
    const threat = isV ? 56 : 58 + u.power * 0.45;
    const crit = !isV && u.advanceDist < CONFIG.CRITICAL_DISTANCE;
    const adv = u.status === 'advancing';
    const angle = u.faction === 'remnant' ? '-28deg' : u.faction === 'jupiter' ? '18deg' : '-12deg';

    return `
      ${!isV ? `<span class="threat-pulse" style="left:${u.x}%;top:${u.y}%;--radius:${threat}px;--unit-color:${crit ? '#ff3f52' : f.color}"></span>` : ''}
      ${!isV ? `<span class="unit-trail" style="left:${u.x - 1.4}%;top:${u.y + 1.1}%;--trail-width:${40 + u.power * 0.25}px;--angle:${angle};--unit-color:${f.color}"></span>` : ''}
      <button class="unit ship-${u.shipClass} ${u.status} ${G.selectedId === u.id ? 'is-selected' : ''}"
        data-id="${u.id}" type="button"
        style="left:${u.x}%;top:${u.y}%;--unit-color:${f.color};--unit-glow:${f.glow};--status-color:${adv ? '#ff3f52' : '#4da3ff'};color:${f.color}">
        ${shipIcon(u.shipClass)}
        <span class="engine-flame" style="background:linear-gradient(180deg, ${f.color}, transparent);"></span>
        <span class="unit-code">${u.id}</span>
        <span class="unit-label">${u.name}${crit ? ' ⚠' : ''}</span>
        ${!isV ? `<span class="status-chip" style="--status-color:${adv ? '#ff3f52' : '#4da3ff'}"></span>` : ''}
      </button>
    `;
  }).join('');

  layer.querySelectorAll('.unit').forEach(btn => {
    btn.addEventListener('click', () => selectUnit(btn.dataset.id));
  });
}

function renderBriefing() {
  const el = document.querySelector('#dailyBrief');
  if (!el) return;
  const r = generateReport();

  let html = `<p style="margin-bottom:10px;color:#e8fbff;line-height:1.6;">${r.narrative}</p>`;

  if (r.counts.critical > 0) {
    html += `<p style="color:#ff3f52;font-size:13px;margin-bottom:12px;font-family:var(--font-display);">⚠ 防线告急：${r.counts.critical} 支敌军进入高危区域</p>`;
  } else if (r.counts.advancing > 0) {
    html += `<p style="color:#ffd251;font-size:13px;margin-bottom:12px;font-family:var(--font-display);">▲ ${r.counts.advancing} 支敌军正在推进</p>`;
  }

  // 统计面板
  html += `
    <div class="sync-grid">
      <div><strong>${r.counts.done}</strong><span>已完成</span></div>
      <div><strong>${r.counts.todo}</strong><span>待办</span></div>
      <div><strong style="color:${r.counts.overdue > 0 ? '#ff3f52' : '#4da3ff'}">${r.counts.overdue}</strong><span>逾期</span></div>
    </div>
    <div class="task-list">
  `;

  if (r.work.overdue.length) {
    html += `<h3 style="color:#ff3f52;">逾期任务</h3>`;
    html += r.work.overdue.map(t => briefRow(t, '#ff3f52', `逾期${t.days}天`)).join('');
  }
  if (r.work.inProgress.length) {
    html += `<h3>进行中</h3>`;
    html += r.work.inProgress.map(t => briefRow(t, '#e8fbff', `剩${t.days}天`)).join('');
  }
  if (r.work.todo.length) {
    html += `<h3>待办</h3>`;
    html += r.work.todo.map(t => briefRow(t, '#ffd251', `剩${t.days}天`)).join('');
  }
  html += `</div>`;

  // 战区控制度
  const control = calculateControl();
  html += `
    <div style="margin-top:14px;padding-top:12px;border-top:1px solid rgba(172,219,255,0.12);">
      <p style="color:var(--muted);font-size:11px;margin:0 0 8px;font-family:var(--font-display);">战区控制度</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
        <div style="padding:6px 8px;border-radius:3px;background:rgba(77,163,255,0.08);border-left:2px solid #4da3ff;">
          <span style="font-size:11px;color:var(--muted);">先遣队</span>
          <span style="display:block;font-size:16px;font-family:var(--font-display);color:#4da3ff;">${control.vanguard.control}%</span>
        </div>
        <div style="padding:6px 8px;border-radius:3px;background:rgba(23,215,182,0.06);border-left:2px solid #17d7b6;">
          <span style="font-size:11px;color:var(--muted);">商业线</span>
          <span style="display:block;font-size:16px;font-family:var(--font-display);color:#17d7b6;">${control.egov.control}%</span>
        </div>
        <div style="padding:6px 8px;border-radius:3px;background:rgba(255,210,81,0.06);border-left:2px solid #ffd251;">
          <span style="font-size:11px;color:var(--muted);">创作线</span>
          <span style="display:block;font-size:16px;font-family:var(--font-display);color:#ffd251;">${control.jupiter.control}%</span>
        </div>
        <div style="padding:6px 8px;border-radius:3px;background:rgba(255,63,82,0.06);border-left:2px solid #ff3f52;">
          <span style="font-size:11px;color:var(--muted);">混乱区</span>
          <span style="display:block;font-size:16px;font-family:var(--font-display);color:#ff3f52;">${control.remnant.control}%</span>
        </div>
      </div>
    </div>
  `;

  el.innerHTML = html;

  const state = document.querySelector('#frontlineState');
  if (state) {
    if (r.counts.critical > 0) {
      state.textContent = `防线告急 · ${r.counts.critical}支逼近`;
      state.style.color = '#ff3f52';
    } else if (r.counts.advancing > 0) {
      state.textContent = `${r.counts.advancing}支敌军推进中`;
      state.style.color = '#ffd251';
    } else {
      state.textContent = '近地防线稳定';
      state.style.color = '#e8fbff';
    }
  }
}

function briefRow(t, color, label) {
  return `
    <button class="brief-row" type="button" onclick="window.__game.selectByMission('${t.id}')">
      <span class="dot" style="--color:${color}"></span>
      <span>${t.title}</span>
      <small>${label}</small>
    </button>
  `;
}

function selectUnit(id) {
  const u = G.units.find(x => x.id === id);
  if (!u) return;
  G.selectedId = id;
  document.querySelectorAll('.unit').forEach(b => b.classList.toggle('is-selected', b.dataset.id === id));
  renderDetail(id);
}

function selectByMission(linearId) {
  const u = G.units.find(x => x.mission?.linearId === linearId);
  if (u) selectUnit(u.id);
}

function renderDetail(id) {
  const panel = document.querySelector('#unitDetail');
  if (!panel) return;
  if (!id) {
    panel.innerHTML = `
      <p class="eyebrow">单位详情</p>
      <h2>请选择舰队</h2>
      <p class="muted">点击地图上的作战单位，查看它对应的 Linear 待办、战斗力、补给与风险。</p>
    `;
    return;
  }

  const u = G.units.find(x => x.id === id);
  const f = FACTIONS[u.faction];
  const isV = u.faction === 'vanguard';
  const od = u.mission?.overdue || 0;

  let html = `
    <p class="eyebrow">${u.id} / ${f.name} / ${SHIP_CLASSES[u.shipClass].label}</p>
    <h2 class="unit-title" style="--unit-color:${f.color}">${u.name}</h2>
  `;

  if (!isV && u.mission) {
    const m = u.mission;
    html += `
      <div style="border-left:3px solid ${f.color};padding-left:12px;margin:12px 0;">
        <p style="margin:0 0 4px;font-size:14px;color:#e8fbff;">${m.title}</p>
        <p style="margin:0;color:var(--muted);font-size:12px;">${m.linearId} · ${m.priority} · 预估${m.estimate}点</p>
      </div>
      ${od > 0 ? `<p style="color:#ff3f52;font-size:13px;margin:8px 0;">⚠ 已逾期 ${od} 天 — 敌军正在向地球推进</p>` : ''}
    `;
  } else if (isV) {
    html += `<p style="color:#4da3ff;font-size:13px;">银河先遣队巡逻中。选择敌军舰队可查看对应任务详情。</p>`;
  }

  html += `
    <div class="tag-row">
      <span class="tag">${u.name}</span>
      <span class="tag">${SHIP_CLASSES[u.shipClass].label}</span>
      <span class="tag">${u.status === 'advancing' ? '推进中' : u.status === 'stationed' ? '驻防' : u.status === 'patrol' ? '巡逻' : u.status}</span>
      <span class="tag">战力 ${u.power}</span>
    </div>
    ${meter('战斗力', u.power, f.color)}
    ${meter('补给', u.supply, f.color)}
    ${meter('士气', u.morale, f.color)}
  `;

  if (!isV && u.status !== 'destroyed') {
    html += `
      <div style="margin-top:14px;display:flex;gap:8px;">
        <button onclick="window.__game.complete('${u.id}')" style="flex:1;padding:10px;border:1px solid #4da3ff;border-radius:4px;background:rgba(77,163,255,0.14);color:#4da3ff;cursor:pointer;font-family:var(--font-display);font-size:13px;">✓ 完成任务</button>
        <button onclick="window.__game.start('${u.id}')" style="flex:1;padding:10px;border:1px solid rgba(232,251,255,0.2);border-radius:4px;background:rgba(232,251,255,0.05);color:#e8fbff;cursor:pointer;font-family:var(--font-display);font-size:13px;">▶ 开始推进</button>
      </div>
    `;
  }

  // 相关战史
  const hist = G.warHistory.filter(h => h.missionId === u.mission?.linearId).slice(0, 3);
  if (hist.length) {
    html += `<div style="margin-top:14px;"><p style="color:var(--muted);font-size:11px;margin-bottom:6px;font-family:var(--font-display);">作战记录</p>`;
    hist.forEach(h => {
      html += `<p style="font-size:12px;color:#7890a4;margin:3px 0;">· 第${h.turn}日 ${h.shipName} 于 ${h.location}</p>`;
    });
    html += `</div>`;
  }

  panel.innerHTML = html;
}

function meter(label, value, color) {
  return `
    <div class="stat-row">
      <span>${label}</span>
      <div class="meter"><span style="--value:${value}%;--color:${color}"></span></div>
      <strong>${value}</strong>
    </div>
  `;
}

// ============================================
// 地图控制（保留 Codex 全部交互）
// ============================================
const map = { zoom: 0.58, panX: 0, panY: 0, dragging: false, sx: 0, sy: 0, ox: 0, oy: 0 };
function applyMap() {
  const w = document.querySelector('#mapWorld');
  const l = document.querySelector('#zoomLabel');
  if (!w) return;
  w.style.setProperty('--zoom', map.zoom.toFixed(2));
  w.style.setProperty('--pan-x', `${Math.round(map.panX)}px`);
  w.style.setProperty('--pan-y', `${Math.round(map.panY)}px`);
  if (l) l.textContent = `${Math.round(map.zoom * 100)}%`;
}
function zoom(d) { map.zoom = clamp(map.zoom + d, 0.35, 2.4); applyMap(); }
function resetMap() { map.zoom = 0.58; map.panX = 0; map.panY = 0; applyMap(); }
function initMap() {
  const stage = document.querySelector('#mapStage');
  if (!stage) return;
  document.querySelectorAll('[data-zoom]').forEach(b => {
    b.addEventListener('click', () => {
      const a = b.dataset.zoom;
      if (a === 'in') zoom(0.18);
      if (a === 'out') zoom(-0.18);
      if (a === 'reset') resetMap();
    });
  });
  stage.addEventListener('wheel', e => { e.preventDefault(); zoom(e.deltaY < 0 ? 0.12 : -0.12); }, { passive: false });
  stage.addEventListener('pointerdown', e => {
    if (e.target.closest('.unit, .map-controls')) return;
    map.dragging = true; map.sx = e.clientX; map.sy = e.clientY; map.ox = map.panX; map.oy = map.panY;
    stage.classList.add('is-panning');
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener('pointermove', e => {
    if (!map.dragging) return;
    map.panX = map.ox + e.clientX - map.sx;
    map.panY = map.oy + e.clientY - map.sy;
    applyMap();
  });
  stage.addEventListener('pointerup', e => {
    if (!map.dragging) return;
    map.dragging = false; stage.classList.remove('is-panning'); stage.releasePointerCapture(e.pointerId);
  });
}

// ============================================
// 加载画面控制
// ============================================
function showLoading(text, percent) {
  const screen = document.querySelector('#loadingScreen');
  const status = document.querySelector('#loadingText');
  const bar = document.querySelector('#loadingBar');
  if (status) status.textContent = text;
  if (bar) bar.style.width = percent + '%';
}

function hideLoading() {
  const screen = document.querySelector('#loadingScreen');
  if (screen) screen.classList.add('is-hidden');
}

// ============================================
// 交战区与战略网络
// ============================================
const WAR_ZONES = [
  { name: '水星走廊', x: 32, y: 48, radius: 80, faction: 'vanguard', importance: 'high' },
  { name: '金星前线', x: 62, y: 32, radius: 100, faction: 'egov', importance: 'high' },
  { name: '木星封锁带', x: 72, y: 64, radius: 120, faction: 'jupiter', importance: 'critical' },
  { name: '冥王星边境', x: 18, y: 82, radius: 90, faction: 'remnant', importance: 'medium' },
  { name: '地球轨道', x: 28, y: 46, radius: 60, faction: 'vanguard', importance: 'critical' },
];

const EXTRA_ROUTES = [
  { d: 'M280 390 C350 420, 420 450, 500 360', faction: 'neutral' },
  { d: 'M735 250 C680 280, 620 320, 500 360', faction: 'neutral' },
  { d: 'M820 510 C750 480, 680 450, 500 360', faction: 'neutral' },
  { d: 'M205 620 C280 580, 350 520, 500 360', faction: 'neutral' },
  { d: 'M500 360 C450 250, 400 200, 350 180', faction: 'neutral' },
  { d: 'M500 360 C550 480, 580 550, 600 600', faction: 'neutral' },
];

function renderWarZones() {
  const svg = document.querySelector('.routes');
  if (!svg) return;

  // 添加额外航道
  EXTRA_ROUTES.forEach((route, i) => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', route.d);
    path.setAttribute('class', 'route route-neutral');
    path.setAttribute('style', 'opacity:0.2;');
    svg.appendChild(path);
  });

  // 添加势力光环
  const mapStage = document.querySelector('#mapStage');
  WAR_ZONES.forEach(zone => {
    const aura = document.createElement('div');
    aura.className = 'faction-aura';
    const color = FACTIONS[zone.faction]?.color || '#4da3ff';
    aura.style.cssText = `
      left: ${zone.x}%;
      top: ${zone.y}%;
      width: ${zone.radius}px;
      height: ${zone.radius}px;
      background: radial-gradient(circle, ${color}22, transparent 70%);
      border: 1px solid ${color}33;
    `;
    mapStage?.appendChild(aura);
  });
}

// ============================================
// 战区控制度系统
// ============================================
function calculateControl() {
  const enemies = G.units.filter(u => u.faction !== 'vanguard' && u.status !== 'destroyed');
  const total = enemies.length + G.units.filter(u => u.faction === 'vanguard').length;

  const control = {
    vanguard: { control: 0, ships: 0 },
    egov: { control: 0, ships: 0 },
    jupiter: { control: 0, ships: 0 },
    remnant: { control: 0, ships: 0 },
  };

  G.units.forEach(u => {
    if (u.status !== 'destroyed') {
      control[u.faction].ships++;
    }
  });

  Object.keys(control).forEach(f => {
    control[f].control = total > 0 ? Math.round((control[f].ships / total) * 100) : 0;
  });

  return control;
}

// ============================================
// 增援波次系统
// ============================================
function checkReinforcements() {
  const overdue = G.units.filter(u => u.faction !== 'vanguard' && u.status === 'advancing');
  if (overdue.length >= 3) {
    // 生成增援
    const factions = [...new Set(overdue.map(u => u.faction))];
    factions.forEach(faction => {
      const count = Math.min(2, overdue.filter(u => u.faction === faction).length);
      for (let i = 0; i < count; i++) {
        spawnReinforcement(faction);
      }
    });
  }
}

function spawnReinforcement(faction) {
  const zone = spawnZone(faction);
  const x = rand(zone.x[1] - zone.x[0]) + zone.x[0];
  const y = rand(zone.y[1] - zone.y[0]) + zone.y[0];

  G.units.push({
    id: genCode(faction, G.units.length + 100),
    name: genShipName(faction, new Set(G.units.map(u => u.name))),
    shipClass: 'raider',
    faction,
    x: clamp(x, 5, 95),
    y: clamp(y, 5, 95),
    status: 'advancing',
    advanceDist: distToEarth(x, y),
    power: rand(15) + 35,
    supply: rand(30) + 30,
    morale: rand(20) + 70,
    mission: {
      title: '增援舰队',
      status: 'reinforcement',
      priority: 'low',
      estimate: 1,
      overdue: 0,
    },
  });
}

// ============================================
// 跃迁效果
// ============================================
function warpJump(px, py, color) {
  const stage = document.querySelector('#mapStage');
  if (!stage) return;
  const rect = stage.getBoundingClientRect();
  const x = (px / 100) * rect.width;
  const y = (py / 100) * rect.height;

  const warp = document.createElement('div');
  warp.className = 'warp-effect';
  warp.style.cssText = `
    left: ${x}px;
    top: ${y}px;
    width: 60px;
    height: 60px;
    background: radial-gradient(circle, ${color}88, transparent 70%);
    border: 2px solid ${color};
    transform: translate(-50%, -50%);
  `;
  stage.appendChild(warp);
  setTimeout(() => warp.remove(), 1000);
}

// ============================================
// 升级粒子爆炸
// ============================================
function explode(px, py, color) {
  const canvas = document.querySelector('#starfield');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const stage = document.querySelector('#mapStage');
  const rect = stage.getBoundingClientRect();
  const x = (px / 100) * rect.width;
  const y = (py / 100) * rect.height;

  // 主爆炸粒子
  const particles = Array.from({ length: 60 }, (_, i) => {
    const angle = (Math.PI * 2 * i) / 60 + (rand(40) - 20) * 0.02;
    const speed = rand(8) + 3;
    return {
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: (rand(15) + 10) / 1000,
      size: rand(4) + 2,
      color,
    };
  });

  // 碎片
  const debris = Array.from({ length: 20 }, () => ({
    x, y,
    vx: (rand(20) - 10) * 0.3,
    vy: (rand(20) - 10) * 0.3,
    life: 1,
    decay: (rand(10) + 5) / 1000,
    size: rand(3) + 1,
    color: '#fff',
  }));

  let frame = 0;
  function tick() {
    frame++;
    let alive = false;

    [...particles, ...debris].forEach(p => {
      if (p.life <= 0) return;
      alive = true;
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life -= p.decay;
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    });

    if (alive && frame < 120) {
      requestAnimationFrame(tick);
    } else {
      drawStarfield();
    }
  }
  tick();
}

// ============================================
// Linear 连接 UI
// ============================================
function initLinearUI() {
  const input = document.querySelector('#apiKeyInput');
  const btnConnect = document.querySelector('#btnConnect');
  const btnDemo = document.querySelector('#btnDemo');
  const status = document.querySelector('#connectStatus');

  if (LinearAPI.key) input.value = LinearAPI.key;

  async function tryConnect() {
    const key = input.value.trim();
    if (!key) { status.textContent = '请输入 API Key'; status.style.color = '#ff3f52'; return; }

    status.textContent = '正在连接 Linear...';
    status.style.color = '#ffd251';
    LinearAPI.key = key;

    try {
      await LinearAPI.sync();
      localStorage.setItem('gv_linear_key', key);
      status.textContent = '✓ 已连接，任务已同步';
      status.style.color = '#17d7b6';

      setTimeout(() => {
        syncLinearToGame();
        processAdvance();
        checkReinforcements();
        renderWarZones();
        renderUnits();
        renderBriefing();
        const firstEnemy = G.units.find(u => u.faction !== 'vanguard' && u.status !== 'destroyed');
        if (firstEnemy) selectUnit(firstEnemy.id);
      }, 300);
    } catch (err) {
      status.textContent = '× 连接失败: ' + err.message;
      status.style.color = '#ff3f52';
      console.error('Linear sync error:', err);
    }
  }

  btnConnect?.addEventListener('click', tryConnect);
  btnDemo?.addEventListener('click', () => {
    status.textContent = '使用演示数据';
    status.style.color = '#4da3ff';
    localStorage.removeItem('gv_linear_key');
    LinearAPI.key = '';
    input.value = '';
    // 重置为演示数据
    location.reload();
  });

  // 自动连接策略：先查服务器配置文件（跨端口持久化），再查 localStorage
  async function autoConnect() {
    try {
      const res = await fetch('/api/config');
      const cfg = await res.json();
      if (cfg.apiKey && cfg.apiKey.startsWith('lin_api_')) {
        input.value = cfg.apiKey;
        LinearAPI.key = cfg.apiKey;
        tryConnect();
        return;
      }
    } catch (e) { /* ignore */ }

    if (LinearAPI.key && LinearAPI.key.startsWith('lin_api_')) {
      tryConnect();
    }
  }

  autoConnect();
}

// ============================================
// 启动
// ============================================
function boot() {
  try {
    showLoading('初始化战术系统...', 10);
    initLinearUI();

    showLoading('扫描星系威胁...', 30);
    syncLinearToGame();
    processAdvance();
    checkReinforcements();

    showLoading('渲染战略地图...', 60);
    drawStarfield();
    renderPlanets();
    renderFactions();
    renderWarZones();
    renderUnits();
    renderBriefing();
    initMap();
    applyMap();

    showLoading('部署完成', 100);
    setTimeout(() => {
      hideLoading();
      const first = G.units.find(u => u.faction !== 'vanguard' && u.status !== 'destroyed');
      if (first) selectUnit(first.id);
    }, 600);
  } catch (err) {
    console.error('[GV] BOOT FAILED:', err);
    showLoading('系统启动失败: ' + err.message, 0);
    const panel = document.querySelector('#unitDetail');
    if (panel) panel.innerHTML = `<p style="color:#ff3f52">系统启动失败: ${err.message}<br>请打开浏览器控制台(F12)查看详情。</p>`;
  }
}

window.__game = { complete: completeMission, start: startMission, selectUnit, selectByMission, G, Linear, LinearAPI };
window.addEventListener('resize', drawStarfield);
boot();
