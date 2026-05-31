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
  flagship:   { label: '旗舰', size: 78, threat: 150, powerBase: 90 },
  battleship: { label: '战列舰', size: 66, threat: 125, powerBase: 80 },
  carrier:    { label: '母舰', size: 58, threat: 112, powerBase: 70 },
  cruiser:    { label: '巡洋舰', size: 50, threat: 94, powerBase: 65 },
  destroyer:  { label: '驱逐舰', size: 40, threat: 72, powerBase: 50 },
  raider:     { label: '袭扰艇', size: 32, threat: 54, powerBase: 35 },
};

const NATO_NAMES = {
  vanguard: ['Alpha','Beta','Gamma','Delta','Epsilon','Zeta','Eta','Theta','Iota','Kappa','Lambda','Mu','Nu','Xi','Omicron','Pi','Rho','Sigma','Tau','Upsilon','Phi','Chi','Psi','Omega','Orion','Draco','Cassiopeia','Andromeda','Perseus','Cygnus','Lyra','Aquila','Hercules','Pegasus','Phoenix','Leo','Scorpio','Virgo','Gemini','Aries','Taurus','Libra','Capricorn','Sagittarius','Cancer','Antares','Altair','Deneb','Vega','Spica','Arcturus','Betelgeuse','Rigel','Sirius','Canopus','Procyon','Achernar','Hadar','Fomalhaut','Pollux','Regulus','Castor','Aldebaran','Dubhe','Merak','Alioth','Mizar','Alkaid','Megrez','Phecda'],
  egov: ['Beryl','Jade','Opal','Quartz','Amber','Coral','Garnet','Topaz','Sapphire','Emerald','Ruby','Amethyst','Pearl','Onyx','Obsidian','Malachite','Lapis','Turquoise','Agate','Jasper','Flint','Granite','Marble','Slate','Basalt','Pumice','Gypsum','Feldspar','Mica','Talc','Ivory','Jet','Zircon','Citrine','Tourmaline','Peridot','Alexandrite','Moonstone','Sunstone','Bloodstone','Carnelian','Chalcedony','Chrysoprase','Hematite','Magnetite','Pyrite','Galena','Bauxite','Magnetite','Graphite','Diamond'],
  jupiter: ['Pulsar','Nova','Quasar','Nebula','Supernova','Comet','Asteroid','Meteor','Eclipse','Solstice','Equinox','Zenith','Nadir','Apex','Aurora','Corona','Prominence','Flare','Burst','Cluster','Void','Singularity','Horizon','Abyss','Cosmos','Galaxy','Orbit','Axis','Pole',' Meridian','Equator','Tropic','Zenith','Apogee','Perigee','Aphelion','Perihelion','Node','Libration','Precession','Parallax','Refraction','Aberration','Doppler','Redshift','Blueshift','Parallax','Nutation','Obliquity','Eccentricity'],
  remnant: ['Gale','Tempest','Squall','Monsoon','Typhoon','Cyclone','Hurricane','Blizzard','Avalanche','Tsunami','Torrent','Deluge','Drought','Frost','Thaw','Mist','Fog','Haze','Smog','Dust','Ash','Ember','Spark','Flame','Blaze','Inferno','Scorch','Sear','Char','Cinder','Surge','Ripple','Tide','Current','Eddy','Vortex','Whirlwind','Dustdevil','Firestorm','Heatwave','Coldfront','Warmfront','Drizzle','Sleet','Hail','Icestorm','Snowdrift','Drift','Shift','Quake','Aftershock'],
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

  async sync() {
    const raw = await this.fetchIssues();
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
// WIP 工时系统（Work In Progress Points）
// ============================================
const DEPLOY_COSTS = {
  raider: 15,
  destroyer: 30,
  cruiser: 60,
  battleship: 100,
  flagship: 200,
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
  const name = customName?.trim() || genShipName('vanguard', used);
  if (used.has(name)) { alert('该舰名已存在'); return; }

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

  updateWipUI();
  renderUnits();
  renderDetail(ship.id);
}

function updateWipUI() {
  const d = WIPStore.get();
  const el = document.querySelector('#wipDisplay');
  if (el) {
    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:18px;font-weight:700;color:#ffd251;">${d.total}</span>
        <span style="font-size:11px;color:var(--muted);">WIP 工时</span>
      </div>
      <div style="font-size:11px;color:var(--muted);margin-top:2px;">
        今日在线 +${d.todayOnline}/60 | Streak: ${d.killStreak}
      </div>
    `;
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
        style="left:${u.x}%;top:${u.y}%;--unit-color:${f.color};--unit-glow:${f.glow};--status-color:${adv ? '#ff3f52' : '#4da3ff'};--ship-size:${SHIP_CLASSES[u.shipClass]?.size || 34}px;color:${f.color}">
        ${shipIcon(u.shipClass)}
        <span class="engine-flame" style="background:linear-gradient(180deg, ${f.color}, transparent);"></span>
        <span class="unit-code">${u.id}</span>
        <span class="unit-label">${u.name}</span>
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
  panel.classList.toggle('has-selection', Boolean(id));
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
      <p style="margin:8px 0 0;font-size:11px;color:var(--muted);">💡 纯展示型 — 请在 Linear 中手动更新任务状态，刷新后自动同步</p>
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
    try { stage.releasePointerCapture(e.pointerId); } catch {}
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
    scheduleMap();
  });
  stage.addEventListener('pointerup', stopDrag);
  stage.addEventListener('pointercancel', stopDrag);
  stage.addEventListener('lostpointercapture', () => {
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

    showLoading('启动 WIP 计时器...', 85);
    startWipTimer();
    updateWipUI();

    showLoading('部署完成', 100);
    setTimeout(() => hideLoading(), 600);
  } catch (err) {
    console.error('[GV] BOOT FAILED:', err);
    showLoading('系统启动失败: ' + err.message, 0);
    const panel = document.querySelector('#unitDetail');
    if (panel) panel.innerHTML = `<p style="color:#ff3f52">系统启动失败: ${err.message}<br>请打开浏览器控制台(F12)查看详情。</p>`;
  }
}

window.__game = { complete: completeMission, start: startMission, selectUnit, selectByMission, deploy: deployShip, G, Linear, LinearAPI };
window.addEventListener('resize', drawStarfield);
boot();
