/**
 * GVU 游戏配置层
 * 所有硬编码的势力、舰船、映射规则集中在这里
 */

const GVUConfig = {
  // 地球坐标
  EARTH: { x: 25, y: 48 },
  ADVANCE_RATE: 2.5,
  CRITICAL_DISTANCE: 15,
  MAX_HISTORY: 50,

  // 势力颜色
  FACTION_COLORS: {
    vanguard: '#4da3ff',
    egov: '#17d7b6',
    jupiter: '#ffd251',
    remnant: '#ff3f52',
  },

  // 势力信息
  FACTIONS: {
    vanguard: { name: '银河先遣队', role: '玩家势力', domain: '', color: '#4da3ff', glow: 'rgba(77,163,255,0.85)', territory: '地球、水星周围航道' },
    egov: { name: '地球联合政府', role: '', domain: '', color: '#17d7b6', glow: 'rgba(23,215,182,0.82)', territory: '月球、金星周围航道' },
    jupiter: { name: '木星兵团', role: '', domain: '', color: '#ffd251', glow: 'rgba(255,210,81,0.78)', territory: '木星、土星航道' },
    remnant: { name: '星际遗民', role: '', domain: '', color: '#ff3f52', glow: 'rgba(255,63,82,0.86)', territory: '冥王星、无人航道' },
  },

  // 舰船类型
  SHIP_CLASSES: {
    flagship:   { label: '旗舰', size: 108, threat: 150, powerBase: 90 },
    dreadnought:{ label: '无畏舰', size: 108, threat: 150, powerBase: 90 },
    battleship: { label: '战列舰', size: 90, threat: 125, powerBase: 80 },
    carrier:    { label: '母舰', size: 76, threat: 112, powerBase: 70 },
    cruiser:    { label: '巡洋舰', size: 72, threat: 94, powerBase: 65 },
    destroyer:  { label: '驱逐舰', size: 58, threat: 72, powerBase: 50 },
    frigate:    { label: '护卫舰', size: 52, threat: 64, powerBase: 44 },
    raider:     { label: '袭扰艇', size: 46, threat: 54, powerBase: 35 },
  },

  // 舰船贴图路径
  SHIP_MAP_GLYPHS: {
    raider: './assets/ships/ship-map-raider-v1.png',
    frigate: './assets/ships/ship-map-frigate-v1.png',
    destroyer: './assets/ships/ship-map-destroyer-v1.png',
    cruiser: './assets/ships/ship-map-cruiser-v1.png',
    battleship: './assets/ships/ship-map-battleship-v1.png',
    dreadnought: './assets/ships/ship-map-dreadnought-v1.png',
  },

  // 舰船速度分级
  SHIP_SPEEDS: {
    raider:     { driftAmp: 1.8, driftFreq: 0.0018, orbitSpeed: 0.0009 },
    frigate:    { driftAmp: 1.4, driftFreq: 0.0015, orbitSpeed: 0.0008 },
    destroyer:  { driftAmp: 1.1, driftFreq: 0.0012, orbitSpeed: 0.0007 },
    cruiser:    { driftAmp: 0.85, driftFreq: 0.0010, orbitSpeed: 0.0006 },
    carrier:    { driftAmp: 0.65, driftFreq: 0.0008, orbitSpeed: 0.0005 },
    battleship: { driftAmp: 0.45, driftFreq: 0.0006, orbitSpeed: 0.0004 },
    dreadnought:{ driftAmp: 0.25, driftFreq: 0.0004, orbitSpeed: 0.0003 },
    flagship:   { driftAmp: 0.20, driftFreq: 0.0003, orbitSpeed: 0.0002 },
  },

  // 部署消耗
  DEPLOY_COSTS: {
    raider: 30,
    destroyer: 60,
    cruiser: 120,
    battleship: 220,
    flagship: 450,
  },

  // 势力关键词映射（可自定义）
  FACTION_KEYWORDS: {
    jupiter: ['野居', '创作', 'creative', '写作', 'write', '小说', 'novel', '设计', 'design', '内容', 'content', '文案', 'copy', '视频', 'video', '博客', 'blog', '策划', '编辑', '产品', 'product'],
  },

  // 战史模板
  WAR_TEMPLATES: {
    critical: [
      '{{faction}}舰队突破防线，紧急拦截！',
      '{{faction}}主力逼近地球轨道，红色警报！',
      '侦测到 {{faction}} 大规模跃迁信号！',
    ],
    advance: [
      '{{shipName}} 逼近 {{location}}，预计 {{days}} 日内接触',
      '{{faction}} 前锋 {{shipName}} 正在推进',
    ],
    morning: [
      '第{{turn}}作战日：{{faction}}在{{location}}部署{{count}}支舰队，其中{{overdue}}支进入威胁范围',
      '前线报告：{{faction}}{{count}}支舰队活跃于{{location}}',
    ],
    calm: [
      '当前宙域平静，各防线正常运作',
      '未发现大规模敌舰活动',
      '巡逻队报告：一切正常',
    ],
  },

  // 星球数据
  PLANETS: [
    { name: '水星', x: 28, y: 46, size: 5, color: '#c9a96e' },
    { name: '金星', x: 66, y: 30, size: 9, color: '#e8c87a' },
    { name: '地球', x: 25, y: 48, size: 10, color: '#4da3ff' },
    { name: '火星', x: 40, y: 72, size: 7, color: '#d4635a' },
    { name: '木星', x: 72, y: 70, size: 18, color: '#d4a86e' },
    { name: '土星', x: 88, y: 45, size: 15, color: '#d4c496' },
    { name: '冥王星', x: 12, y: 78, size: 4, color: '#7a8a9e' },
  ],

  // 交战区
  WAR_ZONES: [
    { name: '水星走廊', x: 32, y: 48, radius: 80, faction: 'vanguard', importance: 'high' },
    { name: '金星前线', x: 62, y: 32, radius: 100, faction: 'egov', importance: 'high' },
    { name: '木星航道', x: 74, y: 68, radius: 120, faction: 'jupiter', importance: 'high' },
    { name: '冥王星外围', x: 16, y: 78, radius: 90, faction: 'remnant', importance: 'medium' },
  ],
};

// 工具函数
GVUConfig.normalizeShipClass = function(cls) {
  return {
    flagship: 'dreadnought',
    carrier: 'cruiser',
  }[cls] || cls;
};

GVUConfig.detectFaction = function(issue) {
  const text = [
    issue.project?.name || '',
    ...(issue.labels?.nodes || []).map(l => l.name),
    issue.title || '',
  ].join(' ').toLowerCase();

  if (text.includes('野居')) return 'jupiter';
  for (const w of GVUConfig.FACTION_KEYWORDS.jupiter) {
    if (text.includes(w)) return 'jupiter';
  }
  return 'egov';
};

// 暴露到全局（兼容旧代码）
window.GVUConfig = GVUConfig;
