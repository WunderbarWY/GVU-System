/**
 * GVU 核心函数测试 — 纯逻辑，零 DOM 依赖
 */

// ========== 复制被测函数（保持与 app.js 完全一致）==========

const CONFIG = { EARTH: { x: 25, y: 48 } };

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

const PLANETS = [
  { name: '水星前哨', x: 36, y: 50 },
  { name: '金星航道', x: 76, y: 22 },
  { name: '地球司令部', x: 22, y: 47 },
  { name: '月球封锁线', x: 50, y: 38 },
  { name: '木星船坞', x: 85, y: 63 },
  { name: '土星议庭', x: 55, y: 82 },
  { name: '冥王星暗港', x: 13, y: 88 },
];

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
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / 86400000);
}
function normalizeShipClass(cls) {
  return { flagship: 'dreadnought', carrier: 'cruiser' }[cls] || cls;
}
function genCode(faction, idx) {
  const p = { vanguard: 'V', egov: 'E', jupiter: 'J', remnant: 'R' };
  return `${p[faction] || 'X'}-${String(idx + 1).padStart(3, '0')}`;
}
function priorityToClass(p) {
  return { urgent: 'battleship', high: 'cruiser', medium: 'destroyer', low: 'raider' }[p] || 'destroyer';
}
function sectorName(f) {
  return { egov: '金星-月球', jupiter: '木星-土星', remnant: '冥王星' }[f] || '未知区域';
}
function nearestPlanet(x, y) {
  return PLANETS.reduce((best, p) => {
    const d = Math.hypot(x - p.x, y - p.y);
    return d < best.d ? { ...p, d } : best;
  }, { ...PLANETS[0], d: Infinity }).name;
}
function cssEscape(value) {
  if (typeof window !== 'undefined' && window.CSS?.escape) return CSS.escape(value);
  return String(value).replace(/["\\]/g, '\\$&');
}

// ========== 测试用例 ==========

describe('rand()', () => {
  it('returns integer in [0, n)', () => {
    for (let i = 0; i < 50; i++) {
      const r = rand(10);
      expect(r).toBeGreaterThan(-1);
      expect(r).toBeLessThan(10);
      expect(Math.floor(r)).toBe(r);
    }
  });
  it('returns 0 when n is 1', () => {
    expect(rand(1)).toBe(0);
  });
});

describe('pick()', () => {
  it('returns an element from array', () => {
    const arr = ['a', 'b', 'c'];
    const p = pick(arr);
    expect(arr.includes(p)).toBeTruthy();
  });
});

describe('clamp()', () => {
  it('clamps to lower bound', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });
  it('clamps to upper bound', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });
  it('returns value inside range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });
  it('handles equal bounds', () => {
    expect(clamp(5, 7, 7)).toBe(7);
  });
});

describe('distToEarth()', () => {
  it('returns 0 at Earth position', () => {
    expect(distToEarth(25, 48)).toBe(0);
  });
  it('calculates correct distance', () => {
    // Earth (25,48) -> (25,58) = distance 10
    expect(distToEarth(25, 58)).toBeCloseTo(10, 5);
  });
  it('calculates diagonal distance', () => {
    // (25,48) -> (28,52): dx=3, dy=4, dist=5
    expect(distToEarth(28, 52)).toBeCloseTo(5, 5);
  });
});

describe('daysOverdue()', () => {
  it('returns 0 for null/empty', () => {
    expect(daysOverdue(null)).toBe(0);
    expect(daysOverdue('')).toBe(0);
  });
  it('returns 0 for future date', () => {
    const future = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    expect(daysOverdue(future)).toBe(0);
  });
  it('returns positive for past date', () => {
    const past = new Date(Date.now() - 86400000 * 3).toISOString().split('T')[0];
    expect(daysOverdue(past)).toBeGreaterThan(0);
  });
});

describe('daysUntil()', () => {
  it('returns null for null/empty', () => {
    expect(daysUntil(null)).toBe(null);
    expect(daysUntil('')).toBe(null);
  });
  it('returns 0 for today', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(daysUntil(today)).toBe(0);
  });
  it('returns positive for future', () => {
    const future = new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0];
    expect(daysUntil(future)).toBeGreaterThan(0);
  });
  it('returns negative for past', () => {
    const past = new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0];
    expect(daysUntil(past)).toBeLessThan(0);
  });
});

describe('normalizeShipClass()', () => {
  it('maps flagship to dreadnought', () => {
    expect(normalizeShipClass('flagship')).toBe('dreadnought');
  });
  it('maps carrier to cruiser', () => {
    expect(normalizeShipClass('carrier')).toBe('cruiser');
  });
  it('passes through other classes', () => {
    expect(normalizeShipClass('battleship')).toBe('battleship');
    expect(normalizeShipClass('raider')).toBe('raider');
  });
  it('handles unknown class', () => {
    expect(normalizeShipClass('unknown')).toBe('unknown');
  });
});

describe('genCode()', () => {
  it('generates correct format', () => {
    expect(genCode('vanguard', 0)).toBe('V-001');
    expect(genCode('egov', 5)).toBe('E-006');
    expect(genCode('jupiter', 99)).toBe('J-100');
    expect(genCode('remnant', 999)).toBe('R-1000');
  });
  it('falls back to X for unknown faction', () => {
    expect(genCode('alien', 0)).toBe('X-001');
  });
});

describe('priorityToClass()', () => {
  it('maps priorities correctly', () => {
    expect(priorityToClass('urgent')).toBe('battleship');
    expect(priorityToClass('high')).toBe('cruiser');
    expect(priorityToClass('medium')).toBe('destroyer');
    expect(priorityToClass('low')).toBe('raider');
  });
  it('defaults to destroyer', () => {
    expect(priorityToClass('unknown')).toBe('destroyer');
  });
});

describe('sectorName()', () => {
  it('maps factions correctly', () => {
    expect(sectorName('egov')).toBe('金星-月球');
    expect(sectorName('jupiter')).toBe('木星-土星');
    expect(sectorName('remnant')).toBe('冥王星');
  });
  it('returns default for unknown', () => {
    expect(sectorName('alien')).toBe('未知区域');
  });
});

describe('nearestPlanet()', () => {
  it('finds Earth near Earth position', () => {
    expect(nearestPlanet(22, 47)).toBe('地球司令部');
  });
  it('finds Jupiter near Jupiter position', () => {
    expect(nearestPlanet(85, 63)).toBe('木星船坞');
  });
  it('finds closest planet for arbitrary point', () => {
    // Point roughly between Earth (22,47) and Mercury (36,50)
    const name = nearestPlanet(29, 48);
    expect(name === '地球司令部' || name === '水星前哨').toBeTruthy();
  });
});

describe('cssEscape()', () => {
  it('escapes quotes', () => {
    expect(cssEscape('a"b')).toContain('\\"');
  });
  it('escapes backslash', () => {
    expect(cssEscape('a\\b')).toContain('\\\\');
  });
  it('escapes dots', () => {
    expect(cssEscape('ship.v1')).toBe('ship\\.v1');
  });
  it('escapes colons', () => {
    expect(cssEscape('ship:v1')).toBe('ship\\:v1');
  });
  it('escapes hashes', () => {
    expect(cssEscape('ship#v1')).toBe('ship\\#v1');
  });
  it('escapes spaces', () => {
    expect(cssEscape('ship v1')).toBe('ship\\ v1');
  });
  it('escapes leading digits', () => {
    expect(cssEscape('123ship')).toBe('\\123ship');
  });
  it('leaves safe strings intact', () => {
    expect(cssEscape('hello-world')).toBe('hello-world');
    expect(cssEscape('ship_v2')).toBe('ship_v2');
    expect(cssEscape('ABCxyz')).toBe('ABCxyz');
  });
  it('handles empty string', () => {
    expect(cssEscape('')).toBe('\ ');
  });
});
