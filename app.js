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
  vanguard: { name: '银河先遣队', role: '玩家势力', domain: '', color: '#4da3ff', glow: 'rgba(77,163,255,0.85)', territory: '地球、水星周围航道' },
  egov: { name: '地球联合政府', role: '', domain: '', color: '#17d7b6', glow: 'rgba(23,215,182,0.82)', territory: '月球、金星周围航道' },
  jupiter: { name: '木星兵团', role: '', domain: '', color: '#ffd251', glow: 'rgba(255,210,81,0.78)', territory: '木星、土星航道' },
  remnant: { name: '星际遗民', role: '', domain: '', color: '#ff3f52', glow: 'rgba(255,63,82,0.86)', territory: '冥王星、无人航道' },
};

const SHIP_CLASSES = {
  flagship:   { label: '旗舰', size: 78, threat: 150, powerBase: 90 },
  battleship: { label: '战列舰', size: 66, threat: 125, powerBase: 80 },
  carrier:    { label: '母舰', size: 58, threat: 112, powerBase: 70 },
  cruiser:    { label: '巡洋舰', size: 50, threat: 94, powerBase: 65 },
  destroyer:  { label: '驱逐舰', size: 40, threat: 72, powerBase: 50 },
  raider:     { label: '袭扰艇', size: 32, threat: 54, powerBase: 35 },
};

const NATO_NAMES = {
  vanguard: ['阿尔法','贝塔','伽马','德尔塔','艾普西隆','泽塔','伊塔','西塔','约塔','卡帕','拉姆达','缪','纽','克西','奥米克戎','派','柔','西格玛','陶','宇普西隆','斐','希','普西','欧米伽','猎户','天龙','仙后','仙女','英仙','天鹅','天琴','天鹰','武仙','飞马','凤凰','狮子','天蝎','室女','双子','白羊','金牛','天秤','摩羯','射手','巨蟹','心宿二','牛郎','天津四','织女','角宿一','大角','参宿四','参宿七','天狼','老人','南河三','水委一','马腹一','北落师门','北河三','轩辕十四','北河二','毕宿五','天枢','天璇','玉衡','开阳','摇光','天权','天玑'],
  egov: ['翡翠','琥珀','珊瑚','石榴石','黄玉','蓝宝石','祖母绿','红宝石','紫水晶','珍珠','缟玛瑙','黑曜石','孔雀石','青金石','绿松石','玛瑙','碧玉','燧石','花岗岩','大理石','板岩','玄武岩','浮石','石膏','长石','云母','滑石','象牙','煤玉','锆石','黄水晶','电气石','橄榄石','变石','月光石','日光石','血石','红玉髓','玉髓','绿玉髓','赤铁矿','磁铁矿','黄铁矿','方铅矿','铝土矿','石墨','钻石','蛋白石','石英'],
  jupiter: ['脉冲星','新星','类星体','星云','超新星','彗星','小行星','流星','日食','至日','分日','天顶','天底','顶点','极光','日冕','日珥','耀斑','爆发','星团','虚空','奇点','地平线','深渊','宇宙','星系','轨道','轴','极','子午线','赤道','回归线','远地点','近地点','远日点','近日点','交点','天平动','岁差','视差','折射','光行差','多普勒','红移','蓝移','章动','倾角','离心率'],
  remnant: ['疾风','暴风雨','飑','季风','台风','气旋','飓风','暴风雪','雪崩','海啸','洪流','大洪水','干旱','霜冻','解冻','薄雾','浓雾','霾','烟雾','尘','灰烬','余烬','火花','火焰','烈焰','炼狱','焦土','灼烧','炭','煤渣',' surge','涟漪','潮汐','洋流','漩涡','涡旋','旋风','尘卷','火风暴','热浪','冷锋','暖锋','毛毛雨','冰雨','冰雹','冰暴','雪堆','漂移','变换','地震','余震'],
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
  { name: '水星前哨', x: 36, y: 50, size: 28, color: '#9fb5c8', glow: 'rgba(77,163,255,.42)' },
  { name: '金星航道', x: 76, y: 22, size: 48, color: '#17d7b6', glow: 'rgba(23,215,182,.45)' },
  { name: '地球司令部', x: 22, y: 47, size: 68, color: '#4da3ff', glow: 'rgba(77,163,255,.56)' },
  { name: '月球封锁线', x: 50, y: 38, size: 20, color: '#c8fff6', glow: 'rgba(23,215,182,.48)' },
  { name: '木星船坞', x: 85, y: 63, size: 118, color: '#ffd251', glow: 'rgba(255,210,81,.48)' },
  { name: '土星议庭', x: 55, y: 82, size: 92, color: '#d7b14a', glow: 'rgba(255,210,81,.36)', ring: true },
  { name: '冥王星暗港', x: 13, y: 88, size: 36, color: '#ff3f52', glow: 'rgba(255,63,82,.4)' },
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
function cleanKey(key) {
  return (key || '').replace(/[^\x20-\x7E]/g, '').trim();
}

const LinearAPI = {
  endpoint: 'http://localhost:5180/api/linear',
  key: cleanKey(localStorage.getItem('gv_linear_key')),
  pollingId: null,
  isPolling: false,
  lastSyncTime: 0,

  startPolling(interval = 30000) {
    this.stopPolling();
    this.isPolling = true;
    this.pollingId = setInterval(async () => {
      if (!this.key) { this.stopPolling(); return; }
      try {
        await this.sync();
        StarshipSync.applyIncremental();
      } catch (err) {
        console.error('[GV] Polling sync failed:', err);
      }
    }, interval);
    console.log('[GV] Auto-sync polling started:', interval + 'ms');
  },

  stopPolling() {
    if (this.pollingId) {
      clearInterval(this.pollingId);
      this.pollingId = null;
    }
    this.isPolling = false;
  },

  async query(q, vars = {}) {
    const url = this.endpoint;
    const body = JSON.stringify({ query: q, variables: vars });
    console.log('[GV] POST', url, 'key length:', this.key.length);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': this.key },
      body,
    });
    const text = await res.text();
    console.log('[GV] response status:', res.status, 'type:', res.headers.get('content-type'), 'body first 80:', text.slice(0, 80));
    try {
      return JSON.parse(text);
    } catch (e) {
      throw new Error(`Server returned HTML instead of JSON (status ${res.status}). URL: ${url}. Body: ${text.slice(0, 100)}`);
    }
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

  async sync() {
    const raw = await this.fetchIssues();
    const mapped = mapLinearIssues(raw);
    Linear.issues = mapped.issues;
    Linear.done = mapped.done;
    this.lastSyncTime = Date.now();
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

  const cre = ['创作','creative','写作','write','小说','novel','设计','design','内容','content','文案','copy','视频','video','博客','blog','策划','编辑','产品','product'];

  // 含"野居"字样 或 创作相关 → 木星兵团
  if (text.includes('野居')) return 'jupiter';
  for (const w of cre) if (text.includes(w)) return 'jupiter';

  // 其余全部 → 地球联合政府（星际遗民作为备用，不自动分配）
  return 'egov';
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
      description: issue.description || '',
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
// WIP 工时系统（Work In Progress Points）
// ============================================
const DEPLOY_COSTS = {
  raider: 30,
  destroyer: 60,
  cruiser: 120,
  battleship: 220,
  flagship: 450,
};

const WIPStore = {
  _key: 'gv_wip',
  load() {
    try { return JSON.parse(localStorage.getItem(this._key)) || {}; } catch { return {}; }
  },
  save(data) { localStorage.setItem(this._key, JSON.stringify(data)); },

  get() {
    const data = this.load();
    const today = new Date().toISOString().split('T')[0];
    // 每日重置
    if (data.date !== today) {
      data.date = today;
      data.todayOnline = 0;
      data.dailyKillBonus = false;
      data.killStreak = 0;
    }
    return {
      total: data.total || 0,
      todayOnline: data.todayOnline || 0,
      dailyKillBonus: data.dailyKillBonus || false,
      killStreak: data.killStreak || 0,
      date: data.date || today,
      deployed: data.deployed || [],
    };
  },

  addOnline(minutes) {
    const d = this.get();
    const gain = Math.min(minutes, Math.max(0, 60 - d.todayOnline));
    if (gain <= 0) return 0;
    d.total += gain;
    d.todayOnline += gain;
    this.save(d);
    return gain;
  },

  addKill(estimate) {
    const d = this.get();
    let gain = (estimate || 3) * 10;
    d.killStreak = (d.killStreak || 0) + 1;
    // Streak 加成
    if (d.killStreak >= 5) gain = Math.round(gain * 1.5);
    else if (d.killStreak >= 3) gain = Math.round(gain * 1.2);
    // 每日首杀 bonus
    if (!d.dailyKillBonus) {
      gain += 50;
      d.dailyKillBonus = true;
    }
    d.total += gain;
    this.save(d);
    return gain;
  },

  resetStreak() {
    const d = this.get();
    d.killStreak = 0;
    this.save(d);
  },

  canDeploy(cost) {
    return this.get().total >= cost;
  },

  spend(cost) {
    const d = this.get();
    if (d.total < cost) return false;
    d.total -= cost;
    this.save(d);
    return true;
  },

  addDeployed(ship) {
    const d = this.get();
    d.deployed.push(ship);
    this.save(d);
  },

  removeDeployed(id) {
    const d = this.get();
    d.deployed = d.deployed.filter(s => s.id !== id);
    this.save(d);
  },

  getDeployed() {
    return this.get().deployed;
  },
};

// ============================================
// 战史系统 v2.3 — 战斗记录与统计
// ============================================
const WarHistoryStore = {
  _key: 'gv_war_history',
  _maxRecords: 50,

  load() {
    try { return JSON.parse(localStorage.getItem(this._key)) || { records: [], stats: {} }; } catch { return { records: [], stats: {} }; }
  },
  save(data) { localStorage.setItem(this._key, JSON.stringify(data)); },

  get() {
    const data = this.load();
    const today = new Date().toISOString().split('T')[0];
    if (!data.records) data.records = [];
    if (!data.stats) data.stats = {};
    if (data.stats.date !== today) {
      data.stats.date = today;
      data.stats.todayKills = 0;
      data.stats.todayWip = 0;
    }
    return data;
  },

  // 记录一次击沉
  recordKill(unit, wipEarned) {
    const data = this.get();
    const now = new Date();
    data.records.unshift({
      id: 'wh-k-' + now.getTime(),
      type: 'kill',
      time: now.toISOString(),
      shipName: unit.name,
      shipClass: SHIP_CLASSES[unit.shipClass]?.label || unit.shipClass,
      faction: unit.faction,
      factionName: FACTIONS[unit.faction]?.name || unit.faction,
      missionTitle: unit.mission?.title || '',
      missionId: unit.mission?.linearId || '',
      wipEarned: wipEarned || 0,
      location: nearestPlanet(unit.x, unit.y),
    });
    if (data.records.length > this._maxRecords) data.records.pop();

    data.stats.totalKills = (data.stats.totalKills || 0) + 1;
    data.stats.todayKills = (data.stats.todayKills || 0) + 1;
    data.stats.todayWip = (data.stats.todayWip || 0) + (wipEarned || 0);
    this._incFactionStat(data.stats, unit.faction);
    this.save(data);
    return data;
  },

  // 记录一次部署
  recordDeploy(ship) {
    const data = this.get();
    const now = new Date();
    data.records.unshift({
      id: 'wh-d-' + now.getTime(),
      type: 'deploy',
      time: now.toISOString(),
      shipName: ship.name,
      shipClass: SHIP_CLASSES[ship.shipClass]?.label || ship.shipClass,
      faction: 'vanguard',
      factionName: FACTIONS.vanguard.name,
      wipSpent: DEPLOY_COSTS[ship.shipClass] || 0,
    });
    if (data.records.length > this._maxRecords) data.records.pop();
    this.save(data);
    return data;
  },

  // 记录同步事件（新威胁/撤离）
  recordSync(added, removed) {
    const data = this.get();
    const now = new Date();
    if (added > 0) {
      data.records.unshift({
        id: 'wh-s-' + now.getTime(),
        type: 'sync-in',
        time: now.toISOString(),
        count: added,
        desc: `探测到 ${added} 艘新敌舰`,
      });
    }
    if (removed > 0) {
      data.records.unshift({
        id: 'wh-s-' + (now.getTime() + 1),
        type: 'sync-out',
        time: now.toISOString(),
        count: removed,
        desc: `${removed} 艘敌舰已撤离`,
      });
    }
    while (data.records.length > this._maxRecords) data.records.pop();
    this.save(data);
    return data;
  },

  _incFactionStat(stats, faction) {
    if (!stats.byFaction) stats.byFaction = {};
    stats.byFaction[faction] = (stats.byFaction[faction] || 0) + 1;
  },

  getStats() {
    return this.get().stats;
  },

  getRecords(limit = 8) {
    return this.get().records.slice(0, limit);
  },

  clear() {
    this.save({ records: [], stats: {} });
  },
};

// 在线计时器（每分钟 +1 WIP，每日上限 60）
let _wipTimer = null;
function startWipTimer() {
  if (_wipTimer) clearInterval(_wipTimer);
  let lastMin = Math.floor(Date.now() / 60000);
  _wipTimer = setInterval(() => {
    const nowMin = Math.floor(Date.now() / 60000);
    const delta = nowMin - lastMin;
    if (delta > 0) {
      const gained = WIPStore.addOnline(delta);
      if (gained > 0) updateWipUI();
      lastMin = nowMin;
    }
  }, 10000); // 每 10 秒检查一次
}

// ============================================
// 舰队部署系统
// ============================================
function deployShip(classType, customName) {
  const cost = DEPLOY_COSTS[classType];
  if (!cost) { alert('未知舰型'); return; }
  if (!WIPStore.canDeploy(cost)) { alert(`WIP 不足，需要 ${cost} 点`); return; }

  const used = new Set(G.units.map(x => x.name));
  let name = customName?.trim();
  if (name) {
    // 自定义名字才检查重复
    if (used.has(name)) { alert('该舰名已存在'); return; }
  } else {
    name = genShipName('vanguard', used);
  }

  WIPStore.spend(cost);

  const ship = {
    id: genCode('vanguard', WIPStore.getDeployed().length + 1000),
    name,
    shipClass: classType,
    faction: 'vanguard',
    x: clamp(CONFIG.EARTH.x + rand(16) - 8, 10, 90),
    y: clamp(CONFIG.EARTH.y + rand(12) - 6, 10, 90),
    status: 'patrol',
    power: SHIP_CLASSES[classType].powerBase + rand(20) - 5,
    supply: rand(30) + 60,
    morale: rand(20) + 70,
    mission: { title: '巡逻中', status: 'reserve' },
  };

  WIPStore.addDeployed(ship);
  G.units.push(ship);

  WarHistoryStore.recordDeploy(ship);
  renderWarHistory();

  updateWipUI();
  renderUnits();
  renderDetail(ship.id);
}

function formatTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function updateWipUI() {
  const d = WIPStore.get();

  // 右侧面板
  const el = document.querySelector('#wipDisplay');
  if (el) {
    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:18px;font-weight:700;color:#ffd251;">${d.total}</span>
        <span style="font-size:11px;color:var(--muted);">WIP 工时</span>
      </div>
      <div style="font-size:11px;color:var(--muted);margin-top:2px;">
        今日在线 ${formatTime(d.todayOnline)} / 01:00 | Streak: ${d.killStreak}
      </div>
    `;
  }

  // 地图科幻 HUD
  const hudTime = document.querySelector('#hudTime');
  if (hudTime) hudTime.textContent = formatTime(d.todayOnline);

  const hudWip = document.querySelector('#hudWipTotal');
  if (hudWip) hudWip.textContent = d.total;

  const hudStreak = document.querySelector('#hudStreak');
  if (hudStreak) {
    hudStreak.textContent = d.killStreak;
    hudStreak.classList.toggle('alert', d.killStreak >= 3);
  }

  // 更新部署按钮状态
  document.querySelectorAll('[data-deploy-cost]').forEach(btn => {
    const cost = parseInt(btn.dataset.deployCost, 10);
    btn.disabled = d.total < cost;
    btn.style.opacity = d.total < cost ? '0.4' : '1';
    btn.style.cursor = d.total < cost ? 'not-allowed' : 'pointer';
  });
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
  const pool = NATO_NAMES[faction] || NATO_NAMES.vanguard;
  let name, tries = 0;
  do {
    name = pick(pool) + '-' + (rand(99) + 1);
    tries++;
  } while (used.has(name) && tries < 100);
  // 100 次全冲突则追加随机后缀确保唯一
  if (used.has(name)) name += '-' + (rand(999) + 1);
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
    egov: { x: [58, 90], y: [12, 42] },
    jupiter: { x: [55, 92], y: [54, 88] },
    remnant: { x: [6, 40], y: [66, 96] },
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

  // 加载玩家手动部署的舰队
  const deployed = WIPStore.getDeployed();
  deployed.forEach((ship, i) => {
    if (!used.has(ship.name)) {
      used.add(ship.name);
      units.push({
        ...ship,
        id: ship.id || genCode('vanguard', i + 1000),
        faction: 'vanguard',
        status: 'patrol',
        advanceDist: distToEarth(ship.x, ship.y),
      });
    }
  });

  G.units = units;
}

// ============================================
// Starship Sync — 实时差异同步引擎 v2.1
// 核心职责：轮询检测 Linear 任务变化，丝滑增量渲染
// ============================================
const StarshipSync = {
  // ---------- 差异检测 ----------
  diff(oldIssues, newIssues) {
    const oldMap = new Map((oldIssues || []).map(i => [i.id, i]));
    const newMap = new Map((newIssues || []).map(i => [i.id, i]));
    const added = [];
    const removed = [];
    const changed = [];

    for (const [id, issue] of newMap) {
      if (!oldMap.has(id)) added.push(issue);
    }
    for (const [id, issue] of oldMap) {
      if (!newMap.has(id)) removed.push(issue);
    }
    for (const [id, newIssue] of newMap) {
      const oldIssue = oldMap.get(id);
      if (oldIssue) {
        const hasChanged = (
          oldIssue.priority !== newIssue.priority ||
          oldIssue.status !== newIssue.status ||
          oldIssue.due !== newIssue.due ||
          oldIssue.faction !== newIssue.faction ||
          oldIssue.title !== newIssue.title ||
          oldIssue.estimate !== newIssue.estimate
        );
        if (hasChanged) changed.push({ old: oldIssue, new: newIssue });
      }
    }
    return { added, removed, changed };
  },

  // ---------- 创建飞船数据 ----------
  createUnit(issue, index, usedNames) {
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

    return {
      id: genCode(issue.faction, index),
      name: genShipName(issue.faction, usedNames),
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
    };
  },

  // ---------- 新飞船入场动画 ----------
  spawnAnimation(unit) {
    const layer = document.querySelector('#unitLayer');
    if (!layer) return;
    const f = FACTIONS[unit.faction];
    const isV = unit.faction === 'vanguard';
    const threat = isV ? 72 : 72 + unit.power * 0.58;
    const crit = !isV && unit.advanceDist < CONFIG.CRITICAL_DISTANCE;
    const adv = unit.status === 'advancing';
    const angle = unit.faction === 'remnant' ? '-28deg' : unit.faction === 'jupiter' ? '18deg' : '-12deg';

    // 从势力基地边缘飞入的起点
    const zone = spawnZone(unit.faction);
    const startX = zone.x[0] + (zone.x[1] - zone.x[0]) * 0.3 + rand(20);
    const startY = zone.y[0] + (zone.y[1] - zone.y[0]) * 0.3 + rand(20);

    // 创建威胁圈
    if (!isV) {
      const pulse = document.createElement('span');
      pulse.className = `threat-pulse spawn-in`;
      pulse.dataset.unitId = unit.id;
      pulse.style.cssText = `left:${unit.x}%;top:${unit.y}%;--radius:${threat}px;--unit-color:${crit ? '#ff3f52' : f.color};transition:left 1.4s cubic-bezier(.2,.8,.2,1),top 1.4s cubic-bezier(.2,.8,.2,1);`;
      layer.appendChild(pulse);

      const trail = document.createElement('span');
      trail.className = `unit-trail spawn-in`;
      trail.dataset.unitId = unit.id;
      trail.style.cssText = `left:${unit.x - 1.4}%;top:${unit.y + 1.1}%;--trail-width:${54 + unit.power * 0.32}px;--angle:${angle};--unit-color:${f.color};transition:left 1.4s cubic-bezier(.2,.8,.2,1),top 1.4s cubic-bezier(.2,.8,.2,1);`;
      layer.appendChild(trail);
    }

    // 创建飞船 DOM
    const el = document.createElement('button');
    el.className = `unit ship-${unit.shipClass} ${unit.status} is-spawning`;
    el.dataset.id = unit.id;
    el.type = 'button';
    el.style.cssText = `left:${startX}%;top:${startY}%;--unit-color:${f.color};--unit-glow:${f.glow};--status-color:${adv ? '#ff3f52' : '#4da3ff'};--ship-size:${SHIP_CLASSES[unit.shipClass]?.size || 34}px;color:${f.color};transition:left 1.4s cubic-bezier(.2,.8,.2,1),top 1.4s cubic-bezier(.2,.8,.2,1),opacity 600ms ease,transform 600ms cubic-bezier(.2,.8,.2,1);`;
    el.innerHTML = `
      ${shipIcon(unit.shipClass)}
      <span class="engine-flame" style="background:linear-gradient(180deg, ${f.color}, transparent);"></span>
      <span class="unit-code">${unit.id}</span>
      <span class="unit-label">${unit.name}</span>
    `;
    layer.appendChild(el);

    // 跃迁闪光
    this.createWarpFlash(unit.x, unit.y, f.color);

    // 下一帧触发移动动画
    requestAnimationFrame(() => {
      el.style.left = unit.x + '%';
      el.style.top = unit.y + '%';
      if (!isV) {
        const p = layer.querySelector(`.threat-pulse[data-unit-id="${cssEscape(unit.id)}"]`);
        const t = layer.querySelector(`.unit-trail[data-unit-id="${cssEscape(unit.id)}"]`);
        if (p) { p.style.left = unit.x + '%'; p.style.top = unit.y + '%'; }
        if (t) { t.style.left = (unit.x - 1.4) + '%'; t.style.top = (unit.y + 1.1) + '%'; }
      }
    });

    // 动画结束后移除 spawning 标记
    setTimeout(() => {
      el.classList.remove('is-spawning');
      // 清除 transition 避免影响后续 shipFloat 动画
      el.style.transition = '';
      if (!isV) {
        const p = layer.querySelector(`.threat-pulse[data-unit-id="${cssEscape(unit.id)}"]`);
        const t = layer.querySelector(`.unit-trail[data-unit-id="${cssEscape(unit.id)}"]`);
        if (p) p.style.transition = '';
        if (t) t.style.transition = '';
      }
    }, 1500);
  },

  // ---------- 离场动画 ----------
  despawnAnimation(unitId) {
    const el = document.querySelector(`.unit[data-id="${cssEscape(unitId)}"]`);
    if (el) {
      el.classList.add('is-destroying');
      setTimeout(() => {
        el.remove();
        document.querySelectorAll(`.threat-pulse[data-unit-id="${cssEscape(unitId)}"], .unit-trail[data-unit-id="${cssEscape(unitId)}"]`).forEach(e => e.remove());
      }, 500);
    }
  },

  // ---------- 更新已有飞船 ----------
  updateUnit(unit, issue) {
    const oldClass = unit.shipClass;
    const oldStatus = unit.status;
    unit.shipClass = priorityToClass(issue.priority);
    unit.mission.title = issue.title;
    unit.mission.priority = issue.priority;
    unit.mission.status = issue.status;
    unit.mission.due = issue.due;
    unit.mission.estimate = issue.estimate;
    unit.mission.labels = issue.labels;

    const od = daysOverdue(issue.due);
    unit.status = od > 0 ? 'advancing' : 'stationed';
    unit.mission.overdue = od;
    unit.advanceDist = distToEarth(unit.x, unit.y);

    const el = document.querySelector(`.unit[data-id="${cssEscape(unit.id)}"]`);
    if (!el) return;

    // 更新舰型
    if (oldClass !== unit.shipClass) {
      el.classList.remove(`ship-${oldClass}`);
      el.classList.add(`ship-${unit.shipClass}`);
      el.style.setProperty('--ship-size', (SHIP_CLASSES[unit.shipClass]?.size || 34) + 'px');
      const icon = el.querySelector('.ship-icon');
      if (icon) icon.outerHTML = shipIcon(unit.shipClass);
    }

    // 更新状态类
    if (oldStatus !== unit.status) {
      el.classList.remove(oldStatus);
      el.classList.add(unit.status);
      el.style.setProperty('--status-color', unit.status === 'advancing' ? '#ff3f52' : '#4da3ff');
    }

    // 如果逾期推进导致位置变化，平滑移动
    if (od > 0) {
      const zone = spawnZone(issue.faction);
      let nx = rand(zone.x[1] - zone.x[0]) + zone.x[0];
      let ny = rand(zone.y[1] - zone.y[0]) + zone.y[0];
      const dx = CONFIG.EARTH.x - nx, dy = CONFIG.EARTH.y - ny;
      const d = Math.sqrt(dx * dx + dy * dy);
      const adv = od * CONFIG.ADVANCE_RATE;
      nx += (dx / d) * adv;
      ny += (dy / d) * adv;
      nx = clamp(nx, 5, 95);
      ny = clamp(ny, 5, 95);

      if (Math.abs(nx - unit.x) > 1.5 || Math.abs(ny - unit.y) > 1.5) {
        unit.x = nx;
        unit.y = ny;
        el.style.transition = 'left 1.5s cubic-bezier(.2,.8,.2,1), top 1.5s cubic-bezier(.2,.8,.2,1)';
        el.style.left = nx + '%';
        el.style.top = ny + '%';
        const p = document.querySelector(`.threat-pulse[data-unit-id="${cssEscape(unit.id)}"]`);
        const t = document.querySelector(`.unit-trail[data-unit-id="${cssEscape(unit.id)}"]`);
        if (p) { p.style.transition = el.style.transition; p.style.left = nx + '%'; p.style.top = ny + '%'; }
        if (t) { t.style.transition = el.style.transition; t.style.left = (nx - 1.4) + '%'; t.style.top = (ny + 1.1) + '%'; }
        setTimeout(() => {
          el.style.transition = '';
          if (p) p.style.transition = '';
          if (t) t.style.transition = '';
        }, 1600);
      }
    }

    unit.advanceDist = distToEarth(unit.x, unit.y);
  },

  // ---------- 跃迁闪光 ----------
  createWarpFlash(x, y, color) {
    const world = document.querySelector('#mapWorld');
    if (!world) return;
    const flash = document.createElement('div');
    flash.className = 'warp-effect';
    flash.style.cssText = `left:${x}%;top:${y}%;width:70px;height:70px;background:radial-gradient(circle, ${color} 0%, transparent 70%);`;
    world.appendChild(flash);
    setTimeout(() => flash.remove(), 850);
  },

  // ---------- 增量同步入口 ----------
  applyIncremental() {
    const oldIssues = G._lastSyncedIssues || [];
    const newIssues = Linear.issues;
    G._lastSyncedIssues = JSON.parse(JSON.stringify(newIssues));

    const diff = this.diff(oldIssues, newIssues);
    if (diff.added.length === 0 && diff.removed.length === 0 && diff.changed.length === 0) return;

    // 新增飞船
    const used = new Set(G.units.map(u => u.name));
    const enemyCount = G.units.filter(u => u.faction !== 'vanguard').length;
    diff.added.forEach((issue, i) => {
      const unit = this.createUnit(issue, enemyCount + i, used);
      G.units.push(unit);
      this.spawnAnimation(unit);
    });

    // 移除飞船（播放离场动画）
    diff.removed.forEach(issue => {
      const unit = G.units.find(u => u.mission?.linearId === issue.id);
      if (unit && unit.status !== 'destroyed') {
        this.despawnAnimation(unit.id);
        unit.status = 'destroyed';
      }
    });

    // 更新飞船属性
    diff.changed.forEach(({ new: newIssue }) => {
      const unit = G.units.find(u => u.mission?.linearId === newIssue.id);
      if (unit && unit.status !== 'destroyed') {
        this.updateUnit(unit, newIssue);
      }
    });

    // 延迟清理已摧毁单位
    setTimeout(() => {
      G.units = G.units.filter(u => u.status !== 'destroyed');
    }, 600);

    // 刷新面板
    renderBriefing();
    if (diff.added.length > 0 || diff.removed.length > 0) {
      showSyncToast(diff.added.length, diff.removed.length);
      WarHistoryStore.recordSync(diff.added.length, diff.removed.length);
      renderWarHistory();
    }
  },
};

// ============================================
// Animation Engine v2.2 — 飞船自主移动 + 轨道系统预留
// 用 rAF 驱动所有飞船动画，替代纯 CSS shipFloat
// ============================================
const AnimationEngine = {
  frameId: null,
  lastTime: 0,
  running: false,
  orbitMap: new Map(),      // unitId -> { cx, cy, radius, angle, speed }
  driftMap: new Map(),      // unitId -> { phase, ampX, ampY, freq, speed }
  elCache: new Map(),       // unitId -> { unit, pulse, trail }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.warmCache();
    this.frameId = requestAnimationFrame(t => this.tick(t));
    console.log('[GV] AnimationEngine started');
  },

  stop() {
    this.running = false;
    if (this.frameId) cancelAnimationFrame(this.frameId);
    this.frameId = null;
  },

  warmCache() {
    // 预热 DOM 缓存，避免每帧 querySelector
    this.elCache.clear();
    G.units.forEach(unit => {
      if (unit.status === 'destroyed') return;
      const u = document.querySelector(`.unit[data-id="${cssEscape(unit.id)}"]`);
      if (u) {
        const p = document.querySelector(`.threat-pulse[data-unit-id="${cssEscape(unit.id)}"]`);
        const t = document.querySelector(`.unit-trail[data-unit-id="${cssEscape(unit.id)}"]`);
        this.elCache.set(unit.id, { unit: u, pulse: p, trail: t });
      }
    });
  },

  tick(now) {
    if (!this.running) return;
    const dt = Math.min((now - this.lastTime) / 1000, 0.1); // cap at 100ms
    this.lastTime = now;

    G.units.forEach(unit => {
      if (unit.status === 'destroyed') return;
      if (unit.faction === 'vanguard') {
        this.updateVanguard(unit, dt);
      } else {
        this.updateEnemy(unit, dt);
      }
      this.updateDOM(unit);
    });

    this.frameId = requestAnimationFrame(t => this.tick(t));
  },

  // ---------- 友方飞船 ----------
  updateVanguard(unit, dt) {
    const orbit = this.orbitMap.get(unit.id);
    if (orbit) {
      // 轨道运动
      orbit.angle += orbit.speed * dt;
      unit.x = orbit.cx + Math.cos(orbit.angle) * orbit.radius;
      unit.y = orbit.cy + Math.sin(orbit.angle) * orbit.radius;
    }
    // 友方也有漂移，但幅度更小
    this.applyDrift(unit, dt, 0.6);
    unit.advanceDist = distToEarth(unit.x, unit.y);
  },

  // ---------- 敌方飞船 ----------
  updateEnemy(unit, dt) {
    const od = unit.mission?.overdue || 0;

    // 逾期飞船持续向地球推进
    if (od > 0 && unit.advanceDist > CONFIG.CRITICAL_DISTANCE) {
      const dx = CONFIG.EARTH.x - unit.x;
      const dy = CONFIG.EARTH.y - unit.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      const speed = od * CONFIG.ADVANCE_RATE * 0.006;
      unit.x += (dx / d) * speed * dt * 60;
      unit.y += (dy / d) * speed * dt * 60;
      unit.x = clamp(unit.x, 5, 95);
      unit.y = clamp(unit.y, 5, 95);
      unit.advanceDist = distToEarth(unit.x, unit.y);
    }

    // 巡逻漂移（替代 CSS shipFloat）
    this.applyDrift(unit, dt, 1.0);
  },

  // ---------- 漂移系统（替代 CSS shipFloat） ----------
  applyDrift(unit, dt, scale = 1.0) {
    let d = this.driftMap.get(unit.id);
    if (!d) {
      d = {
        phase: Math.random() * Math.PI * 2,
        ampX: (0.1 + Math.random() * 0.15),
        ampY: (0.15 + Math.random() * 0.2),
        freq: (0.25 + Math.random() * 0.35),
      };
      this.driftMap.set(unit.id, d);
    }
    // 选中时漂移减小
    const selectedScale = (G.selectedId === unit.id) ? 0.2 : 1.0;
    d.phase += d.freq * dt;
    unit._driftX = Math.sin(d.phase) * d.ampX * scale * selectedScale;
    unit._driftY = Math.cos(d.phase * 0.73) * d.ampY * scale * selectedScale;
  },

  // ---------- DOM 更新 ----------
  updateDOM(unit) {
    const cached = this.elCache.get(unit.id);
    if (!cached || !cached.unit.isConnected) {
      // 缓存失效，尝试重建
      const u = document.querySelector(`.unit[data-id="${cssEscape(unit.id)}"]`);
      if (!u) return;
      const p = document.querySelector(`.threat-pulse[data-unit-id="${cssEscape(unit.id)}"]`);
      const t = document.querySelector(`.unit-trail[data-unit-id="${cssEscape(unit.id)}"]`);
      this.elCache.set(unit.id, { unit: u, pulse: p, trail: t });
      return this.updateDOM(unit); // 递归一次
    }

    const rx = unit.x + (unit._driftX || 0);
    const ry = unit.y + (unit._driftY || 0);

    cached.unit.style.left = rx + '%';
    cached.unit.style.top = ry + '%';

    if (cached.pulse) {
      cached.pulse.style.left = rx + '%';
      cached.pulse.style.top = ry + '%';
    }
    if (cached.trail) {
      cached.trail.style.left = (rx - 1.4) + '%';
      cached.trail.style.top = (ry + 1.1) + '%';
    }
  },

  // ---------- 轨道系统接口（预留） ----------
  registerOrbit(unitId, centerX, centerY, radius, speed = 0.4) {
    this.orbitMap.set(unitId, {
      cx: centerX, cy: centerY, radius,
      angle: Math.random() * Math.PI * 2,
      speed,
    });
    console.log('[GV] Orbit registered:', unitId, 'r=', radius, 'speed=', speed);
  },

  unregisterOrbit(unitId) {
    this.orbitMap.delete(unitId);
  },

  // 批量注册轨道（按势力区域）
  registerFactionOrbit(faction, radius = 12, speed = 0.3) {
    const zone = spawnZone(faction);
    const cx = (zone.x[0] + zone.x[1]) / 2;
    const cy = (zone.y[0] + zone.y[1]) / 2;
    G.units.filter(u => u.faction === faction && u.status !== 'destroyed').forEach((u, i) => {
      const r = radius + i * 3;
      const spd = speed * (0.8 + Math.random() * 0.4);
      this.registerOrbit(u.id, cx, cy, r, spd);
    });
  },

  clearAllOrbits() {
    this.orbitMap.clear();
  },
};

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
// 战史面板渲染 v2.3
// ============================================
function renderWarHistory() {
  const el = document.querySelector('#warHistoryDisplay');
  if (!el) return;

  const stats = WarHistoryStore.getStats();
  const records = WarHistoryStore.getRecords(6);
  const today = new Date().toISOString().split('T')[0];

  let html = '';

  // 统计行
  html += `<div class="wh-stats">`;
  html += `<div class="wh-stat"><span class="wh-stat-val">${stats.todayKills || 0}</span><span class="wh-stat-label">今日击沉</span></div>`;
  html += `<div class="wh-stat"><span class="wh-stat-val">${stats.totalKills || 0}</span><span class="wh-stat-label">总计</span></div>`;
  html += `<div class="wh-stat"><span class="wh-stat-val">${stats.todayWip || 0}</span><span class="wh-stat-label">今日WIP</span></div>`;
  html += `</div>`;

  // 记录列表
  if (records.length === 0) {
    html += `<p class="muted" style="font-size:12px;margin-top:8px;">暂无战史记录</p>`;
  } else {
    html += `<div class="wh-list">`;
    for (const r of records) {
      const time = new Date(r.time);
      const timeStr = `${String(time.getHours()).padStart(2,'0')}:${String(time.getMinutes()).padStart(2,'0')}`;
      const isToday = r.time.startsWith(today);

      if (r.type === 'kill') {
        const fcolor = FACTIONS[r.faction]?.color || '#e8fbff';
        html += `
          <div class="wh-item kill">
            <span class="wh-time${isToday ? ' today' : ''}">${timeStr}</span>
            <span class="wh-dot" style="background:${fcolor};box-shadow:0 0 6px ${fcolor}40;"></span>
            <span class="wh-text">击沉 <strong style="color:${fcolor}">${r.shipName}</strong> <span class="wh-class">${r.shipClass}</span></span>
            ${r.wipEarned ? `<span class="wh-wip">+${r.wipEarned}</span>` : ''}
          </div>`;
      } else if (r.type === 'deploy') {
        html += `
          <div class="wh-item deploy">
            <span class="wh-time${isToday ? ' today' : ''}">${timeStr}</span>
            <span class="wh-dot" style="background:#4da3ff;box-shadow:0 0 6px rgba(77,163,255,0.25);"></span>
            <span class="wh-text">部署 <strong style="color:#4da3ff">${r.shipName}</strong> <span class="wh-class">${r.shipClass}</span></span>
            <span class="wh-wip" style="color:#ff3f52;">-${r.wipSpent || 0}</span>
          </div>`;
      } else if (r.type === 'sync-in') {
        html += `
          <div class="wh-item sync">
            <span class="wh-time${isToday ? ' today' : ''}">${timeStr}</span>
            <span class="wh-dot" style="background:#ffd251;box-shadow:0 0 6px rgba(255,210,81,0.25);"></span>
            <span class="wh-text">${r.desc}</span>
          </div>`;
      } else if (r.type === 'sync-out') {
        html += `
          <div class="wh-item sync">
            <span class="wh-time${isToday ? ' today' : ''}">${timeStr}</span>
            <span class="wh-dot" style="background:#17d7b6;box-shadow:0 0 6px rgba(23,215,182,0.25);"></span>
            <span class="wh-text">${r.desc}</span>
          </div>`;
      }
    }
    html += `</div>`;
  }

  el.innerHTML = html;
}

// ============================================
// 同步状态 Toast 通知
// ============================================
function showSyncToast(added, removed) {
  const hud = document.querySelector('#sciFiHud');
  if (!hud) return;
  let msg = '';
  if (added > 0 && removed > 0) msg = `+${added} 新威胁 / -${removed} 已清除`;
  else if (added > 0) msg = `探测到 ${added} 艘新敌舰`;
  else if (removed > 0) msg = `${removed} 艘敌舰已撤离`;
  if (!msg) return;

  const toast = document.createElement('div');
  toast.className = 'sync-toast';
  toast.textContent = msg;
  hud.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 500ms ease';
    setTimeout(() => toast.remove(), 550);
  }, 2200);
}

// ============================================
// 完成任务 → 击沉敌舰
// ============================================
async function completeMission(unitId) {
  const u = G.units.find(x => x.id === unitId);
  if (!u || u.faction === 'vanguard') return;

  // 纯展示型：不回写 Linear，仅在本地播放动画并更新状态
  // 用户需在 Linear 中手动标记完成，下次同步时游戏自动识别

  const impact = unitStagePoint(unitId, u);
  const unitEl = document.querySelector(`.unit[data-id="${cssEscape(unitId)}"]`);
  unitEl?.classList.add('is-destroying');

  // 1. 本地视觉效果：克制的战术锁定/失联反馈，避免廉价粒子爆炸
  tacticalStrike(impact.x, impact.y, FACTIONS[u.faction].color);
  renderDetail(null);

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

  // WIP 奖励
  const wipGain = WIPStore.addKill(u.mission.estimate);
  updateWipUI();

  // 战史记录（持久化）
  WarHistoryStore.recordKill(u, wipGain);
  renderWarHistory();

  // 延迟刷新
  setTimeout(() => {
    renderUnits();
    renderBriefing();
    renderDetail(null);
  }, 720);

  // 提示
  const statusEl = document.querySelector('#connectStatus');
  if (statusEl) {
    const streak = WIPStore.get().killStreak;
    const streakText = streak >= 5 ? ' [Streak x1.5!]' : streak >= 3 ? ' [Streak x1.2]' : '';
    statusEl.textContent = `+${wipGain} WIP${streakText} — 请在 Linear 中标记完成`;
    statusEl.style.color = '#ffd251';
    setTimeout(() => { statusEl.textContent = ''; }, 5000);
  }
}

async function startMission(unitId) {
  const u = G.units.find(x => x.id === unitId);
  if (!u || u.faction === 'vanguard') return;

  // 纯展示型：不回写 Linear，仅更新本地状态
  u.mission.status = 'in_progress';
  const issue = Linear.issues.find(i => i.id === u.mission.linearId);
  if (issue) issue.status = 'in_progress';
  renderUnits();
  renderDetail(unitId);

  const statusEl = document.querySelector('#connectStatus');
  if (statusEl) {
    statusEl.textContent = '⚡ 交火状态已更新 — 请在 Linear 中手动开始该任务';
    statusEl.style.color = '#ffd251';
    setTimeout(() => { statusEl.textContent = ''; }, 5000);
  }
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

  const seedRand = (() => {
    let seed = 928371;
    return () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  })();

  const addGlow = (x, y, radius, color) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, color);
    g.addColorStop(0.42, color.replace(/[\d.]+\)$/u, '0.045)'));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  };

  addGlow(r.width * 0.22, r.height * 0.36, r.width * 0.34, 'rgba(53,92,126,0.12)');
  addGlow(r.width * 0.72, r.height * 0.58, r.width * 0.28, 'rgba(31,82,91,0.08)');
  addGlow(r.width * 0.48, r.height * 0.5, r.width * 0.18, 'rgba(160,112,52,0.06)');

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 360; i++) {
    const depth = seedRand();
    const x = seedRand() * r.width;
    const y = seedRand() * r.height;
    const size = 0.25 + depth * 1.15;
    const alpha = 0.05 + depth * 0.34;
    const tint = seedRand() > 0.82 ? '190,222,245' : '218,232,242';
    ctx.fillStyle = `rgba(${tint},${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 42; i++) {
    const x = seedRand() * r.width;
    const y = seedRand() * r.height;
    const length = 10 + seedRand() * 34;
    ctx.strokeStyle = `rgba(120,154,184,${0.018 + seedRand() * 0.035})`;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + length, y + (seedRand() - 0.5) * 6);
    ctx.stroke();
  }
  ctx.restore();
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
      <div><strong>${f.name}</strong></div>
    </div>
  `).join('');
}

function shipIcon(cls) {
  const p = {
    flagship: '<path d="M50 3 L64 24 L88 37 L74 53 L65 84 L50 96 L35 84 L26 53 L12 37 L36 24 Z"/><path d="M50 16 L50 78"/><path d="M28 43 L72 43"/><path d="M36 61 L64 61"/>',
    battleship: '<path d="M50 5 L74 35 L82 66 L61 61 L50 93 L39 61 L18 66 L26 35 Z"/><path d="M33 39 L67 39"/><path d="M35 56 L65 56"/><path d="M42 72 L58 72"/>',
    carrier: '<path d="M50 7 L86 38 L77 76 L56 67 L50 94 L44 67 L23 76 L14 38 Z"/><path d="M24 43 L76 43"/><path d="M28 57 L72 57"/><path d="M36 31 L64 31"/>',
    cruiser: '<path d="M50 7 L68 31 L76 61 L58 58 L50 90 L42 58 L24 61 L32 31 Z"/><path d="M37 39 L63 39"/><path d="M41 56 L59 56"/>',
    destroyer: '<path d="M50 8 L64 34 L70 60 L56 56 L50 86 L44 56 L30 60 L36 34 Z"/><path d="M39 43 L61 43"/>',
    raider: '<path d="M50 12 L70 53 L57 50 L50 85 L43 50 L30 53 Z"/><path d="M36 38 L24 32"/><path d="M64 38 L76 32"/>',
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
    const threat = isV ? 72 : 72 + u.power * 0.58;
    const crit = !isV && u.advanceDist < CONFIG.CRITICAL_DISTANCE;
    const adv = u.status === 'advancing';
    const angle = u.faction === 'remnant' ? '-28deg' : u.faction === 'jupiter' ? '18deg' : '-12deg';

    return `
      ${!isV ? `<span class="threat-pulse" style="left:${u.x}%;top:${u.y}%;--radius:${threat}px;--unit-color:${crit ? '#ff3f52' : f.color}"></span>` : ''}
      ${!isV ? `<span class="unit-trail" style="left:${u.x - 1.4}%;top:${u.y + 1.1}%;--trail-width:${54 + u.power * 0.32}px;--angle:${angle};--unit-color:${f.color}"></span>` : ''}
      <button class="unit ship-${u.shipClass} ${u.status} ${G.selectedId === u.id ? 'is-selected' : ''}"
        data-id="${u.id}" type="button"
        onclick="window.__game.selectUnit('${u.id}')"
        style="left:${u.x}%;top:${u.y}%;--unit-color:${f.color};--unit-glow:${f.glow};--status-color:${adv ? '#ff3f52' : '#4da3ff'};--ship-size:${SHIP_CLASSES[u.shipClass]?.size || 34}px;color:${f.color}">
        ${shipIcon(u.shipClass)}
        <span class="engine-flame" style="background:linear-gradient(180deg, ${f.color}, transparent);"></span>
        <span class="unit-code">${u.id}</span>
        <span class="unit-label">${u.name}</span>
      </button>
    `;
  }).join('');
}

function renderBriefing() {
  const el = document.querySelector('#dailyBrief');
  if (!el) return;
  const r = generateReport();

  let html = '';

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

  el.innerHTML = html;
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

function unitFromPoint(clientX, clientY) {
  const direct = document.elementsFromPoint(clientX, clientY)
    .map(el => el.closest?.('.unit'))
    .find(Boolean);
  if (direct) return direct;

  let best = null;
  let bestDist = Infinity;
  document.querySelectorAll('.unit').forEach(unit => {
    const rect = unit.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dist = Math.hypot(clientX - cx, clientY - cy);
    if (dist < bestDist) {
      best = unit;
      bestDist = dist;
    }
  });
  // 缩放感知阈值：缩得越小小，阈值越大（确保远距缩放下也能点到）
  const threshold = 44 / Math.max(map.zoom, 0.3);
  return bestDist <= threshold ? best : null;
}

// 拖拽距离检测 — click 和 pointerdown 之间移动超过此距离不算点击
const CLICK_DRAG_THRESHOLD = 6;
let _clickStart = { x: 0, y: 0, time: 0 };

function selectUnitAtPoint(e) {
  // 拖拽距离检测：如果 pointerdown 后移动超过阈值，不触发点击
  const dx = e.clientX - _clickStart.x;
  const dy = e.clientY - _clickStart.y;
  if (Math.hypot(dx, dy) > CLICK_DRAG_THRESHOLD) return false;

  if (e.target.closest?.('.map-controls, .unit-detail, .command-panel, button:not(.unit)')) return false;
  const unit = unitFromPoint(e.clientX, e.clientY);
  if (!unit) return false;
  e.preventDefault();
  e.stopPropagation();
  map.dragging = false;
  document.querySelector('#mapStage')?.classList.remove('is-panning');
  selectUnit(unit.dataset.id);
  return true;
}

function renderDetail(id) {
  const panel = document.querySelector('#unitDetail');
  if (!panel) return;
  panel.classList.toggle('has-selection', Boolean(id));
  if (!id) {
    panel.innerHTML = `
      <p class="eyebrow">单位详情</p>
      <h2>请选择舰队</h2>
      <p class="muted">点击地图上的作战单位，查看对应的 Linear 任务详情。</p>
    `;
    return;
  }

  const u = G.units.find(x => x.id === id);
  const f = FACTIONS[u.faction];
  const isV = u.faction === 'vanguard';
  const od = u.mission?.overdue || 0;

  // 倒计时文案
  let countdownText = '', countdownColor = '#17d7b6';
  if (u.mission?.due) {
    const days = daysUntil(u.mission.due);
    if (od > 0) {
      countdownText = `已逾期 ${od} 天`;
      countdownColor = '#ff3f52';
    } else if (days === 0) {
      countdownText = '今日截止';
      countdownColor = '#ffd251';
    } else {
      countdownText = `距离截止还有 ${days} 天`;
      countdownColor = days <= 2 ? '#ffd251' : '#17d7b6';
    }
  }

  let html = `
    <p class="eyebrow">${u.id} / ${f.name} / ${SHIP_CLASSES[u.shipClass].label}</p>
    <h2 class="unit-title" style="--unit-color:${f.color}">${u.name}</h2>
  `;

  if (!isV && u.mission) {
    const m = u.mission;
    const priorityLabel = { urgent: '紧急', high: '高优', medium: '普通', low: '低优' }[m.priority] || m.priority;
    const priorityClass = m.priority === 'urgent' ? 'urgent' : m.priority === 'high' ? 'high' : '';

    html += `
      <div class="mission-card" style="--accent:${f.color}">
        <p class="mission-title">${m.title}</p>
        <p class="mission-meta">${m.linearId} · 预估 ${m.estimate || 3} 点</p>
      </div>
    `;

    if (countdownText) {
      html += `<div class="countdown-bar" style="--color:${countdownColor}">${countdownText}</div>`;
    }

    // 标签
    const allLabels = [priorityLabel, ...(m.labels || [])];
    if (allLabels.length) {
      html += `<div class="tag-pills">${allLabels.map(l => `<span class="tag-pill ${priorityClass}">${l}</span>`).join('')}</div>`;
    }

    // 描述
    if (m.description) {
      const desc = m.description.replace(/<[^>]+>/g, '').trim();
      if (desc) {
        html += `
          <div class="mission-desc">
            <p class="desc-label">任务描述</p>
            <p class="desc-text">${desc.length > 200 ? desc.slice(0, 200) + '…' : desc}</p>
          </div>
        `;
      }
    }

    // 信息行
    html += `
      <div class="info-grid">
        <div><span>截止日期</span><strong>${m.due || '—'}</strong></div>
        <div><span>预估工时</span><strong>${m.estimate || 3} 点</strong></div>
      </div>
    `;

  } else if (isV) {
    html += `
      <div class="tag-pills">
        <span class="tag-pill">${SHIP_CLASSES[u.shipClass].label}</span>
        <span class="tag-pill">${u.status === 'patrol' ? '巡逻' : u.status}</span>
      </div>
      <p style="color:var(--muted);font-size:12px;margin-top:10px;">银河先遣队 ${SHIP_CLASSES[u.shipClass].label}，${u.status === 'patrol' ? '正在地球周围巡逻' : '待命'}。</p>
    `;
  }

  // 相关战史
  const hist = G.warHistory.filter(h => h.missionId === u.mission?.linearId).slice(0, 3);
  if (hist.length) {
    html += `<div class="history-block"><p class="history-label">作战记录</p>`;
    hist.forEach(h => {
      html += `<p class="history-item">· 第${h.turn}日 ${h.shipName} 于 ${h.location}</p>`;
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
const map = { zoom: 0.32, panX: 0, panY: 0, dragging: false, sx: 0, sy: 0, ox: 0, oy: 0, frame: 0 };
function applyMap() {
  const w = document.querySelector('#mapWorld');
  const l = document.querySelector('#zoomLabel');
  if (!w) return;
  w.style.setProperty('--zoom', map.zoom.toFixed(2));
  w.style.setProperty('--pan-x', `${Math.round(map.panX)}px`);
  w.style.setProperty('--pan-y', `${Math.round(map.panY)}px`);
  w.style.transform = `translate3d(-50%, -50%, 0) translate3d(${Math.round(map.panX)}px, ${Math.round(map.panY)}px, 0) scale(${map.zoom.toFixed(2)})`;
  if (l) l.textContent = `${Math.round(map.zoom * 100)}%`;
}
function scheduleMap() {
  if (map.frame) return;
  const nextFrame = window.requestAnimationFrame || ((callback) => window.setTimeout(callback, 16));
  map.frame = nextFrame(() => {
    map.frame = 0;
    applyMap();
  });
}
function zoom(d) { map.zoom = clamp(map.zoom + d, 0.26, 2.4); scheduleMap(); }
function resetMap() { map.zoom = 0.32; map.panX = 0; map.panY = 0; applyMap(); }
function initMap() {
  const stage = document.querySelector('#mapStage');
  if (!stage) return;
  const stopDrag = e => {
    if (!map.dragging) return;
    map.dragging = false;
    stage.classList.remove('is-panning');
    if (e?.pointerId != null) {
      try { stage.releasePointerCapture(e.pointerId); } catch {}
    }
  };
  document.querySelectorAll('[data-zoom]').forEach(b => {
    b.addEventListener('click', () => {
      const a = b.dataset.zoom;
      if (a === 'in') zoom(0.18);
      if (a === 'out') zoom(-0.18);
      if (a === 'reset') resetMap();
    });
  });
  const onWheel = e => {
    e.preventDefault();
    e.stopPropagation();
    const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (!delta) return;
    zoom(delta < 0 ? 0.12 : -0.12);
  };
  stage.addEventListener('wheel', onWheel, { passive: false, capture: true });
  stage.addEventListener('click', selectUnitAtPoint, { capture: true });
  stage.addEventListener('pointerdown', e => {
    // 记录 click 起点（用于拖拽距离检测）
    _clickStart = { x: e.clientX, y: e.clientY, time: Date.now() };

    // 用 elementsFromPoint 检查点击位置是否有飞船（避免 threat-pulse 等 pointer-events:none 元素穿透）
    const hasUnit = document.elementsFromPoint(e.clientX, e.clientY)
      .some(el => el.closest?.('.unit'));
    if (hasUnit || e.target.closest('.unit, .map-controls')) return;

    map.dragging = true; map.sx = e.clientX; map.sy = e.clientY; map.ox = map.panX; map.oy = map.panY;
    stage.classList.add('is-panning');
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener('pointermove', e => {
    if (!map.dragging) return;
    map.panX = map.ox + e.clientX - map.sx;
    map.panY = map.oy + e.clientY - map.sy;
    scheduleMap();
  });
  stage.addEventListener('pointerup', stopDrag);
  stage.addEventListener('pointercancel', stopDrag);
  stage.addEventListener('lostpointercapture', () => {
    map.dragging = false;
    stage.classList.remove('is-panning');
  });
  window.addEventListener('pointerup', stopDrag);
  window.addEventListener('pointercancel', stopDrag);
  window.addEventListener('blur', () => {
    map.dragging = false;
    stage.classList.remove('is-panning');
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
  svg.style.pointerEvents = 'none';
  svg.querySelectorAll('[data-dynamic-route="true"]').forEach(el => el.remove());
  document.querySelectorAll('.faction-aura').forEach(el => el.remove());

  // 添加额外航道
  EXTRA_ROUTES.forEach((route, i) => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', route.d);
    path.setAttribute('class', 'route route-neutral');
    path.setAttribute('data-dynamic-route', 'true');
    path.setAttribute('style', 'opacity:0.2;');
    svg.appendChild(path);
  });
  svg.querySelectorAll('*').forEach(el => {
    el.setAttribute('pointer-events', 'none');
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

function cssEscape(value) {
  if (window.CSS?.escape) return CSS.escape(value);
  return String(value).replace(/["\\]/g, '\\$&');
}

function unitStagePoint(unitId, unit) {
  const stage = document.querySelector('#mapStage');
  if (!stage) return { x: 0, y: 0 };
  const rect = stage.getBoundingClientRect();
  const unitEl = document.querySelector(`.unit[data-id="${cssEscape(unitId)}"]`);
  if (unitEl) {
    const uRect = unitEl.getBoundingClientRect();
    return {
      x: uRect.left + uRect.width / 2 - rect.left,
      y: uRect.top + uRect.height / 2 - rect.top,
    };
  }

  const world = document.querySelector('#mapWorld');
  const worldRect = world?.getBoundingClientRect();
  if (worldRect) {
    return {
      x: worldRect.left + (unit.x / 100) * worldRect.width - rect.left,
      y: worldRect.top + (unit.y / 100) * worldRect.height - rect.top,
    };
  }
  return { x: rect.width / 2, y: rect.height / 2 };
}

// ============================================
// 战术击沉效果
// ============================================
function tacticalStrike(x, y, color) {
  const stage = document.querySelector('#mapStage');
  if (!stage) return;

  const strike = document.createElement('div');
  strike.className = 'tactical-strike';
  strike.style.cssText = `left:${x}px;top:${y}px;--strike-color:${color};`;
  strike.innerHTML = `
    <span class="strike-ring"></span>
    <span class="strike-ring strike-ring-2"></span>
    <span class="strike-axis strike-axis-x"></span>
    <span class="strike-axis strike-axis-y"></span>
    <span class="strike-core"></span>
    <span class="strike-label">SIGNAL LOST</span>
  `;
  stage.appendChild(strike);
  setTimeout(() => strike.remove(), 900);
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
    const key = cleanKey(input.value);
    if (!key) { status.textContent = '请输入 API Key'; status.style.color = '#ff3f52'; return; }

    status.textContent = '正在连接 Linear...';
    status.style.color = '#ffd251';
    LinearAPI.key = key;

    try {
      await LinearAPI.sync();
      localStorage.setItem('gv_linear_key', key);
      status.textContent = '✓ 已连接，任务已同步';
      status.style.color = '#17d7b6';

      // 保存初始 issues 快照用于差异检测
      G._lastSyncedIssues = JSON.parse(JSON.stringify(Linear.issues));
      // 启动自动轮询（30秒间隔）
      LinearAPI.startPolling(30000);

      setTimeout(() => {
        syncLinearToGame();
        processAdvance();
        checkReinforcements();
        renderWarZones();
        renderUnits();
        renderBriefing();
        renderDetail(null);
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
      const configUrl = (window.location.origin || '') + '/api/config';
      const res = await fetch(configUrl);
      const cfg = await res.json();
      if (cfg.apiKey && cfg.apiKey.startsWith('lin_api_')) {
        const clean = cleanKey(cfg.apiKey);
        input.value = clean;
        LinearAPI.key = clean;
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
    renderWarHistory();
    initMap();
    applyMap();

    showLoading('启动 WIP 计时器...', 85);
    startWipTimer();
    updateWipUI();

    showLoading('启动飞船动画引擎...', 92);
    AnimationEngine.start();

    showLoading('部署完成', 100);
    setTimeout(() => hideLoading(), 600);
  } catch (err) {
    console.error('[GV] BOOT FAILED:', err);
    showLoading('系统启动失败: ' + err.message, 0);
    const panel = document.querySelector('#unitDetail');
    if (panel) panel.innerHTML = `<p style="color:#ff3f52">系统启动失败: ${err.message}<br>请打开浏览器控制台(F12)查看详情。</p>`;
  }
}

window.__game = { complete: completeMission, start: startMission, selectUnit, selectByMission, deploy: deployShip, G, Linear, LinearAPI, StarshipSync, AnimationEngine, WarHistoryStore, renderWarHistory };
window.addEventListener('resize', drawStarfield);
boot();
