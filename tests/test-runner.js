/**
 * GVU 极简测试框架 v1.0 — 零依赖，浏览器原生运行
 */

const _tests = [];
let _currentSuite = '';
let _currentBeforeEach = null;
let _pass = 0, _fail = 0, _skip = 0;

function describe(name, fn) {
  const prevSuite = _currentSuite;
  const prevBeforeEach = _currentBeforeEach;
  _currentSuite = name;
  _currentBeforeEach = null;
  fn();
  _currentSuite = prevSuite;
  _currentBeforeEach = prevBeforeEach;
}

function beforeEach(fn) {
  _currentBeforeEach = fn;
}

function it(name, fn) {
  _tests.push({ suite: _currentSuite, name, fn, beforeEach: _currentBeforeEach });
}

function xit(name, _fn) {
  _tests.push({ suite: _currentSuite, name, fn: null, skip: true });
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toEqual(expected) {
      const a = JSON.stringify(actual);
      const b = JSON.stringify(expected);
      if (a !== b) {
        throw new Error(`Expected ${b}, got ${a}`);
      }
    },
    toBeCloseTo(expected, precision = 2) {
      const diff = Math.abs(actual - expected);
      const threshold = Math.pow(10, -precision);
      if (diff >= threshold) {
        throw new Error(`Expected ${actual} to be close to ${expected} (diff ${diff} >= ${threshold})`);
      }
    },
    toBeGreaterThan(expected) {
      if (!(actual > expected)) {
        throw new Error(`Expected ${actual} > ${expected}`);
      }
    },
    toBeLessThan(expected) {
      if (!(actual < expected)) {
        throw new Error(`Expected ${actual} < ${expected}`);
      }
    },
    toBeTruthy() {
      if (!actual) throw new Error(`Expected truthy, got ${JSON.stringify(actual)}`);
    },
    toBeFalsy() {
      if (actual) throw new Error(`Expected falsy, got ${JSON.stringify(actual)}`);
    },
    toContain(expected) {
      if (!actual.includes(expected)) {
        throw new Error(`Expected ${JSON.stringify(actual)} to contain ${JSON.stringify(expected)}`);
      }
    },
    toMatch(re) {
      if (!re.test(actual)) {
        throw new Error(`Expected ${JSON.stringify(actual)} to match ${re}`);
      }
    },
    toThrow(expectedMsg) {
      let threw = false, msg = '';
      try { actual(); } catch (e) { threw = true; msg = e.message; }
      if (!threw) throw new Error(`Expected function to throw`);
      if (expectedMsg && !msg.includes(expectedMsg)) {
        throw new Error(`Expected throw message to include "${expectedMsg}", got "${msg}"`);
      }
    },
  };
}

async function runTests() {
  const out = document.getElementById('testOutput');
  out.innerHTML = '<p style="color:#8aa8c4">Running...</p>';
  _pass = _fail = _skip = 0;
  const results = [];

  for (const t of _tests) {
    if (t.skip) { _skip++; results.push({ suite: t.suite, name: t.name, status: 'skip' }); continue; }
    try {
      if (t.beforeEach) await t.beforeEach();
      await t.fn();
      _pass++;
      results.push({ suite: t.suite, name: t.name, status: 'pass' });
    } catch (e) {
      _fail++;
      results.push({ suite: t.suite, name: t.name, status: 'fail', error: e.message, stack: e.stack });
    }
  }

  renderResults(results);
}

function renderResults(results) {
  const out = document.getElementById('testOutput');
  let html = '';
  let lastSuite = '';

  for (const r of results) {
    if (r.suite !== lastSuite) {
      if (lastSuite) html += '</div>';
      html += `<div class="suite"><h3>${r.suite}</h3>`;
      lastSuite = r.suite;
    }
    const color = r.status === 'pass' ? '#6bc49a' : r.status === 'skip' ? '#8aa8c4' : '#ff3f52';
    const icon = r.status === 'pass' ? '✓' : r.status === 'skip' ? '○' : '✗';
    html += `<div class="case ${r.status}"><span style="color:${color}">${icon}</span> ${r.name}`;
    if (r.error) {
      html += `<div class="err">${escapeHtml(r.error)}</div>`;
      if (r.stack) {
        const line = r.stack.split('\n').slice(1, 3).join('\n');
        html += `<pre class="stack">${escapeHtml(line)}</pre>`;
      }
    }
    html += '</div>';
  }
  if (lastSuite) html += '</div>';

  const total = _pass + _fail + _skip;
  const summaryColor = _fail > 0 ? '#ff3f52' : '#6bc49a';
  html += `<div class="summary" style="color:${summaryColor}">${total} total · ${_pass} pass · ${_fail} fail · ${_skip} skip</div>`;

  out.innerHTML = html;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;' }[c]));
}

window.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('runTests');
  if (btn) btn.addEventListener('click', runTests);
  // 自动运行
  setTimeout(runTests, 100);
});
