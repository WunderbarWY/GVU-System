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
  flagship:   { label: '旗舰', size: 108, threat: 150, powerBase: 90 },
  dreadnought:{ label: '无畏舰', size: 108, threat: 150, powerBase: 90 },
  battleship: { label: '战列舰', size: 90, threat: 125, powerBase: 80 },
  carrier:    { label: '母舰', size: 76, threat: 112, powerBase: 70 },
  cruiser:    { label: '巡洋舰', size: 72, threat: 94, powerBase: 65 },
  destroyer:  { label: '驱逐舰', size: 58, threat: 72, powerBase: 50 },
  frigate:    { label: '护卫舰', size: 52, threat: 64, powerBase: 44 },
  raider:     { label: '袭扰艇', size: 46, threat: 54, powerBase: 35 },
};

const MAP_SHIP_SIZES = {
  raider: 28,
  frigate: 34,
  destroyer: 42,
  cruiser: 50,
  battleship: 60,
  dreadnought: 72,
};

const MAP_MOTION_SPEED_SCALE = 1 / 16;

function normalizeShipClass(cls) {
  return {
    flagship: 'dreadnought',
    carrier: 'cruiser',
  }[cls] || cls;
}

function shipMapSize(cls) {
  return MAP_SHIP_SIZES[normalizeShipClass(cls)] || MAP_SHIP_SIZES.destroyer;
}

// 漂移参数按舰船量级分级 — 小船灵活漂移，大船庄重缓慢
const DRIFT_PROFILES = {
  raider:     { ampBase: 1.05, ampVar: 0.34, freqBase: 0.72, freqVar: 0.18 },  // 袭扰艇 — 轻快飘忽
  frigate:    { ampBase: 0.82, ampVar: 0.28, freqBase: 0.58, freqVar: 0.14 },  // 护卫舰
  destroyer:  { ampBase: 0.62, ampVar: 0.22, freqBase: 0.46, freqVar: 0.12 },  // 驱逐舰
  cruiser:    { ampBase: 0.48, ampVar: 0.16, freqBase: 0.34, freqVar: 0.1 },  // 巡洋舰
  battleship: { ampBase: 0.36, ampVar: 0.12, freqBase: 0.24, freqVar: 0.08 },  // 战列舰
  dreadnought:{ ampBase: 0.24, ampVar: 0.08, freqBase: 0.16, freqVar: 0.05 },  // 旗舰/无畏舰 — 稳重
};

const NATO_NAMES = {
  vanguard: ['阿尔法','贝塔','伽马','德尔塔','艾普西隆','泽塔','伊塔','西塔','约塔','卡帕','拉姆达','缪','纽','克西','奥米克戎','派','柔','西格玛','陶','宇普西隆','斐','希','普西','欧米伽','猎户','天龙','仙后','仙女','英仙','天鹅','天琴','天鹰','武仙','飞马','凤凰','狮子','天蝎','室女','双子','白羊','金牛','天秤','摩羯','射手','巨蟹','心宿二','牛郎','天津四','织女','角宿一','大角','参宿四','参宿七','天狼','老人','南河三','水委一','马腹一','北落师门','北河三','轩辕十四','北河二','毕宿五','天枢','天璇','玉衡','开阳','摇光','天权','天玑'],
  egov: ['翡翠','琥珀','珊瑚','石榴石','黄玉','蓝宝石','祖母绿','红宝石','紫水晶','珍珠','缟玛瑙','黑曜石','孔雀石','青金石','绿松石','玛瑙','碧玉','燧石','花岗岩','大理石','板岩','玄武岩','浮石','石膏','长石','云母','滑石','象牙','煤玉','锆石','黄水晶','电气石','橄榄石','变石','月光石','日光石','血石','红玉髓','玉髓','绿玉髓','赤铁矿','磁铁矿','黄铁矿','方铅矿','铝土矿','石墨','钻石','蛋白石','石英'],
  jupiter: ['脉冲星','新星','类星体','星云','超新星','彗星','小行星','流星','日食','至日','分日','天顶','天底','顶点','极光','日冕','日珥','耀斑','爆发','星团','虚空','奇点','地平线','深渊','宇宙','星系','轨道','轴','极','子午线','赤道','回归线','远地点','近地点','远日点','近日点','交点','天平动','岁差','视差','折射','光行差','多普勒','红移','蓝移','章动','倾角','离心率'],
  remnant: ['疾风','暴风雨','飑','季风','台风','气旋','飓风','暴风雪','雪崩','海啸','洪流','大洪水','干旱','霜冻','解冻','薄雾','浓雾','霾','烟雾','尘','灰烬','余烬','火花','火焰','烈焰','炼狱','焦土','灼烧','炭','煤渣',' surge','涟漪','潮汐','洋流','漩涡','涡旋','旋风','尘卷','火风暴','热浪','冷锋','暖锋','毛毛雨','冰雨','冰雹','冰暴','雪堆','漂移','变换','地震','余震'],
};

// 中立单位配置
const NEUTRAL_CONFIG = {
  cargo: {
    label: '货运舰',
    color: '#8aa8c4',
    size: 34,
    names: ['纽约','伦敦','东京','巴黎','上海','北京','新加坡','迪拜','悉尼','莫斯科','洛杉矶','芝加哥','柏林','罗马','马德里','孟买','开罗','里约','多伦多','首尔','曼谷','雅加达','墨西哥','旧金山','温哥华','孟菲斯','鹿特丹','汉堡','维也纳','米兰','巴塞罗那','伊斯坦布尔','德黑兰','内罗毕','约翰内斯堡','拉各斯','卡萨布兰卡','利马','波哥大','圣地亚哥','布宜诺斯','蒙得维','奥克兰','惠灵顿','马尼拉','吉隆坡','河内','加尔各答','卡拉奇','利雅得','科威特','多哈','安曼','贝鲁特','大马士革','巴格达','喀布尔','伊斯兰堡','达卡','科伦坡','加德满都','廷布','万象','金边','仰光','达累斯','坎帕拉','亚的斯','哈拉雷','卢萨卡','马普托','达喀尔','阿克拉','阿比让','杜阿拉','金沙萨','罗安达','哈瓦那','太子港','圣胡安','马那瓜','圣何塞','巴拿马','基多','拉巴斯','亚松森','乔治敦','帕拉马里','卡宴'],
  },
  passenger: {
    label: '客运舰',
    color: '#c4a86b',
    size: 32,
    names: ['国泰','南方','汉莎','全日','东航','国航','长荣','华航','新航','泰航','越航','印航','法航','英航','美联','达美','加航','澳航','南非','阿联','卡航','土航','日航','大韩','韩亚','厦航','川航','海航','深航','山航','吉祥','春秋','九元','祥鹏','中联','天航','藏航','北航','上航','澳门','港龙','捷星','虎航','酷航','欣丰','亚航','宿务','飞萤','马航','文莱','缅航','老航','柬航','菲航','巴航','斯航','马代','塞舌','毛里求','埃塞','肯航','坦桑','纳航','博航','津航','赞航','莫航','安航','喀航','加航','多航','贝航','布航','卢航','乌航','卢旺达','南苏丹','中非','乍得','尼日尔','马里','布基纳','几内亚','塞拉利','利比里','科特迪','加纳','多哥','贝宁','喀麦隆','赤道几','圣普','加蓬','刚果布','刚果金','安哥拉','纳米比','博茨瓦','南非','莱索托','斯威士','马达加','科摩罗','毛里塔','西撒哈','摩洛哥','阿尔及','突尼斯','利比亚','埃及','苏丹','厄立特','吉布提','索马里','也门','阿曼','巴林','约旦','黎巴嫩','叙利亚','伊拉克','伊朗','阿富汗','巴基斯坦','印度','尼泊尔','不丹','孟加拉','斯里兰卡','马尔代夫','缅甸','泰国','老挝','柬埔寨','越南','马来西亚','文莱','印尼','东帝汶','菲律宾','日本','韩国','朝鲜','蒙古','中国','台湾','香港','澳门','俄罗斯','白俄罗斯','乌克兰','摩尔多瓦','波兰','捷克','斯洛伐克','匈牙利','罗马尼亚','保加利亚','塞尔维亚','克罗地亚','斯洛文','波斯尼','黑山','北马其','阿尔巴','希腊','塞浦路斯','土耳其','格鲁吉','亚美尼','阿塞拜','立陶宛','拉脱维','爱沙尼','芬兰','瑞典','挪威','丹麦','冰岛','爱尔兰','英国','葡萄牙','西班牙','法国','比利时','荷兰','卢森堡','德国','瑞士','奥地利','意大利','梵蒂冈','圣马力','摩纳哥','安道尔','马耳他','列支敦','美国','加拿大','墨西哥','危地马拉','伯利兹','洪都拉','萨尔瓦','尼加拉','哥斯达','巴拿马','古巴','牙买加','海地','多米尼','波多黎','巴哈马','特克斯','开曼','百慕大','格林纳','巴巴多','圣卢西','圣文森','多米尼克','安提瓜','圣基茨','瓜德罗','马提尼','阿鲁巴','库拉索','博奈尔','萨巴','圣尤斯','荷属圣','蒙特塞','安圭拉','英属维','美属维','波多黎','哥伦比亚','委内瑞拉','圭亚那','苏里南','法属圭','厄瓜多尔','秘鲁','玻利维','巴西','智利','阿根廷','乌拉圭','巴拉圭','福克兰','南乔治','南极','新西兰','澳大利亚','巴布亚','所罗门','瓦努阿','新喀里','斐济','汤加','萨摩亚','基里巴','瑙鲁','图瓦卢','马绍尔','密克罗','帕劳','关岛','北马里','美属萨','纽埃','库克','法属波','皮特凯','托克劳','瓦利斯','斐济','萨摩亚','汤加'],
  },
  supply: {
    label: '补给舰',
    color: '#6bc49a',
    size: 30,
    names: ['棕榈','橡树','雪松','竹子','荷花','樱花','梅花','松树','柏树','榕树','银杏','枫树','柳树','桃树','梨树','杏树','茶树','桂树','玉兰','海棠','杜鹃','牡丹','芍药','茉莉','玫瑰','月季','蔷薇','丁香','紫藤','凌霄','爬山虎','常春藤','吊兰','芦荟','仙人掌','仙人球','多肉','绿萝','发财树','幸福树','平安树','金钱树','摇钱树','鸿运当','一帆风顺','富贵竹','君子兰','蝴蝶兰','石斛兰','文心兰','万代兰','卡特兰','兜兰','贝母兰','石豆兰','独蒜兰','手参','红门兰','鸟巢蕨','铁线蕨','肾蕨','波士顿','鹿角蕨','槲蕨','石韦','瓦韦','水龙骨','贯众','鳞毛蕨','海金沙','芒萁','里白','桫椤','黑桫椤','笔筒树','苏铁','银杏','水杉','银杉','秃杉','红豆杉','白豆杉','台湾杉','福建柏','刺柏','侧柏','圆柏','龙柏','铺地柏','翠柏','福建柏','鸡毛松','竹柏','罗汉松','陆均松','三尖杉','粗榧','榧树','红豆树','花榈木','降香黄','紫檀','酸枝','鸡翅木','乌木','铁力木','柚木','樟树','楠木','檫木','黄樟','肉桂','阴香','月桂','山苍子','木姜子','山胡椒','香叶树','乌药','厚朴','含笑','白兰','黄兰','观光木','鹅掌楸','马褂木','北美鹅','乐昌含','金叶含','醉香含','火力楠','木莲','红花木','乳源木','石碌含笑','乐东拟','观光木','厚皮香','红淡比','杨桐','柃木','山茶','油茶','茶梅','杜鹃','马银花','映山红','满山红','羊踯躅','云锦杜','大树杜','美容杜','鹿角杜','百合杜','大白杜','马醉木','南烛','乌饭树','越桔','蓝莓','小叶越','笃斯越','红豆杉','榧树','三尖杉','罗汉松','竹柏','鸡毛松','陆均松','买麻藤','百岁兰','千岁兰','银杏','苏铁',' Cycad','Ginkgo','Wollemia','Araucaria','Agathis','Podocarp'],
  },
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
  neutrals: [],
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
      due: issue.dueDate || null,
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
  _version: 1,
  load() {
    try { return JSON.parse(localStorage.getItem(this._key)) || {}; } catch { return {}; }
  },
  save(data) { localStorage.setItem(this._key, JSON.stringify({ ...data, _version: this._version })); },

  get() {
    const data = this.load();
    const today = new Date().toISOString().split('T')[0];
    // 每日重置（在线时长和首杀bonus，但保留total和deployed）
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

  addPomodoro(minutes) {
    const d = this.get();
    d.total += minutes;
    this.save(d);
    return minutes;
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

  // 记录番茄钟完成
  recordPomodoro(wipEarned, sessionNum) {
    const data = this.get();
    const now = new Date();
    data.records.unshift({
      id: 'wh-p-' + now.getTime(),
      type: 'pomodoro',
      time: now.toISOString(),
      wipEarned: wipEarned || 0,
      sessionNum: sessionNum || 1,
      desc: `完成第 ${sessionNum} 个番茄钟，专注 ${s.duration / 60} 分钟`,
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

// ============================================
// 番茄钟系统 v2.9 — 真正的倒计时番茄钟
// ============================================
const PomodoroTimer = {
  _key: 'gv_pomodoro',
  _settingsKey: 'gv_pomodoro_settings',
  DEFAULT_DURATION: 25 * 60,
  _rafId: null,
  _lastTick: 0,

  getDuration() {
    try {
      const s = JSON.parse(localStorage.getItem(this._settingsKey));
      if (s?.duration) return s.duration * 60;
    } catch {}
    return this.DEFAULT_DURATION;
  },

  setDuration(minutes) {
    localStorage.setItem(this._settingsKey, JSON.stringify({ duration: minutes }));
    const s = this.getState();
    s.duration = minutes * 60;
    if (s.state === 'idle') s.remaining = s.duration;
    this.save(s);
    updatePomodoroUI();
  },

  load() {
    try { const raw = localStorage.getItem(this._key); if (raw) return JSON.parse(raw); } catch {}
    return null;
  },
  save(data) { localStorage.setItem(this._key, JSON.stringify(data)); },

  getState() {
    const today = new Date().toISOString().split('T')[0];
    let s = this.load();
    if (!s || s._version !== 1) {
      const dur = this.getDuration();
      s = { _version: 1, state: 'idle', duration: dur, remaining: dur, startedAt: null, sessionsToday: 0, totalSessions: 0, lastDate: today };
    }
    if (s.lastDate !== today) {
      s.lastDate = today;
      s.sessionsToday = 0;
      if (s.state === 'running') { s.state = 'idle'; s.remaining = s.duration; s.startedAt = null; }
    }
    return s;
  },

  start() {
    const s = this.getState();
    if (s.state === 'running') return;
    s.state = 'running';
    s.startedAt = Date.now() - (s.duration - s.remaining) * 1000;
    this.save(s);
    this._startTick();
    updatePomodoroUI();
  },

  pause() {
    const s = this.getState();
    if (s.state !== 'running') return;
    s.state = 'paused';
    this.save(s);
    this._stopTick();
    updatePomodoroUI();
  },

  toggle() {
    const s = this.getState();
    if (s.state === 'running') this.pause();
    else if (s.state === 'completed') { s.remaining = s.duration; s.state = 'idle'; this.save(s); this.start(); }
    else this.start();
  },

  reset() {
    this._stopTick();
    const s = this.getState();
    s.state = 'idle'; s.remaining = s.duration; s.startedAt = null;
    this.save(s);
    updatePomodoroUI();
  },

  complete() {
    this._stopTick();
    const s = this.getState();
    s.state = 'completed'; s.remaining = 0;
    s.sessionsToday = (s.sessionsToday || 0) + 1;
    s.totalSessions = (s.totalSessions || 0) + 1;
    this.save(s);
    const reward = Math.round((s.duration / 60) * 1); // 每分钟 = 1 WIP
    const gained = WIPStore.addPomodoro(reward);
    updateWipUI();
    WarHistoryStore.recordPomodoro(gained, s.sessionsToday);
    updatePomodoroUI();
    // 闪烁提示
    const el = document.querySelector('#hudTime');
    if (el) { el.classList.add('pomodoro-done'); setTimeout(() => el.classList.remove('pomodoro-done'), 3000); }
    setTimeout(() => { if (this.getState().state === 'completed') this.reset(); }, 5000);
  },

  _startTick() {
    this._stopTick();
    this._lastTick = performance.now();
    const tick = (now) => {
      if (!this._rafId) return;
      const dt = (now - this._lastTick) / 1000;
      this._lastTick = now;
      const s = this.getState();
      if (s.state !== 'running') return;
      s.remaining = Math.max(0, s.remaining - dt);
      this.save(s);
      updatePomodoroUI();
      if (s.remaining <= 0) { this.complete(); return; }
      this._rafId = requestAnimationFrame(tick);
    };
    this._rafId = requestAnimationFrame(tick);
  },

  _stopTick() {
    if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
  },

  resumeOnBoot() {
    const s = this.getState();
    if (s.state === 'running') {
      const elapsed = Math.floor((Date.now() - s.startedAt) / 1000);
      s.remaining = Math.max(0, s.remaining - elapsed);
      if (s.remaining <= 0) { this.complete(); }
      else { this.save(s); this._startTick(); updatePomodoroUI(); }
    } else { updatePomodoroUI(); }
    this.initInterruptDetection();
  },

  // v2.9: 打断检测 — 切出标签页/最小化时自动暂停
  _wasRunningBeforeHidden: false,
  initInterruptDetection() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        const s = this.getState();
        this._wasRunningBeforeHidden = (s.state === 'running');
        if (s.state === 'running') this.pause();
      } else {
        if (this._wasRunningBeforeHidden) {
          this._wasRunningBeforeHidden = false;
          const s = this.getState();
          if (s.state === 'paused') this.start();
        }
      }
    });
  },

  formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  },
};

// 在线计时器（后台被动统计，每分钟 +1 WIP，每日上限 60）
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
  }, 10000);
}

// ============================================
// 舰队部署系统
// ============================================
// ============================================
// 沉浸式舰船部署系统 v2.4
// ============================================
let _deployState = { classType: '', cost: 0, dx: -8, dy: -6 };

function openDeployModal(classType) {
  const cost = DEPLOY_COSTS[classType];
  if (!cost) return;
  if (!WIPStore.canDeploy(cost)) {
    const statusEl = document.querySelector('#connectStatus');
    if (statusEl) { statusEl.textContent = `WIP 不足，需要 ${cost} 点`; statusEl.style.color = '#ff3f52'; }
    return;
  }

  _deployState = { classType, cost, dx: -8, dy: -6 };

  // 更新弹窗内容
  document.getElementById('deployClassLabel').textContent = SHIP_CLASSES[classType].label;
  document.getElementById('deployCostBadge').textContent = cost;
  document.getElementById('deployShipIcon').innerHTML = shipIcon(classType);

  // 随机生成默认舰名
  const used = new Set(G.units.map(x => x.name));
  document.getElementById('deployName').value = genShipName('vanguard', used);
  document.getElementById('deployCommander').value = '';

  // 重置扇区选择
  document.querySelectorAll('#deploySectors .sector-btn').forEach((b, i) => {
    b.classList.toggle('active', i === 0);
  });
  _deployState.dx = -8; _deployState.dy = -6;

  // 显示弹窗
  const modal = document.getElementById('deployModal');
  modal.style.display = 'flex';
  requestAnimationFrame(() => modal.classList.add('is-open'));
}

function closeDeployModal() {
  const modal = document.getElementById('deployModal');
  if (!modal) return;
  modal.classList.remove('is-open');
  setTimeout(() => { modal.style.display = 'none'; }, 280);
}

function randomDeployName() {
  const used = new Set(G.units.map(x => x.name));
  document.getElementById('deployName').value = genShipName('vanguard', used);
}

function selectDeploySector(btn) {
  document.querySelectorAll('#deploySectors .sector-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  _deployState.dx = parseFloat(btn.dataset.dx);
  _deployState.dy = parseFloat(btn.dataset.dy);
}

function confirmDeploy() {
  const name = document.getElementById('deployName').value.trim();
  const commander = document.getElementById('deployCommander').value.trim();
  const squadron = document.getElementById('deploySquadron').value;

  if (!name) {
    const statusEl = document.querySelector('#connectStatus');
    if (statusEl) { statusEl.textContent = '请输入舰名'; statusEl.style.color = '#ff3f52'; }
    return;
  }

  const used = new Set(G.units.map(x => x.name));
  if (used.has(name)) {
    const statusEl = document.querySelector('#connectStatus');
    if (statusEl) { statusEl.textContent = '该舰名已存在'; statusEl.style.color = '#ff3f52'; }
    return;
  }

  closeDeployModal();

  // 构建飞船数据
  const ship = buildShipForDeploy(_deployState.classType, name, commander, squadron);

  // 播放部署动画
  playDeployAnimation(ship);
}

function buildShipForDeploy(classType, name, commander, squadron) {
  WIPStore.spend(_deployState.cost);

  return {
    id: genCode('vanguard', WIPStore.getDeployed().length + 1000),
    name,
    shipClass: classType,
    faction: 'vanguard',
    x: clamp(CONFIG.EARTH.x + _deployState.dx + rand(6) - 3, 10, 90),
    y: clamp(CONFIG.EARTH.y + _deployState.dy + rand(6) - 3, 10, 90),
    status: 'patrol',
    power: SHIP_CLASSES[classType].powerBase + rand(20) - 5,
    supply: rand(30) + 60,
    morale: rand(20) + 70,
    commander: commander || '未指定',
    squadron: squadron || '第一特遣队',
    mission: { title: '巡逻中', status: 'reserve' },
  };
}

function playDeployAnimation(ship) {
  const layer = document.querySelector('#unitLayer');
  const world = document.querySelector('#mapWorld');
  if (!layer || !world) return;

  const f = FACTIONS.vanguard;
  const startX = CONFIG.EARTH.x;
  const startY = CONFIG.EARTH.y;

  // 1. 跃迁轨迹（光束）
  const trail = document.createElement('div');
  trail.className = 'deploy-beam';
  const angle = Math.atan2(ship.y - startY, ship.x - startX) * 180 / Math.PI;
  const dist = Math.hypot(ship.x - startX, ship.y - startY);
  trail.style.cssText = `left:${startX}%;top:${startY}%;width:${dist * 1.2}%;transform:rotate(${angle}deg);`;
  world.appendChild(trail);

  // 2. 发射点闪光
  StarshipSync.createWarpFlash(startX, startY, f.color);

  // 3. 创建飞船 DOM（初始在地球，缩小隐藏）
  const el = document.createElement('button');
  el.className = `unit ship-${ship.shipClass} patrol is-deploying`;
  el.dataset.id = ship.id;
  el.type = 'button';
  el.style.cssText = `left:${startX}%;top:${startY}%;--unit-color:${f.color};--unit-glow:${f.glow};--status-color:#4da3ff;--ship-size:${shipMapSize(ship.shipClass)}px;color:${f.color};opacity:0;transform:translate(-50%,-50%) scale(0.2);`;
  el.innerHTML = `
    ${shipIcon(ship.shipClass)}
    <span class="engine-flame deploy-boost" style="background:linear-gradient(180deg, ${f.color}, transparent);"></span>
    <span class="unit-code">${ship.id}</span>
    <span class="unit-label">${ship.name}</span>
  `;
  layer.appendChild(el);

  // 下一帧触发动画
  requestAnimationFrame(() => {
    el.style.transition = 'left 1.6s cubic-bezier(.25,.8,.25,1), top 1.6s cubic-bezier(.25,.8,.25,1), opacity 0.7s ease 0.1s, transform 0.7s cubic-bezier(.2,.8,.2,1) 0.1s';
    el.style.left = ship.x + '%';
    el.style.top = ship.y + '%';
    el.style.opacity = '1';
    el.style.transform = 'translate(-50%, -50%) scale(1)';
  });

  // 到达后完成部署
  setTimeout(() => {
    // 到达闪光
    StarshipSync.createWarpFlash(ship.x, ship.y, f.color);

    // 清理动画类
    el.classList.remove('is-deploying');
    el.style.transition = '';

    // 引擎恢复正常
    const flame = el.querySelector('.engine-flame');
    if (flame) flame.classList.remove('deploy-boost');

    // 轨迹淡出
    trail.style.opacity = '0';
    trail.style.transition = 'opacity 0.6s ease';
    setTimeout(() => trail.remove(), 600);

    // 加入游戏状态
    finalizeDeploy(ship, el);
  }, 1700);
}

function finalizeDeploy(ship, el) {
  G.units.push(ship);
  WIPStore.addDeployed(ship);
  WarHistoryStore.recordDeploy(ship);
  renderWarHistory();
  updateWipUI();
  renderDetail(ship.id);

  // 更新 AnimationEngine 缓存
  AnimationEngine.elCache.set(ship.id, { unit: el, pulse: null, trail: null });

  // 通知
  const statusEl = document.querySelector('#connectStatus');
  if (statusEl) {
    statusEl.textContent = `${ship.name} 已部署至 ${ship.squadron}`;
    statusEl.style.color = '#17d7b6';
    setTimeout(() => { statusEl.textContent = ''; }, 4000);
  }
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
        在线 ${formatTime(d.todayOnline)} | Streak: ${d.killStreak}
      </div>
    `;
  }

  // 地图科幻 HUD — WIP 和 Streak（番茄钟由 updatePomodoroUI 独立管理）
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

// v2.9: 番茄钟 HUD 更新
function updatePomodoroUI() {
  const s = PomodoroTimer.getState();
  const hudTime = document.querySelector('#hudTime');
  if (hudTime) {
    if (s.state === 'completed') {
      hudTime.textContent = 'DONE!';
      hudTime.style.color = '#17d7b6';
    } else {
      hudTime.textContent = PomodoroTimer.formatTime(s.remaining);
      hudTime.style.color = s.state === 'running' ? '#ffd251' : '#4da3ff';
    }
  }

  // 进度条
  const bar = document.querySelector('#hudPomodoroBar');
  if (bar) {
    const pct = s.state === 'completed' ? 100 : ((s.duration - s.remaining) / s.duration) * 100;
    bar.style.width = `${pct}%`;
    bar.style.background = s.state === 'running' ? '#ffd251' : s.state === 'completed' ? '#17d7b6' : 'rgba(77,163,255,0.35)';
  }

  // 标签文字
  const label = document.querySelector('#hudPomodoroLabel');
  if (label) {
    const map = { idle: '发动巡航', running: '巡航中 — 点击暂停', paused: '已暂停 — 点击继续', completed: '完成！+25 WIP' };
    label.textContent = map[s.state] || '';
  }

  // 在线时长小字（HUD 双显示）
  const onlineEl = document.querySelector('#hudOnlineMini');
  if (onlineEl) {
    const d = WIPStore.get();
    onlineEl.textContent = `在线 ${PomodoroTimer.formatTime(d.todayOnline * 60)} / 60min`;
  }
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
  if (!dateStr) return null; // 无截止日期
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

function spawnZone(faction, priority, status) {
  const base = {
    egov: { x: [58, 90], y: [12, 42] },
    jupiter: { x: [55, 92], y: [54, 88] },
    remnant: { x: [6, 40], y: [66, 96] },
  }[faction] || { x: [50, 80], y: [50, 80] };

  if (!priority) return base;

  // v2.8: 优先级→地图位置映射 — urgent+进行中靠近地球，low+backlog远离势力外围
  const priorityOffset = { urgent: 0.7, high: 0.5, medium: 0.2, low: -0.3 };
  const statusOffset   = { in_progress: 0.2, todo: 0, backlog: -0.2 };
  const factor = (priorityOffset[priority] || 0) + (statusOffset[status] || 0);

  const cx = (base.x[0] + base.x[1]) / 2;
  const cy = (base.y[0] + base.y[1]) / 2;
  const dx = CONFIG.EARTH.x - cx;
  const dy = CONFIG.EARTH.y - cy;
  const d = Math.sqrt(dx * dx + dy * dy) || 1;
  const shift = factor * 14; // 最大偏移约14%

  const ox = (dx / d) * shift;
  const oy = (dy / d) * shift;

  return {
    x: [base.x[0] + ox, base.x[1] + ox],
    y: [base.y[0] + oy, base.y[1] + oy],
  };
}

function routeMotion(points, speed, progress = 0, offsetX = 0, offsetY = 0) {
  return { type: 'route', points, speed, progress, offsetX, offsetY };
}

function orbitMotion(cx, cy, rx, ry, speed, angle = 0) {
  return { type: 'orbit', cx, cy, rx, ry, speed, angle };
}

function sampleRoute(points, progress) {
  if (!points?.length) return { x: 50, y: 50 };
  if (points.length === 1) return points[0];

  const segments = [];
  let total = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    segments.push({ a, b, len });
    total += len;
  }

  let dist = ((progress % 1) + 1) % 1 * total;
  for (const s of segments) {
    if (dist <= s.len) {
      const t = s.len ? dist / s.len : 0;
      return {
        x: s.a.x + (s.b.x - s.a.x) * t,
        y: s.a.y + (s.b.y - s.a.y) * t,
      };
    }
    dist -= s.len;
  }
  return points[0];
}

function addDemoTraffic() {
  if (G.units.some(u => u.isDemoTraffic)) return;

  const specs = [
    // 银河先遣队：地球外圈巡逻 + 楔形护航
    { id: 'SIM-V-01', name: '近地巡逻-α', faction: 'vanguard', shipClass: 'frigate', x: 29, y: 45, motion: orbitMotion(CONFIG.EARTH.x, CONFIG.EARTH.y, 8.5, 5.4, 0.07, 0.2) },
    { id: 'SIM-V-02', name: '近地巡逻-β', faction: 'vanguard', shipClass: 'frigate', x: 18, y: 49, motion: orbitMotion(CONFIG.EARTH.x, CONFIG.EARTH.y, 10.5, 6.6, -0.055, 2.4) },
    { id: 'SIM-V-03', name: '水星护航-楔首', faction: 'vanguard', shipClass: 'destroyer', x: 32, y: 48, motion: routeMotion([{ x: 24, y: 48 }, { x: 36, y: 50 }, { x: 29, y: 42 }], 0.007, 0.1, 0, 0) },
    { id: 'SIM-V-04', name: '水星护航-左翼', faction: 'vanguard', shipClass: 'raider', x: 30, y: 49, motion: routeMotion([{ x: 24, y: 48 }, { x: 36, y: 50 }, { x: 29, y: 42 }], 0.007, 0.1, -2.0, 1.5) },
    { id: 'SIM-V-05', name: '水星护航-右翼', faction: 'vanguard', shipClass: 'raider', x: 34, y: 49, motion: routeMotion([{ x: 24, y: 48 }, { x: 36, y: 50 }, { x: 29, y: 42 }], 0.007, 0.1, 2.0, 1.5) },

    // 地球联合政府：金星-月球方向串列巡航
    { id: 'SIM-E-01', name: '金星封锁-01', faction: 'egov', shipClass: 'cruiser', x: 76, y: 24, motion: routeMotion([{ x: 76, y: 22 }, { x: 64, y: 28 }, { x: 52, y: 38 }, { x: 67, y: 30 }], 0.0055, 0.0) },
    { id: 'SIM-E-02', name: '金星封锁-02', faction: 'egov', shipClass: 'destroyer', x: 72, y: 26, motion: routeMotion([{ x: 76, y: 22 }, { x: 64, y: 28 }, { x: 52, y: 38 }, { x: 67, y: 30 }], 0.0055, 0.08) },
    { id: 'SIM-E-03', name: '金星封锁-03', faction: 'egov', shipClass: 'frigate', x: 68, y: 29, motion: routeMotion([{ x: 76, y: 22 }, { x: 64, y: 28 }, { x: 52, y: 38 }, { x: 67, y: 30 }], 0.0055, 0.16) },

    // 木星兵团：木星船坞环绕和土星航线
    { id: 'SIM-J-01', name: '木星环卫-主力', faction: 'jupiter', shipClass: 'battleship', x: 85, y: 63, motion: orbitMotion(85, 63, 9.0, 5.2, 0.045, 1.1) },
    { id: 'SIM-J-02', name: '木星环卫-外哨', faction: 'jupiter', shipClass: 'destroyer', x: 78, y: 65, motion: orbitMotion(85, 63, 12.5, 7.0, -0.035, 3.4) },
    { id: 'SIM-J-03', name: '土星补给-01', faction: 'jupiter', shipClass: 'frigate', x: 67, y: 73, motion: routeMotion([{ x: 85, y: 63 }, { x: 72, y: 70 }, { x: 55, y: 82 }, { x: 70, y: 77 }], 0.0045, 0.18) },
    { id: 'SIM-J-04', name: '土星补给-02', faction: 'jupiter', shipClass: 'raider', x: 64, y: 75, motion: routeMotion([{ x: 85, y: 63 }, { x: 72, y: 70 }, { x: 55, y: 82 }, { x: 70, y: 77 }], 0.0045, 0.26) },

    // 星际遗民：外缘游击队串行穿插
    { id: 'SIM-R-01', name: '暗港游击-01', faction: 'remnant', shipClass: 'raider', x: 13, y: 88, motion: routeMotion([{ x: 13, y: 88 }, { x: 24, y: 78 }, { x: 36, y: 84 }, { x: 22, y: 94 }], 0.008, 0.0) },
    { id: 'SIM-R-02', name: '暗港游击-02', faction: 'remnant', shipClass: 'raider', x: 18, y: 86, motion: routeMotion([{ x: 13, y: 88 }, { x: 24, y: 78 }, { x: 36, y: 84 }, { x: 22, y: 94 }], 0.008, 0.12) },
    { id: 'SIM-R-03', name: '暗港游击-03', faction: 'remnant', shipClass: 'frigate', x: 24, y: 80, motion: routeMotion([{ x: 13, y: 88 }, { x: 24, y: 78 }, { x: 36, y: 84 }, { x: 22, y: 94 }], 0.008, 0.24) },
  ];

  specs.forEach((s) => {
    const cls = SHIP_CLASSES[s.shipClass] || SHIP_CLASSES.raider;
    G.units.push({
      ...s,
      status: s.faction === 'vanguard' ? 'patrol' : 'stationed',
      advanceDist: distToEarth(s.x, s.y),
      power: cls.powerBase + rand(18) - 6,
      supply: rand(35) + 60,
      morale: rand(30) + 60,
      isDemoTraffic: true,
      mission: {
        title: '演示巡逻航行',
        status: 'traffic-demo',
        priority: 'low',
        estimate: 0,
        labels: ['演示舰队'],
        description: '用于展示星图航行、编队巡逻和航道交通的假数据，不对应 Linear 任务。',
      },
    });
  });
}

function syncLinearToGame() {
  const used = new Set();
  const units = [];

  // 未完成任务 → 敌军
  Linear.issues.forEach((issue, i) => {
    const cls = priorityToClass(issue.priority);
    const zone = spawnZone(issue.faction, issue.priority, issue.status);
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
    const zone = spawnZone(issue.faction, issue.priority, issue.status);
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
    el.style.cssText = `left:${startX}%;top:${startY}%;--unit-color:${f.color};--unit-glow:${f.glow};--status-color:${adv ? '#ff3f52' : '#4da3ff'};--ship-size:${shipMapSize(unit.shipClass)}px;color:${f.color};transition:left 1.4s cubic-bezier(.2,.8,.2,1),top 1.4s cubic-bezier(.2,.8,.2,1),opacity 600ms ease,transform 600ms cubic-bezier(.2,.8,.2,1);`;
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
      el.style.setProperty('--ship-size', shipMapSize(unit.shipClass) + 'px');
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
// 性能监控与自动降级系统 v2.6
// ============================================
const PerformanceMonitor = {
  fps: 60,
  frameTimes: [],
  lastFrameTime: 0,
  quality: 'high',
  checkInterval: null,
  _rafId: null,

  start() {
    this.lastFrameTime = performance.now();
    document.body.dataset.quality = this.quality;
    this.checkInterval = setInterval(() => this.evaluate(), 4000);
    this._rafId = requestAnimationFrame(() => this.measureLoop());
  },

  stop() {
    if (this.checkInterval) clearInterval(this.checkInterval);
    if (this._rafId) cancelAnimationFrame(this._rafId);
  },

  measureLoop() {
    const now = performance.now();
    const delta = now - this.lastFrameTime;
    this.lastFrameTime = now;
    const fps = Math.min(60, Math.round(1000 / Math.max(delta, 1)));
    this.frameTimes.push(fps);
    if (this.frameTimes.length > 90) this.frameTimes.shift();
    this._rafId = requestAnimationFrame(() => this.measureLoop());
  },

  evaluate() {
    if (this.frameTimes.length < 20) return;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.fps = Math.round(avg);
    this.frameTimes = [];

    if (this.fps < 22 && this.quality !== 'low') {
      this.setQuality('low');
    } else if (this.fps < 38 && this.quality === 'high') {
      this.setQuality('medium');
    } else if (this.fps > 52 && this.quality === 'low') {
      this.setQuality('medium');
    } else if (this.fps > 58 && this.quality === 'medium') {
      this.setQuality('high');
    }
  },

  setQuality(level) {
    const old = this.quality;
    this.quality = level;
    document.body.dataset.quality = level;
    console.log(`[GV] Quality: ${old} → ${level} (FPS: ${this.fps})`);

    const scanlines = document.querySelectorAll('.scanline');
    const routes = document.querySelectorAll('.route');
    const engineFlames = document.querySelectorAll('.engine-flame');

    if (level === 'low') {
      scanlines.forEach(el => { el.style.animationPlayState = 'paused'; el.style.opacity = '0'; });
      routes.forEach(el => el.style.animationPlayState = 'paused');
      engineFlames.forEach(el => el.style.animationPlayState = 'paused');
    } else if (level === 'medium') {
      scanlines.forEach(el => { el.style.animationPlayState = 'running'; el.style.opacity = ''; });
      routes.forEach(el => el.style.animationPlayState = 'paused');
      engineFlames.forEach(el => el.style.animationPlayState = 'running');
    } else {
      scanlines.forEach(el => { el.style.animationPlayState = 'running'; el.style.opacity = ''; });
      routes.forEach(el => el.style.animationPlayState = 'running');
      engineFlames.forEach(el => el.style.animationPlayState = 'running');
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
  neutralCache: new Map(),  // neutralId -> element
  neutralAccum: 0,
  activeCoordinateLock: null,

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
    // 清理已不存在的单位（防止 driftMap/orbitMap 内存泄漏）
    const validIds = new Set(G.units.filter(u => u.status !== 'destroyed').map(u => u.id));
    const validNeutralIds = new Set(G.neutrals.map(n => n.id));
    for (const id of this.driftMap.keys()) { if (!validIds.has(id)) this.driftMap.delete(id); }
    for (const id of this.orbitMap.keys()) { if (!validIds.has(id)) this.orbitMap.delete(id); }
    for (const id of this.elCache.keys()) { if (!validIds.has(id)) this.elCache.delete(id); }
    for (const id of this.neutralCache.keys()) { if (!validNeutralIds.has(id)) this.neutralCache.delete(id); }

    // 预热 DOM 缓存，避免每帧 querySelector
    this.elCache.clear();
    this.neutralCache.clear();
    G.units.forEach(unit => {
      if (unit.status === 'destroyed') return;
      const u = document.querySelector(`.unit[data-id="${cssEscape(unit.id)}"]`);
      if (u) {
        const p = document.querySelector(`.threat-pulse[data-unit-id="${cssEscape(unit.id)}"]`);
        const t = document.querySelector(`.unit-trail[data-unit-id="${cssEscape(unit.id)}"]`);
        this.elCache.set(unit.id, { unit: u, pulse: p, trail: t });
      }
    });
    G.neutrals.forEach(n => {
      const el = document.querySelector(`.neutral-unit[data-id="${cssEscape(n.id)}"]`);
      if (el) this.neutralCache.set(n.id, el);
    });
  },

  tick(now) {
    if (!this.running) return;
    const dt = Math.min((now - this.lastTime) / 1000, 0.1); // cap at 100ms
    const motionDt = dt * MAP_MOTION_SPEED_SCALE;
    this.lastTime = now;

    G.units.forEach(unit => {
      if (unit.status === 'destroyed') return;
      if (unit.faction === 'vanguard') {
        this.updateVanguard(unit, motionDt);
      } else {
        this.updateEnemy(unit, motionDt);
      }
      this.updateDOM(unit);
    });

    // 中立单位是背景交通，降低刷新频率并复用缓存，避免舰船变多后卡顿。
    this.neutralAccum += dt;
    const quality = PerformanceMonitor.quality || document.body.dataset.quality || 'high';
    const neutralInterval = quality === 'low' ? 0.12 : quality === 'medium' ? 0.08 : 0.05;
    if (this.neutralAccum >= neutralInterval) {
      const ndt = Math.min(this.neutralAccum, 0.24) * MAP_MOTION_SPEED_SCALE;
      this.neutralAccum = 0;
      G.neutrals.forEach(n => {
        n.driftPhase += n.driftFreq * ndt;
        n.x = n.baseX + Math.sin(n.driftPhase) * n.driftAmpX;
        n.y = n.baseY + Math.cos(n.driftPhase * 0.73) * n.driftAmpY;
        const el = this.neutralCache.get(n.id);
        if (el && el.isConnected) {
          el.style.left = n.x + '%';
          el.style.top = n.y + '%';
        }
      });
    }

    this.frameId = requestAnimationFrame(t => this.tick(t));
  },

  // ---------- 友方飞船 ----------
  updateVanguard(unit, dt) {
    if (this.updateSpecialMotion(unit, dt)) return;

    const orbit = this.orbitMap.get(unit.id);
    if (orbit) {
      // 轨道运动
      orbit.angle += orbit.speed * dt;
      unit.x = orbit.cx + Math.cos(orbit.angle) * orbit.radius;
      unit.y = orbit.cy + Math.sin(orbit.angle) * orbit.radius;
    }
    // 友方漂移
    this.applyDrift(unit, dt, 1.0);
    unit.advanceDist = distToEarth(unit.x, unit.y);
  },

  // ---------- 敌方飞船 ----------
  updateEnemy(unit, dt) {
    if (this.updateSpecialMotion(unit, dt)) return;

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
    this.applyDrift(unit, dt, 1.5);
  },

  updateSpecialMotion(unit, dt) {
    const m = unit.motion;
    if (!m) return false;

    if (m.type === 'orbit') {
      m.angle += m.speed * dt;
      unit.x = clamp(m.cx + Math.cos(m.angle) * m.rx, 4, 96);
      unit.y = clamp(m.cy + Math.sin(m.angle) * m.ry, 4, 96);
    } else if (m.type === 'route') {
      m.progress = ((m.progress || 0) + m.speed * dt) % 1;
      const p = sampleRoute(m.points, m.progress);
      unit.x = clamp(p.x + (m.offsetX || 0), 4, 96);
      unit.y = clamp(p.y + (m.offsetY || 0), 4, 96);
    } else {
      return false;
    }

    this.applyDrift(unit, dt, unit.isDemoTraffic ? 0.8 : 1.2);
    unit.advanceDist = distToEarth(unit.x, unit.y);
    return true;
  },

  // ---------- 漂移系统（替代 CSS shipFloat） ----------
  // v2.6: 按舰船量级分级 — 袭扰艇轻快漂移，旗舰几乎静止
  applyDrift(unit, dt, scale = 1.0) {
    let d = this.driftMap.get(unit.id);
    if (!d) {
      const profile = DRIFT_PROFILES[normalizeShipClass(unit.shipClass)] || DRIFT_PROFILES.destroyer;
      d = {
        phase: Math.random() * Math.PI * 2,
        ampX: (profile.ampBase + Math.random() * profile.ampVar),
        ampY: (profile.ampBase * 0.82 + Math.random() * profile.ampVar * 0.82),
        freq: (profile.freqBase + Math.random() * profile.freqVar),
      };
      this.driftMap.set(unit.id, d);
    }
    // 选中时漂移减小
    const selectedScale = (G.selectedId === unit.id) ? 0.15 : 1.0;

    // v2.8: 按任务优先级和状态放大漂移 — urgent×2.5 high×2.0 medium×1.5 low×1.0，进行中额外×1.2
    const priorityScale = { urgent: 2.5, high: 2.0, medium: 1.5, low: 1.0 };
    const ps = (priorityScale[unit.mission?.priority] || 1.0);
    const ss = (unit.mission?.status === 'in_progress') ? 1.2 : 1.0;
    const missionScale = ps * ss;

    d.phase += d.freq * dt;
    unit._driftX = Math.sin(d.phase) * d.ampX * scale * selectedScale * missionScale;
    unit._driftY = Math.cos(d.phase * 0.73) * d.ampY * scale * selectedScale * missionScale;
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
    const lastX = unit._renderX ?? unit.x;
    const lastY = unit._renderY ?? unit.y;
    const vx = rx - lastX;
    const vy = ry - lastY;
    const moving = Math.hypot(vx, vy) > 0.002;

    if (moving) {
      const heading = Math.atan2(vy, vx) * 180 / Math.PI;
      const headingStr = `${heading + 90}deg`;
      if (unit._lastHeading !== headingStr) {
        cached.unit.style.setProperty('--ship-heading', headingStr);
        unit._lastHeading = headingStr;
      }
      const motionOp = unit.status === 'advancing' ? '0.78' : '0.46';
      if (unit._lastMotionOp !== motionOp) {
        cached.unit.style.setProperty('--motion-opacity', motionOp);
        unit._lastMotionOp = motionOp;
      }
      if (cached.trail) {
        const angleStr = `${heading}deg`;
        const trailAlpha = unit.status === 'advancing' ? '0.62' : '0.4';
        if (unit._lastTrailAngle !== angleStr) {
          cached.trail.style.setProperty('--angle', angleStr);
          unit._lastTrailAngle = angleStr;
        }
        if (unit._lastTrailAlpha !== trailAlpha) {
          cached.trail.style.setProperty('--trail-alpha', trailAlpha);
          unit._lastTrailAlpha = trailAlpha;
        }
      }
    }

    // 只有当位置确实变化时才写 DOM，避免每帧无条件触发布局重排
    const posChanged = Math.abs(rx - lastX) > 0.001 || Math.abs(ry - lastY) > 0.001;
    if (posChanged) {
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
      unit._renderX = rx;
      unit._renderY = ry;
    }

    const activeLock = this.activeCoordinateLock;
    if (activeLock?.unitId === unit.id && activeLock.el?.isConnected) {
      activeLock.el.style.left = rx + '%';
      activeLock.el.style.top = ry + '%';
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
      done: Linear.done.map(i => ({ id: i.id || i.linearId, title: i.title })),
      inProgress: inProg.map(i => ({ id: i.id || i.linearId, title: i.title, due: i.due, days: daysUntil(i.due) })),
      todo: todo.filter(i => i.status === 'todo').map(i => ({ id: i.id || i.linearId, title: i.title, due: i.due, days: daysUntil(i.due) })),
      overdue: odIssues.map(i => ({ id: i.id || i.linearId, title: i.title, days: daysOverdue(i.due) })),
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
  const type = normalizeShipClass(cls);
  const paths = {
    raider: `
      <path d="M50 13 L66 51 L56 48 L50 88 L44 48 L34 51 Z" opacity="0.82"/>
      <path d="M50 18 L50 78 M41 40 L28 34 M59 40 L72 34" fill="none" stroke-width="5" stroke-linecap="round" opacity="0.92"/>
    `,
    frigate: `
      <path d="M50 8 L64 31 L70 62 L57 58 L50 90 L43 58 L30 62 L36 31 Z" opacity="0.82"/>
      <path d="M50 17 L50 78 M39 43 L61 43 M42 58 L58 58" fill="none" stroke-width="5" stroke-linecap="round" opacity="0.92"/>
    `,
    destroyer: `
      <path d="M50 7 L67 30 L75 62 L59 58 L50 92 L41 58 L25 62 L33 30 Z" opacity="0.82"/>
      <path d="M50 16 L50 80 M37 39 L63 39 M34 55 L66 55 M42 70 L58 70" fill="none" stroke-width="5" stroke-linecap="round" opacity="0.92"/>
    `,
    cruiser: `
      <path d="M50 6 L72 31 L81 66 L61 62 L50 94 L39 62 L19 66 L28 31 Z" opacity="0.82"/>
      <path d="M50 15 L50 82 M35 37 L65 37 M30 53 L70 53 M39 69 L61 69" fill="none" stroke-width="5" stroke-linecap="round" opacity="0.92"/>
      <path d="M28 45 L16 39 M72 45 L84 39" fill="none" stroke-width="4" stroke-linecap="round" opacity="0.65"/>
    `,
    battleship: `
      <path d="M50 4 L77 32 L88 70 L64 64 L50 96 L36 64 L12 70 L23 32 Z" opacity="0.82"/>
      <path d="M50 14 L50 84 M31 38 L69 38 M25 55 L75 55 M35 72 L65 72" fill="none" stroke-width="5" stroke-linecap="round" opacity="0.92"/>
      <path d="M24 48 L8 39 M76 48 L92 39 M31 66 L16 74 M69 66 L84 74" fill="none" stroke-width="4" stroke-linecap="round" opacity="0.62"/>
    `,
    dreadnought: `
      <path d="M50 3 L80 29 L94 67 L70 68 L59 95 L50 99 L41 95 L30 68 L6 67 L20 29 Z" opacity="0.82"/>
      <path d="M50 13 L50 87 M32 32 L68 32 M22 50 L78 50 M28 67 L72 67 M39 82 L61 82" fill="none" stroke-width="5" stroke-linecap="round" opacity="0.92"/>
      <path d="M20 42 L5 32 M80 42 L95 32 M23 61 L7 70 M77 61 L93 70" fill="none" stroke-width="4.5" stroke-linecap="round" opacity="0.66"/>
      <circle cx="50" cy="50" r="7" opacity="0.95"/>
    `,
  };
  return `
    <svg class="ship-icon ship-glyph map-ship-glyph" viewBox="0 0 100 100" aria-hidden="true">
      <g fill="currentColor" stroke="currentColor" vector-effect="non-scaling-stroke">
        ${paths[type] || paths.destroyer}
      </g>
    </svg>
  `;
}

function legacyShipIcon(cls) {
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

// ============================================
// 中立单位系统 v2 — 漂移风格与战斗舰艇一致
// ============================================
function neutralIcon(type) {
  const icons = {
    // 货运舰：宽体货船，多层货舱，顶部指挥塔，底部推进器
    cargo: `<svg class="ship-icon neutral-icon" viewBox="0 0 100 100" aria-hidden="true">
      <path d="M18 38 L82 38 L88 48 L82 58 L18 58 L12 48 Z" fill="none" stroke="currentColor" stroke-width="4"/>
      <path d="M22 38 L22 30 L35 24 L45 24 L45 38" fill="none" stroke="currentColor" stroke-width="3"/>
      <line x1="30" y1="38" x2="30" y2="58" stroke="currentColor" stroke-width="2.5"/>
      <line x1="42" y1="38" x2="42" y2="58" stroke="currentColor" stroke-width="2.5"/>
      <line x1="54" y1="38" x2="54" y2="58" stroke="currentColor" stroke-width="2.5"/>
      <line x1="66" y1="38" x2="66" y2="58" stroke="currentColor" stroke-width="2.5"/>
      <line x1="78" y1="38" x2="78" y2="58" stroke="currentColor" stroke-width="2.5"/>
      <rect x="26" y="60" width="10" height="6" rx="1" fill="currentColor" opacity="0.45"/>
      <rect x="64" y="60" width="10" height="6" rx="1" fill="currentColor" opacity="0.45"/>
    </svg>`,
    // 客运舰：流线型穿梭机，舷窗阵列，尾翼，顶部天线
    passenger: `<svg class="ship-icon neutral-icon" viewBox="0 0 100 100" aria-hidden="true">
      <path d="M20 46 Q20 32 48 30 Q76 32 84 46 Q78 56 48 58 Q20 56 20 46 Z" fill="none" stroke="currentColor" stroke-width="4"/>
      <path d="M48 30 L48 22 L56 18 L64 22 L64 30" fill="none" stroke="currentColor" stroke-width="2.5"/>
      <path d="M20 46 L12 40 L12 52 Z" fill="none" stroke="currentColor" stroke-width="3"/>
      <circle cx="32" cy="44" r="2.5" fill="currentColor" opacity="0.5"/>
      <circle cx="42" cy="42" r="2.5" fill="currentColor" opacity="0.5"/>
      <circle cx="54" cy="42" r="2.5" fill="currentColor" opacity="0.5"/>
      <circle cx="66" cy="44" r="2.5" fill="currentColor" opacity="0.5"/>
      <circle cx="76" cy="46" r="2.5" fill="currentColor" opacity="0.5"/>
      <line x1="48" y1="22" x2="48" y2="14" stroke="currentColor" stroke-width="2"/>
      <line x1="42" y1="14" x2="54" y2="14" stroke="currentColor" stroke-width="2"/>
    </svg>`,
    // 补给舰：宽体后勤船，双储罐，中央连接桥，底部货舱门
    supply: `<svg class="ship-icon neutral-icon" viewBox="0 0 100 100" aria-hidden="true">
      <rect x="20" y="38" width="60" height="24" rx="4" fill="none" stroke="currentColor" stroke-width="4"/>
      <circle cx="36" cy="50" r="9" fill="none" stroke="currentColor" stroke-width="3"/>
      <circle cx="64" cy="50" r="9" fill="none" stroke="currentColor" stroke-width="3"/>
      <rect x="44" y="44" width="12" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2.5"/>
      <line x1="36" y1="38" x2="36" y2="29" stroke="currentColor" stroke-width="2.5"/>
      <line x1="64" y1="38" x2="64" y2="29" stroke="currentColor" stroke-width="2.5"/>
      <line x1="30" y1="29" x2="70" y2="29" stroke="currentColor" stroke-width="2.5"/>
      <rect x="30" y="62" width="14" height="5" rx="1" fill="currentColor" opacity="0.4"/>
      <rect x="56" y="62" width="14" height="5" rx="1" fill="currentColor" opacity="0.4"/>
    </svg>`,
  };
  return icons[type] || icons.cargo;
}

function spawnNeutralUnits() {
  G.neutrals = [];
  let idCounter = 1;

  // 每个星球分配 1~2 艘中立舰；背景交通要有存在感，但不能拖慢主战场。
  PLANETS.forEach((planet, pi) => {
    const count = 1 + Math.floor(Math.random() * 2); // 1~2
    const types = ['cargo', 'passenger', 'supply'];
    for (let i = 0; i < count; i++) {
      const type = types[i % 3];
      const cfg = NEUTRAL_CONFIG[type];
      const name = cfg.names[Math.floor(Math.random() * cfg.names.length)];
      const num = String(Math.floor(Math.random() * 20) + 1).padStart(2, '0');
      const dist = 5 + Math.random() * 9;
      const angle = Math.random() * Math.PI * 2;
      const baseX = planet.x + Math.cos(angle) * dist;
      const baseY = planet.y + Math.sin(angle) * dist;

      G.neutrals.push(makeNeutralUnit(idCounter++, type, cfg, name, num, pi, baseX, baseY));
    }
  });

  // 地图空旷区域额外撒 8~12 艘 — 随机位置，避开战斗单位密集区
  const extraCount = 8 + Math.floor(Math.random() * 5);
  const types = ['cargo', 'passenger', 'supply'];
  for (let i = 0; i < extraCount; i++) {
    const type = types[i % 3];
    const cfg = NEUTRAL_CONFIG[type];
    const name = cfg.names[Math.floor(Math.random() * cfg.names.length)];
    const num = String(Math.floor(Math.random() * 20) + 1).padStart(2, '0');

    // 随机生成位置，最多试 20 次避开战斗单位
    let baseX, baseY, tooClose;
    for (let attempt = 0; attempt < 20; attempt++) {
      baseX = 5 + Math.random() * 88;
      baseY = 5 + Math.random() * 88;
      tooClose = G.units.some(u => u.status !== 'destroyed' && Math.hypot(u.x - baseX, u.y - baseY) < 4);
      if (!tooClose) break;
    }

    G.neutrals.push(makeNeutralUnit(idCounter++, type, cfg, name, num, -1, baseX, baseY));
  }
}

function makeNeutralUnit(idCounter, type, cfg, name, num, planetIndex, baseX, baseY) {
  return {
    id: `NEU-${String(idCounter).padStart(3, '0')}`,
    name: `${name}-${num}`,
    type,
    label: cfg.label,
    color: cfg.color,
    size: cfg.size,
    planetIndex,
    baseX,
    baseY,
    x: baseX,
    y: baseY,
    _renderX: baseX,
    _renderY: baseY,
    driftPhase: Math.random() * Math.PI * 2,
    driftAmpX: 0.2 + Math.random() * 0.25,
    driftAmpY: 0.15 + Math.random() * 0.2,
    driftFreq: 0.18 + Math.random() * 0.12,
  };
}

function renderNeutrals() {
  const layer = document.querySelector('#neutralLayer');
  if (!layer) return;
  layer.innerHTML = '';

  G.neutrals.forEach(n => {
    const el = document.createElement('button');
    el.className = 'unit neutral-unit';
    el.dataset.id = n.id;
    el.type = 'button';
    el.style.cssText = `left:${n.x}%;top:${n.y}%;--unit-color:${n.color};--ship-size:${n.size}px;color:${n.color};`;
    el.innerHTML = `
      ${neutralIcon(n.type)}
      <span class="unit-code">${n.id}</span>
      <span class="unit-label">${n.name}</span>
    `;
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      selectNeutral(n.id);
    });
    layer.appendChild(el);
  });
  if (AnimationEngine && AnimationEngine.warmCache) {
    AnimationEngine.warmCache();
  }
}

function selectNeutral(id) {
  const n = G.neutrals.find(x => x.id === id);
  if (!n) return;
  document.querySelectorAll('.unit').forEach(b => b.classList.remove('is-selected'));
  const el = document.querySelector(`.neutral-unit[data-id="${cssEscape(n.id)}"]`);
  if (el) el.classList.add('is-selected');
  renderNeutralDetail(n);
}

function renderNeutralDetail(n) {
  const panel = document.querySelector('#unitDetail');
  if (!panel) return;
  const planetName = n.planetIndex >= 0 ? PLANETS[n.planetIndex]?.name : '深空航道';
  panel.innerHTML = `
    <p class="eyebrow">${n.id} / 中立单位 / ${n.label}</p>
    <h2 class="unit-title" style="--unit-color:${n.color}">${n.name}</h2>
    <div class="mission-card" style="--accent:${n.color}">
      <p class="mission-title">归属星球：${planetName}</p>
      <p class="mission-meta">${n.label} · 不可攻击单位</p>
    </div>
    <div class="tag-pills">
      <span class="tag-pill">中立</span>
      <span class="tag-pill">不可攻击</span>
    </div>
    <div class="info-grid">
      <div><span>类型</span><strong>${n.label}</strong></div>
      <div><span>归属</span><strong>${planetName}</strong></div>
    </div>
  `;
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
    const hasTrail = !isV || u.isDemoTraffic;

    return `
      ${!isV ? `<span class="threat-pulse" data-unit-id="${u.id}" style="left:${u.x}%;top:${u.y}%;--radius:${threat}px;--unit-color:${crit ? '#ff3f52' : f.color}"></span>` : ''}
      ${hasTrail ? `<span class="unit-trail" data-unit-id="${u.id}" style="left:${u.x - 1.4}%;top:${u.y + 1.1}%;--trail-width:${54 + u.power * 0.32}px;--angle:${angle};--unit-color:${f.color}"></span>` : ''}
      <button class="unit ship-${u.shipClass} ${u.status} ${u.isDemoTraffic ? 'is-demo-traffic' : ''} ${G.selectedId === u.id ? 'is-selected' : ''}"
        data-id="${u.id}" type="button" onclick="event.stopPropagation(); window.__game.selectUnit('${u.id}')"
        style="left:${u.x}%;top:${u.y}%;--unit-color:${f.color};--unit-glow:${f.glow};--status-color:${adv ? '#ff3f52' : '#4da3ff'};--ship-size:${shipMapSize(u.shipClass)}px;color:${f.color}">
        ${shipIcon(u.shipClass)}
        <span class="engine-flame" style="background:linear-gradient(180deg, ${f.color}, transparent);"></span>
        <span class="unit-code">${u.id}</span>
        <span class="unit-label">${u.name}</span>
      </button>
    `;
  }).join('');

  // 可靠的事件委托：只绑定一次，永远不会丢失（排除中立单位）
  if (!layer._gvClickBound) {
    layer._gvClickBound = true;
    layer.addEventListener('click', e => {
      const btn = e.target.closest('.unit:not(.neutral-unit)');
      if (!btn || !layer.contains(btn)) return;
      e.preventDefault();
      e.stopPropagation();
      selectUnit(btn.dataset.id);
    });
  }

  // DOM 重建后必须刷新动画引擎缓存，否则每帧 querySelector 导致严重卡顿
  if (AnimationEngine && AnimationEngine.warmCache) {
    AnimationEngine.warmCache();
  }
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
    html += r.work.inProgress.map(t => briefRow(t, '#e8fbff', t.days == null ? '' : `剩${t.days}天`)).join('');
  }
  if (r.work.todo.length) {
    html += `<h3>待办</h3>`;
    html += r.work.todo.map(t => briefRow(t, '#ffd251', t.days == null ? '' : `剩${t.days}天`)).join('');
  }
  html += `</div>`;

  el.innerHTML = html;

  if (!el._missionSelectBound) {
    el._missionSelectBound = true;
    el.addEventListener('click', event => {
      const row = event.target.closest('.brief-row[data-mission-ref]');
      if (!row || !el.contains(row)) return;
      event.preventDefault();
      const missionRef = decodeURIComponent(row.dataset.missionRef || '');
      selectByMission(missionRef);
    });
  }
}

function briefRow(t, color, label) {
  const missionRef = encodeURIComponent(String(t.id || ''));
  return `
    <button class="brief-row" type="button" data-mission-ref="${missionRef}">
      <span class="dot" style="--color:${color}"></span>
      <span>${t.title}</span>
      <small>${label}</small>
    </button>
  `;
}

function selectUnit(id) {
  const u = G.units.find(x => x.id === id);
  if (!u) return;
  const newlySelected = G.selectedId !== id;
  G.selectedId = id;
  if (newlySelected) {
    u._driftX = (u._driftX || 0) * 0.15;
    u._driftY = (u._driftY || 0) * 0.15;
    u._renderX = u.x + u._driftX;
    u._renderY = u.y + u._driftY;
    const unitEl = document.querySelector(`.unit[data-id="${cssEscape(id)}"]`);
    if (unitEl) {
      unitEl.style.left = u._renderX + '%';
      unitEl.style.top = u._renderY + '%';
    }
  }
  document.querySelectorAll('.unit').forEach(b => b.classList.toggle('is-selected', b.dataset.id === id));
  renderDetail(id, true);
}

function normalizeMissionRef(value) {
  return String(value || '').trim().toLowerCase();
}

function findUnitByMissionRef(missionRef) {
  const wanted = normalizeMissionRef(missionRef);
  if (!wanted) return null;

  const linkedIssue = Linear.issues.find(issue => {
    return [issue.id, issue.linearId, issue.identifier]
      .some(value => normalizeMissionRef(value) === wanted);
  });
  const acceptedRefs = new Set(
    [missionRef, linkedIssue?.id, linkedIssue?.linearId, linkedIssue?.identifier]
      .map(normalizeMissionRef)
      .filter(Boolean)
  );

  return G.units.find(unit => {
    const mission = unit.mission || {};
    return [mission.linearId, mission.id, mission.identifier]
      .map(normalizeMissionRef)
      .some(value => acceptedRefs.has(value));
  }) || null;
}

function selectByMission(missionRef) {
  const u = findUnitByMissionRef(missionRef);
  if (!u) {
    console.warn('[GV] No unit mapped for mission:', missionRef);
    return false;
  }
  const needsTabSwitch = _activeTab !== 'situation';
  if (needsTabSwitch) switchTab('situation');
  selectUnit(u.id);
  document.querySelectorAll('.brief-row[data-mission-ref]').forEach(row => {
    const rowUnit = findUnitByMissionRef(decodeURIComponent(row.dataset.missionRef || ''));
    row.classList.toggle('is-active', rowUnit?.id === u.id);
  });
  if (needsTabSwitch) {
    // 切换标签后等待布局恢复；当前就在星图页时直接定位，避免低帧率下延迟。
    requestAnimationFrame(() => focusOnUnit(u.id));
  } else {
    focusOnUnit(u.id);
  }
  return true;
}

function playCoordinateLock(unit) {
  const worldEl = document.querySelector('#mapWorld');
  if (!worldEl || !unit) return;

  worldEl.querySelectorAll('.coordinate-lock').forEach(el => el.remove());
  const color = FACTIONS[unit.faction]?.color || '#4da3ff';
  const renderX = unit._renderX ?? (unit.x + (unit._driftX || 0));
  const renderY = unit._renderY ?? (unit.y + (unit._driftY || 0));
  const lock = document.createElement('div');
  lock.className = 'coordinate-lock';
  lock.style.cssText = `left:${renderX}%;top:${renderY}%;--lock-color:${color};`;
  lock.innerHTML = `
    <span class="coordinate-lock-ring"></span>
    <span class="coordinate-lock-cross"></span>
    <i class="coordinate-lock-corner corner-nw"></i>
    <i class="coordinate-lock-corner corner-ne"></i>
    <i class="coordinate-lock-corner corner-sw"></i>
    <i class="coordinate-lock-corner corner-se"></i>
  `;
  worldEl.appendChild(lock);
  AnimationEngine.activeCoordinateLock = { unitId: unit.id, el: lock };
  window.setTimeout(() => {
    if (AnimationEngine.activeCoordinateLock?.el === lock) {
      AnimationEngine.activeCoordinateLock = null;
    }
    lock.remove();
  }, 1180);
}

function focusOnUnit(id) {
  const u = G.units.find(x => x.id === id);
  if (!u) return;
  const worldEl = document.querySelector('#mapWorld');
  if (!worldEl) return;
  playCoordinateLock(u);
  const worldW = parseFloat(getComputedStyle(worldEl).width) || 7200;
  const worldH = parseFloat(getComputedStyle(worldEl).height) || 4700;
  const focusX = u._renderX ?? (u.x + (u._driftX || 0));
  const focusY = u._renderY ?? (u.y + (u._driftY || 0));
  const wx = (focusX / 100) * worldW;
  const wy = (focusY / 100) * worldH;
  map.zoom = Math.max(map.zoom, 0.42);
  // #mapWorld 有 left:50% + translate(-50%,-50%)，中心始终对准父元素中心
  // panX/panY 只需补偿 (世界中心 - 舰船位置) × zoom
  map.panX = (worldW / 2 - wx) * map.zoom;
  map.panY = (worldH / 2 - wy) * map.zoom;
  worldEl.classList.remove('is-focusing-unit');
  void worldEl.offsetWidth;
  worldEl.classList.add('is-focusing-unit');
  applyMap();
  window.setTimeout(() => worldEl.classList.remove('is-focusing-unit'), 760);
}

function previewUnit(id) {
  const u = G.units.find(x => x.id === id && x.status !== 'destroyed');
  if (!u) return;
  document.querySelectorAll('.unit').forEach(b => b.classList.toggle('is-previewed', b.dataset.id === id));
  renderDetail(id, true);
}

function clearUnitPreview(id) {
  document.querySelectorAll('.unit').forEach(b => b.classList.remove('is-previewed'));
  if (G.selectedId) {
    renderDetail(G.selectedId);
    return;
  }
  renderDetail(null);
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
  // 如果直接点击了飞船，让 layer 事件委托处理（避免双重触发）
  if (e.target.closest?.('.unit')) return false;

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

function renderDetail(id, animate = false) {
  const panel = document.querySelector('#unitDetail');
  if (!panel) return;
  panel.classList.toggle('has-selection', Boolean(id));
  panel.classList.remove('is-locking');
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

  // 倒计时文案（仅当 Linear 任务设置了 due 日期时显示）
  let countdownText = '', countdownColor = '#17d7b6';
  const hasDue = u.mission?.due && u.mission.due !== '—' && String(u.mission.due).trim() !== '';
  if (hasDue) {
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

    // 信息行（无截止日期时不显示该字段）
    html += `
      <div class="info-grid">
        ${hasDue ? `<div><span>截止日期</span><strong>${m.due}</strong></div>` : ''}
        <div><span>预估工时</span><strong>${m.estimate || 3} 点</strong></div>
      </div>
    `;

  } else if (isV) {
    html += `
      <div class="tag-pills">
        <span class="tag-pill">${SHIP_CLASSES[u.shipClass].label}</span>
        <span class="tag-pill">${u.status === 'patrol' ? '巡逻' : u.status}</span>
      </div>
      <div class="vanguard-info">
        <div class="vg-row"><span class="vg-label">指挥官</span><span class="vg-value">${u.commander || '未指定'}</span></div>
        <div class="vg-row"><span class="vg-label">所属编队</span><span class="vg-value">${u.squadron || '第一特遣队'}</span></div>
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
  if (animate) {
    panel.dataset.lockedUnit = id;
    void panel.offsetWidth;
    panel.classList.add('is-locking');
  }
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
const MAP_DEFAULT_ZOOM = 0.22;
const MAP_MIN_ZOOM = 0.14;
const MAP_MAX_ZOOM = 2.4;
const map = { zoom: MAP_DEFAULT_ZOOM, panX: 0, panY: 0, dragging: false, sx: 0, sy: 0, ox: 0, oy: 0, frame: 0, hoverId: null };
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
function zoom(d) { map.zoom = clamp(map.zoom + d, MAP_MIN_ZOOM, MAP_MAX_ZOOM); scheduleMap(); }
function resetMap() { map.zoom = MAP_DEFAULT_ZOOM; map.panX = 0; map.panY = 0; applyMap(); }
// hover 检测节流 — 避免 pointermove 每帧都触发 getBoundingClientRect 强制同步布局
let _hoverRafId = null;
let _pendingHoverEvent = null;
function throttledHoverCheck(e) {
  _pendingHoverEvent = e;
  if (_hoverRafId) return;
  _hoverRafId = requestAnimationFrame(() => {
    _hoverRafId = null;
    const ev = _pendingHoverEvent;
    if (!ev) return;
    _pendingHoverEvent = null;
    if (ev.target.closest?.('.map-controls, .unit-detail, .command-panel')) return;
    const unit = unitFromPoint(ev.clientX, ev.clientY);
    const id = unit?.dataset.id || null;
    if (id !== map.hoverId) {
      map.hoverId = id;
      if (id) previewUnit(id);
      else clearUnitPreview();
    }
  });
}

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
    if (!map.dragging) {
      throttledHoverCheck(e);
      return;
    }
    map.panX = map.ox + e.clientX - map.sx;
    map.panY = map.oy + e.clientY - map.sy;
    scheduleMap();
  });
  stage.addEventListener('pointerleave', () => {
    map.hoverId = null;
    clearUnitPreview();
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
// 左侧面板宽度拖拽调整
// ============================================
function initPanelResize() {
  const handle = document.querySelector('.panel-resize-handle');
  const shell = document.querySelector('.command-shell');
  if (!handle || !shell) return;

  const MIN_WIDTH = 240;
  const MAX_WIDTH = 540;
  const STORAGE_KEY = 'gv_panel_width';

  // 恢复保存的宽度
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const w = parseInt(saved, 10);
    if (w >= MIN_WIDTH && w <= MAX_WIDTH) {
      shell.style.setProperty('--panel-width', w + 'px');
    }
  }

  let isDragging = false;
  let startX = 0;
  let startWidth = 0;

  handle.addEventListener('pointerdown', (e) => {
    isDragging = true;
    startX = e.clientX;
    const panel = document.querySelector('.command-panel');
    startWidth = panel ? panel.getBoundingClientRect().width : 306;
    handle.classList.add('is-dragging');
    handle.setPointerCapture(e.pointerId);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });

  handle.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidth + dx));
    shell.style.setProperty('--panel-width', newWidth + 'px');
  });

  handle.addEventListener('pointerup', (e) => {
    if (!isDragging) return;
    isDragging = false;
    handle.classList.remove('is-dragging');
    handle.releasePointerCapture(e.pointerId);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    const panel = document.querySelector('.command-panel');
    if (panel) {
      localStorage.setItem(STORAGE_KEY, Math.round(panel.getBoundingClientRect().width));
    }
  });

  // 安全网：窗口失焦时停止拖拽
  window.addEventListener('blur', () => {
    if (isDragging) {
      isDragging = false;
      handle.classList.remove('is-dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  });
}

// ============================================
// 加载画面控制
// ============================================
function showLoading(text, percent) {
  const screen = document.querySelector('#loadingScreen');
  const status = document.querySelector('#loadingText');
  const bar = document.querySelector('#loadingBar');
  if (screen) screen.classList.remove('is-hidden');
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
  // 降级实现：转义 CSS 选择器中的所有特殊字符
  const s = String(value);
  if (s === '') return '\ ';
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    const ch = s[i];
    if (c === 0) { out += '\FFFD '; continue; }
    if (c >= 0x01 && c <= 0x1F || c === 0x7F) {
      out += '\\' + c.toString(16).toUpperCase().padStart(2, '0') + ' ';
      continue;
    }
    if (/[0-9A-Za-z_-]/.test(ch)) { out += ch; continue; }
    // 首字符如果是数字，前面需要加 \
    if (i === 0 && /[0-9]/.test(ch)) { out += '\\' + ch; continue; }
    // 第二个字符如果是数字且第一个是连字符，前面需要加 \
    if (i === 1 && s[0] === '-' && /[0-9]/.test(ch)) { out += '\\' + ch; continue; }
    out += '\\' + ch;
  }
  return out;
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
// ============================================
// 指挥官登录系统 v2.5
// ============================================
let _loginSkip = false;

function doLogin() {
  if (_loginSkip) return;
  _loginSkip = true;
  console.log('[GV] doLogin start');

  const btn = document.querySelector('#loginBtn');
  if (btn) {
    btn.classList.add('is-processing');
    btn.querySelector('.login-btn-text').textContent = '验证中...';
  }

  // 直接跳过所有动画，立即进入
  const screen = document.querySelector('#loginScreen');
  if (screen) screen.classList.add('is-done');
  setTimeout(finishLogin, 100);
}

function typeWriter(el, text, speed, callback) {
  if (!el) { if (callback) callback(); return; }
  el.textContent = '';
  let i = 0;
  function step() {
    if (i < text.length) {
      el.textContent += text.charAt(i);
      i++;
      setTimeout(step, speed);
    } else if (callback) {
      callback();
    }
  }
  step();
}

function finishLogin() {
  console.log('[GV] finishLogin');
  const screen = document.querySelector('#loginScreen');
  if (screen) {
    screen.classList.add('is-done');
  }
  // 启动主系统
  setTimeout(bootMain, 250);
}

// Space 键跳过登录动画
document.addEventListener('keydown', e => {
  if (e.code === 'Space' && !_loginSkip) {
    e.preventDefault();
    _loginSkip = true;
    console.log('[GV] Space skip');
    const screen = document.querySelector('#loginScreen');
    if (screen) screen.classList.add('is-done');
    setTimeout(bootMain, 120);
  }
});

// ============================================
// 主系统启动
// ============================================
function bootMain() {
  console.log('[GV] bootMain start');
  const _bootSteps = [];
  function step(name, fn) {
    _bootSteps.push(name);
    try {
      const t0 = performance.now();
      fn();
      const t1 = performance.now();
      console.log(`[GV] step OK ${name}: ${(t1-t0).toFixed(1)}ms`);
    } catch (e) {
      console.error(`[GV] step FAIL ${name}:`, e.message);
    }
  }
  try {
    showLoading('初始化战术系统...', 10);
    step('initLinearUI', initLinearUI);

    showLoading('扫描星系威胁...', 30);
    step('syncLinearToGame', syncLinearToGame);
    step('processAdvance', processAdvance);
    step('checkReinforcements', checkReinforcements);

    showLoading('渲染战略地图...', 60);
    step('drawStarfield', drawStarfield);
    step('renderPlanets', renderPlanets);
    step('renderFactions', renderFactions);
    step('renderWarZones', renderWarZones);
    step('renderUnits', renderUnits);
    step('spawnNeutralUnits', spawnNeutralUnits);
    step('renderNeutrals', renderNeutrals);
    step('renderBriefing', renderBriefing);
    step('renderWarHistory', renderWarHistory);
    step('initMap', initMap);
    step('applyMap', applyMap);
    step('initPanelResize', initPanelResize);

    showLoading('启动 WIP 计时器...', 85);
    step('startWipTimer', startWipTimer);
    step('PomodoroTimer.resumeOnBoot', () => PomodoroTimer.resumeOnBoot());
    step('updateWipUI', updateWipUI);

    showLoading('启动飞船动画引擎...', 92);
    step('AnimationEngine.start', () => AnimationEngine.start());

    showLoading('部署完成', 100);
    step('PerformanceMonitor.start', () => PerformanceMonitor.start());
    console.log('[GV] ====== bootMain done, steps:', _bootSteps.length, '======');
    hideLoading();

    // 绑定 HUD 时钟点击（替代 inline onclick，避免缓存问题）
    const hudTime = document.querySelector('#hudTime');
    if (hudTime) {
      hudTime.removeAttribute('onclick');
      hudTime.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.__game && window.__game.PomodoroTimer) {
          window.__game.PomodoroTimer.toggle();
        }
      });
    }

    // 安全网：1秒后如果 loading screen 还在，强制隐藏
    setTimeout(() => {
      const ls = document.querySelector('#loadingScreen');
      if (ls && !ls.classList.contains('is-hidden')) {
        console.warn('[GV] Loading screen stuck — forcing hide');
        ls.classList.add('is-hidden');
      }
    }, 1000);
  } catch (err) {
    console.error('[GV] BOOT FAILED:', err);
    showLoading('系统启动失败: ' + err.message, 0);
    const panel = document.querySelector('#unitDetail');
    if (panel) panel.innerHTML = `<p style="color:#ff3f52">系统启动失败: ${err.message}<br>请打开浏览器控制台(F12)查看详情。</p>`;
  }
}

window.__game = { complete: completeMission, start: startMission, selectUnit, selectByMission, previewUnit, clearUnitPreview, deploy: confirmDeploy, openDeployModal, closeDeployModal, randomDeployName, selectDeploySector, confirmDeploy, doLogin, finishLogin, G, Linear, LinearAPI, StarshipSync, AnimationEngine, WarHistoryStore, renderWarHistory, PomodoroTimer };
window.addEventListener('resize', drawStarfield);
// 不再自动 boot，等用户登录
// bootMain();

// ============================================
// 标签页系统 v2.7
// ============================================
let _activeTab = 'situation';

function switchTab(tab) {
  _activeTab = tab;

  // 更新导航栏激活态
  document.querySelectorAll('.ops-tabs span').forEach(el => {
    el.classList.toggle('is-active', el.dataset.tab === tab);
  });

  // 隐藏/显示标签页
  document.querySelectorAll('.tab-page').forEach(el => {
    el.classList.toggle('is-active', el.dataset.tab === tab);
  });

  // 态势页需要特殊处理：显示/隐藏原有的 solar-map 和 command-panel
  const solarMap = document.querySelector('.solar-map');
  const cmdPanel = document.querySelector('.command-panel');
  if (solarMap) solarMap.style.display = (tab === 'situation') ? '' : 'none';
  if (cmdPanel) cmdPanel.style.display = (tab === 'situation') ? '' : 'none';

  // 渲染对应标签页
  if (tab === 'fleet') renderFleet();
  if (tab === 'campaign') renderCampaign();
  if (tab === 'intel') renderIntel();
  if (tab === 'settings') renderSettings();
}

// ============================================
// 舰队标签页
// ============================================
let _fleetFilter = 'all';

function renderFleet() {
  const filterEl = document.querySelector('#fleetFilter');
  const listEl = document.querySelector('#fleetList');
  const summaryEl = document.querySelector('#fleetSummary');
  if (!filterEl || !listEl) return;

  const factions = { all: '全部', vanguard: '银河先遣队', egov: '地球联合政府', jupiter: '木星兵团', remnant: '星际遗民' };

  // 渲染筛选按钮
  filterEl.innerHTML = Object.entries(factions).map(([k, v]) => {
    const color = k === 'all' ? '#e8fbff' : CONFIG.FACTION_COLORS[k] || '#e8fbff';
    const active = _fleetFilter === k ? 'is-active' : '';
    return `<button class="fleet-filter-btn ${active}" style="color:${color}" onclick="window.__game.setFleetFilter('${k}')">${v}</button>`;
  }).join('');

  // 过滤舰船
  const units = _fleetFilter === 'all'
    ? G.units
    : G.units.filter(u => u.faction === _fleetFilter);

  // 统计
  const destroyed = units.filter(u => u.status === 'destroyed').length;
  summaryEl.innerHTML = `
    <span>总计 <strong>${units.length}</strong></span>
    <span>活跃 <strong style="color:#17d7b6">${units.length - destroyed}</strong></span>
    <span>损失 <strong style="color:#ff3f52">${destroyed}</strong></span>
  `;

  // 渲染列表
  listEl.innerHTML = units.map(u => {
    const fcolor = CONFIG.FACTION_COLORS[u.faction] || '#e8fbff';
    const statusLabel = u.status === 'destroyed' ? '已损失' : (u.mission?.status || '活跃');
    const statusColor = u.status === 'destroyed' ? '#ff3f52' : '#17d7b6';
    const clsLabel = SHIP_CLASSES[u.shipClass]?.label || u.shipClass;
    return `
      <div class="fleet-card" style="--faction-color:${fcolor}" onclick="window.__game.selectUnit('${u.id}'); window.__game.switchTab('situation');">
        <div class="fleet-card-header">
          <span class="fleet-card-icon" aria-hidden="true">${shipIcon(u.shipClass)}</span>
          <span class="fleet-card-ident">
            <span class="fleet-card-code">${u.id}</span>
            <span class="fleet-card-name" style="color:${fcolor}">${u.name}</span>
          </span>
        </div>
        <div class="fleet-card-mission">${u.mission?.title || '无任务'}</div>
        <div class="fleet-card-meta">
          <span style="color:${statusColor}">● ${statusLabel}</span>
          <span>${clsLabel}</span>
          <span>战力 ${u.power || 0}</span>
        </div>
      </div>
    `;
  }).join('') || '<p class="muted">暂无舰船数据</p>';
}

function setFleetFilter(faction) {
  _fleetFilter = faction;
  renderFleet();
}

// ============================================
// 战役标签页
// ============================================
function renderCampaign() {
  const statsEl = document.querySelector('#campaignStats');
  const timelineEl = document.querySelector('#campaignTimeline');
  if (!statsEl || !timelineEl) return;

  const stats = WarHistoryStore.getStats();
  const records = WarHistoryStore.getRecords(20);

  // 统计卡片
  statsEl.innerHTML = `
    <div class="stat-card"><div class="stat-card-value" style="color:#4da3ff">${stats.totalDeployments}</div><div class="stat-card-label">总部署</div></div>
    <div class="stat-card"><div class="stat-card-value" style="color:#17d7b6">${stats.completedMissions}</div><div class="stat-card-label">完成任务</div></div>
    <div class="stat-card"><div class="stat-card-value" style="color:#ffd251">${stats.currentStreak}</div><div class="stat-card-label">当前连胜</div></div>
    <div class="stat-card"><div class="stat-card-value" style="color:#ff3f52">${stats.enemiesDestroyed}</div><div class="stat-card-label">击毁敌舰</div></div>
    <div class="stat-card"><div class="stat-card-value">${G.turn}</div><div class="stat-card-label">作战日</div></div>
  `;

  // 时间线
  if (records.length === 0) {
    timelineEl.innerHTML = '<p class="muted">暂无战史记录</p>';
    return;
  }

  timelineEl.innerHTML = records.map(r => {
    const color = r.type === 'victory' ? '#17d7b6' : r.type === 'defeat' ? '#ff3f52' : '#ffd251';
    const icon = r.type === 'victory' ? '✦' : r.type === 'defeat' ? '✕' : '◈';
    return `
      <div class="timeline-item">
        <span style="color:${color};font-size:14px;width:20px;text-align:center">${icon}</span>
        <span class="timeline-date">${r.date}</span>
        <div class="timeline-content">
          <div class="timeline-title">${r.title}</div>
          <div class="timeline-desc">${r.description || ''}</div>
        </div>
      </div>
    `;
  }).join('');
}

// ============================================
// 情报标签页
// ============================================
function renderIntel() {
  const factionEl = document.querySelector('#intelFactionAnalysis');
  const labelEl = document.querySelector('#intelLabelStats');
  const threatEl = document.querySelector('#intelThreatAlert');
  const economyEl = document.querySelector('#intelEconomy');
  if (!factionEl || !labelEl || !threatEl) return;

  // 势力分析
  const allIssues = [...Linear.issues, ...Linear.done.map(d => ({ ...d, status: 'done' }))];
  const factionStats = {};
  Object.keys(FACTIONS).forEach(f => {
    const issues = allIssues.filter(i => i.faction === f);
    const done = issues.filter(i => i.status === 'done').length;
    const total = issues.length;
    factionStats[f] = { total, done, rate: total > 0 ? Math.round((done / total) * 100) : 0 };
  });

  const maxTotal = Math.max(...Object.values(factionStats).map(s => s.total), 1);

  factionEl.innerHTML = `
    <div class="intel-card">
      <h3>势力任务分布</h3>
      ${Object.entries(factionStats).map(([f, s]) => {
        const color = CONFIG.FACTION_COLORS[f] || '#e8fbff';
        const width = (s.total / maxTotal) * 100;
        return `
          <div class="intel-bar">
            <span class="intel-bar-label" style="color:${color}">${FACTIONS[f]?.name || f}</span>
            <div class="intel-bar-track"><div class="intel-bar-fill" style="width:${width}%;background:${color}"></div></div>
            <span>${s.total} 任务 / ${s.rate}% 完成</span>
          </div>
        `;
      }).join('')}
    </div>
  `;

  // 标签统计
  const labelCounts = {};
  allIssues.forEach(i => {
    (i.labels || []).forEach(l => {
      labelCounts[l] = (labelCounts[l] || 0) + 1;
    });
  });
  const maxLabel = Math.max(...Object.values(labelCounts), 1);

  labelEl.innerHTML = `
    <div class="intel-card">
      <h3>标签分布</h3>
      ${Object.entries(labelCounts).sort((a, b) => b[1] - a[1]).map(([label, count]) => {
        const width = (count / maxLabel) * 100;
        return `
          <div class="intel-bar">
            <span class="intel-bar-label">${label}</span>
            <div class="intel-bar-track"><div class="intel-bar-fill" style="width:${width}%;background:#4da3ff"></div></div>
            <span>${count}</span>
          </div>
        `;
      }).join('') || '<p class="muted">暂无标签数据</p>'}
    </div>
  `;

  // 威胁预警
  const overdue = Linear.issues.filter(i => daysOverdue(i.due) > 0);
  const urgent = Linear.issues.filter(i => i.priority === 'urgent' && i.status !== 'done');
  const high = Linear.issues.filter(i => i.priority === 'high' && i.status !== 'done');

  threatEl.innerHTML = `
    <div class="intel-card">
      <h3>威胁预警</h3>
      ${overdue.length > 0 ? `<div style="margin-bottom:10px"><span style="color:#ff3f52;font-size:12px">逾期任务 (${overdue.length})</span></div>` + overdue.slice(0, 5).map(i =>
        `<div class="intel-alert">${i.title} — 逾期 ${daysOverdue(i.due)} 天</div>`
      ).join('') : '<p class="muted">暂无逾期任务</p>'}
      ${urgent.length > 0 ? `<div style="margin:16px 0 10px"><span style="color:#ffd251;font-size:12px">紧急任务 (${urgent.length})</span></div>` + urgent.slice(0, 3).map(i =>
        `<div class="intel-alert" style="background:rgba(255,210,81,0.08);border-color:rgba(255,210,81,0.2);color:#ffd251">${i.title}</div>`
      ).join('') : ''}
      ${high.length > 0 ? `<div style="margin:16px 0 10px"><span style="color:#4da3ff;font-size:12px">高优先级 (${high.length})</span></div>` + high.slice(0, 3).map(i =>
        `<div class="intel-alert" style="background:rgba(77,163,255,0.08);border-color:rgba(77,163,255,0.2);color:#8fc8ff">${i.title}</div>`
      ).join('') : ''}
    </div>
  `;

  // 经济账
  if (economyEl) {
    const records = WarHistoryStore.getRecords(20);
    const d = WIPStore.get();
    let todayIncome = 0, todayExpense = 0;
    const today = new Date().toISOString().split('T')[0];
    records.forEach(r => {
      const rDate = r.time ? r.time.split('T')[0] : '';
      if (rDate !== today) return;
      if (r.wipEarned) todayIncome += r.wipEarned;
      if (r.wipSpent) todayExpense += r.wipSpent;
    });
    // 在线计时收入也计入
    todayIncome += d.todayOnline || 0;

    const txRows = records.slice(0, 8).map(r => {
      const time = r.time ? new Date(r.time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '';
      let icon = '•', text = r.desc || '', amount = '';
      if (r.type === 'kill') { icon = '⚔️'; text = `击沉 ${r.shipName}`; amount = `+${r.wipEarned || 0}`; }
      else if (r.type === 'deploy') { icon = '🚀'; text = `部署 ${r.shipName}`; amount = `-${r.wipSpent || 0}`; }
      else if (r.type === 'pomodoro') { icon = '⏱️'; text = r.desc; amount = `+${r.wipEarned || 0}`; }
      else if (r.type === 'sync-in') { icon = '⚡'; text = r.desc; amount = ''; }
      else if (r.type === 'sync-out') { icon = '✓'; text = r.desc; amount = ''; }
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid rgba(77,163,255,0.08);font-size:12px;"><span>${icon} ${text}</span><span style="color:${amount.startsWith('+')?'#17d7b6':amount.startsWith('-')?'#ff3f52':'var(--muted)'}">${amount}</span></div>`;
    }).join('');

    economyEl.innerHTML = `
      <div class="intel-card">
        <h3>经济账</h3>
        <div style="display:flex;gap:16px;margin-bottom:12px;">
          <div style="flex:1;text-align:center;padding:8px;background:rgba(255,210,81,0.06);border-radius:4px;border:1px solid rgba(255,210,81,0.15);">
            <div style="font-size:18px;font-weight:700;color:#ffd251;">${d.total}</div>
            <div style="font-size:10px;color:var(--muted);">当前余额</div>
          </div>
          <div style="flex:1;text-align:center;padding:8px;background:rgba(23,215,182,0.06);border-radius:4px;border:1px solid rgba(23,215,182,0.15);">
            <div style="font-size:18px;font-weight:700;color:#17d7b6;">+${todayIncome}</div>
            <div style="font-size:10px;color:var(--muted);">今日收入</div>
          </div>
          <div style="flex:1;text-align:center;padding:8px;background:rgba(255,63,82,0.06);border-radius:4px;border:1px solid rgba(255,63,82,0.15);">
            <div style="font-size:18px;font-weight:700;color:#ff3f52;">-${todayExpense}</div>
            <div style="font-size:10px;color:var(--muted);">今日支出</div>
          </div>
        </div>
        ${txRows || '<p class="muted">暂无交易记录</p>'}
      </div>
    `;
  }
}

// ============================================
// 设置标签页
// ============================================
function renderSettings() {
  const el = document.querySelector('#settingsBody');
  if (!el) return;

  el.innerHTML = `
    <div class="settings-group">
      <h3>性能</h3>
      <div class="settings-row">
        <label>动画模式</label>
        <select id="perfMode" onchange="window.__game.setPerfMode(this.value)" style="padding:4px 8px;border:1px solid rgba(125,157,184,0.25);border-radius:3px;background:rgba(2,5,12,0.6);color:#e8fbff;font-size:12px;">
          <option value="auto">自动（根据帧率调整）</option>
          <option value="high">高画质</option>
          <option value="medium">中画质</option>
          <option value="low">低画质</option>
        </select>
      </div>
    </div>

    <div class="settings-group" style="margin-top:16px">
      <h3>巡航设置</h3>
      <div class="settings-row">
        <label>巡航时长</label>
        <select id="pomodoroDuration" onchange="window.__game.setPomodoroDuration(parseInt(this.value,10))" style="padding:4px 8px;border:1px solid rgba(125,157,184,0.25);border-radius:3px;background:rgba(2,5,12,0.6);color:#e8fbff;font-size:12px;">
          <option value="15">15 分钟 — 短巡航</option>
          <option value="25">25 分钟 — 标准巡航</option>
          <option value="45">45 分钟 — 深空巡航</option>
          <option value="60">60 分钟 — 长程巡航</option>
        </select>
      </div>
    </div>

    <div class="settings-group" style="margin-top:16px">
      <h3>数据管理</h3>
      <p class="muted" style="font-size:12px;margin:0 0 10px">备份 / 恢复游戏状态（WIP、战史、部署舰队、番茄钟记录）。换设备或清缓存前务必导出。</p>
      <div style="display:flex;gap:8px;">
        <button onclick="window.__game.exportGameData()" style="flex:1;padding:8px;border:1px solid #17d7b6;border-radius:4px;background:rgba(23,215,182,0.1);color:#17d7b6;cursor:pointer;font-family:var(--font-display);font-size:13px;">📥 导出备份</button>
        <button onclick="document.getElementById('importFile').click()" style="flex:1;padding:8px;border:1px solid #ffd251;border-radius:4px;background:rgba(255,210,81,0.1);color:#ffd251;cursor:pointer;font-family:var(--font-display);font-size:13px;">📤 导入恢复</button>
      </div>
      <input type="file" id="importFile" accept=".json" style="display:none" onchange="window.__game.importGameData(this)" />
    </div>

    <div class="settings-group" style="margin-top:16px">
      <h3>关于</h3>
      <p class="muted" style="font-size:12px;margin:0">银河先遣队作战指挥台 v2.9<br>GVU Strategic Command System</p>
    </div>

    <div class="settings-group" style="margin-top:16px">
      <h3>Linear 连接</h3>
      <div id="settingsConnectUI">
        <p class="muted" style="margin-bottom:10px;font-size:12px">纯展示型 — 从 Linear 读取任务，游戏内操作不回写。</p>
        <input type="password" id="settingsApiKey" placeholder="lin_api_..." value="${LinearAPI.key || ''}" style="width:100%;padding:8px 10px;border:1px solid rgba(172,219,255,0.25);border-radius:4px;background:rgba(2,5,12,0.6);color:#e8fbff;font-family:var(--font-ui);font-size:13px;box-sizing:border-box;" />
        <div style="display:flex;gap:8px;margin-top:10px;">
          <button onclick="window.__game.settingsConnect()" style="flex:1;padding:8px;border:1px solid #4da3ff;border-radius:4px;background:rgba(77,163,255,0.15);color:#4da3ff;cursor:pointer;font-family:var(--font-display);font-size:13px;">🔗 连接</button>
          <button onclick="window.__game.settingsDemo()" style="padding:8px 12px;border:1px solid rgba(232,251,255,0.15);border-radius:4px;background:rgba(232,251,255,0.05);color:var(--muted);cursor:pointer;font-family:var(--font-display);font-size:13px;">演示数据</button>
        </div>
        <p id="settingsStatus" style="margin:8px 0 0;font-size:12px;min-height:18px;"></p>
      </div>
    </div>
  `;

  const mode = localStorage.getItem('gv_perf_mode') || 'auto';
  const sel = document.querySelector('#perfMode');
  if (sel) sel.value = mode;

  const pDur = Math.round(PomodoroTimer.getDuration() / 60);
  const pSel = document.querySelector('#pomodoroDuration');
  if (pSel) pSel.value = String(pDur);
}

function settingsConnect() {
  const input = document.querySelector('#settingsApiKey');
  const status = document.querySelector('#settingsStatus');
  const key = cleanKey(input?.value || '');
  if (!key) { status.textContent = '请输入 API Key'; status.style.color = '#ff3f52'; return; }

  status.textContent = '正在连接...';
  status.style.color = '#ffd251';
  LinearAPI.key = key;

  LinearAPI.sync().then(() => {
    localStorage.setItem('gv_linear_key', key);
    status.textContent = '✓ 已连接';
    status.style.color = '#17d7b6';
    LinearAPI.startPolling(30000);
    syncLinearToGame();
    renderUnits();
    renderBriefing();
  }).catch(err => {
    status.textContent = '× 连接失败: ' + err.message;
    status.style.color = '#ff3f52';
  });
}

function settingsDemo() {
  localStorage.removeItem('gv_linear_key');
  LinearAPI.key = '';
  location.reload();
}

function setPerfMode(mode) {
  localStorage.setItem('gv_perf_mode', mode);
  if (mode === 'low' || mode === 'medium' || mode === 'high') {
    PerformanceMonitor.setQuality(mode);
  }
  if (mode === 'low') {
    AnimationEngine.stop();
  } else if (mode === 'medium' || mode === 'high' || mode === 'auto') {
    AnimationEngine.start();
  }
}

function setPomodoroDuration(minutes) {
  PomodoroTimer.setDuration(minutes);
  const status = document.querySelector('#settingsStatus');
  if (status) { status.textContent = `✓ 巡航时长已设为 ${minutes} 分钟`; status.style.color = '#17d7b6'; }
}

// v2.9: 雷达键 — 显示势力控制区域
let _radarActive = false;
function toggleRadar() {
  _radarActive = !_radarActive;
  const layer = document.querySelector('#radarLayer');
  const btn = document.querySelector('#radarToggle');
  if (!layer) return;
  if (!_radarActive) {
    layer.style.display = 'none';
    layer.innerHTML = '';
    btn?.classList.remove('is-active');
    return;
  }
  btn?.classList.add('is-active');
  layer.style.display = 'block';
  const zones = [
    { faction: 'egov',    zone: spawnZone('egov'),    color: CONFIG.FACTION_COLORS.egov || '#4da3ff',    label: '地球联合政府控制区' },
    { faction: 'jupiter', zone: spawnZone('jupiter'), color: CONFIG.FACTION_COLORS.jupiter || '#ffd251', label: '木星兵团控制区' },
    { faction: 'remnant', zone: spawnZone('remnant'), color: CONFIG.FACTION_COLORS.remnant || '#ff3f52', label: '星际遗民控制区' },
  ];
  layer.innerHTML = zones.map(z => {
    const cx = (z.zone.x[0] + z.zone.x[1]) / 2;
    const cy = (z.zone.y[0] + z.zone.y[1]) / 2;
    const rx = (z.zone.x[1] - z.zone.x[0]) / 2;
    const ry = (z.zone.y[1] - z.zone.y[0]) / 2;
    const size = Math.max(rx, ry) * 2.4;
    return `
      <div class="radar-zone" style="left:${cx - size/2}%;top:${cy - size/2}%;width:${size}%;height:${size}%;background:radial-gradient(circle at center, ${z.color}22, ${z.color}08, transparent 70%);box-shadow:inset 0 0 60px ${z.color}18, 0 0 40px ${z.color}10;">
        <span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);color:${z.color};font-family:var(--font-display);font-size:11px;letter-spacing:1px;text-shadow:0 0 8px ${z.color}40;white-space:nowrap;">${z.label}</span>
      </div>
    `;
  }).join('');
}

// v2.9: 数据导出 / 导入（为 Supabase 迁移预留接口）
function exportGameData() {
  const data = {
    _exportVersion: 1,
    _exportedAt: new Date().toISOString(),
    wip: WIPStore.load(),
    warHistory: WarHistoryStore.load(),
    pomodoro: PomodoroTimer.load(),
    settings: {
      perfMode: localStorage.getItem('gv_perf_mode') || 'auto',
      apiKey: localStorage.getItem('gv_linear_key') || '',
    },
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gvu-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  const status = document.querySelector('#settingsStatus');
  if (status) { status.textContent = '✓ 备份已导出'; status.style.color = '#17d7b6'; }
}

function importGameData(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data._exportVersion) { throw new Error('无效备份文件'); }
      if (data.wip) { WIPStore.save(data.wip); }
      if (data.warHistory) { WarHistoryStore.save(data.warHistory); }
      if (data.pomodoro) { PomodoroTimer.save(data.pomodoro); }
      if (data.settings?.perfMode) { localStorage.setItem('gv_perf_mode', data.settings.perfMode); }
      const status = document.querySelector('#settingsStatus');
      if (status) { status.textContent = '✓ 数据已恢复，刷新生效'; status.style.color = '#17d7b6'; }
      setTimeout(() => location.reload(), 800);
    } catch (err) {
      const status = document.querySelector('#settingsStatus');
      if (status) { status.textContent = '× 导入失败: ' + err.message; status.style.color = '#ff3f52'; }
    }
  };
  reader.readAsText(file);
  input.value = '';
}

window.__game = { complete: completeMission, start: startMission, selectUnit, selectByMission, previewUnit, clearUnitPreview, focusOnUnit, deploy: confirmDeploy, openDeployModal, closeDeployModal, randomDeployName, selectDeploySector, confirmDeploy, doLogin, finishLogin, G, Linear, LinearAPI, StarshipSync, AnimationEngine, WarHistoryStore, renderWarHistory, switchTab, setFleetFilter, settingsConnect, settingsDemo, setPerfMode, setPomodoroDuration, toggleRadar, PomodoroTimer, exportGameData, importGameData };
window.addEventListener('resize', drawStarfield);
