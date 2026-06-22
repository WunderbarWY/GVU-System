/**
 * GVU 战史系统测试 — 覆盖记录、幂等、离线队列与字段渲染
 */

const _whMemory = {};
const safeLS = {
  setJSON(key, value) {
    _whMemory[key] = JSON.stringify(value);
  },
};
const mockLocalStorage = {
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(_whMemory, key) ? _whMemory[key] : null;
  },
  setItem(key, value) {
    _whMemory[key] = String(value);
  },
  clear() {
    Object.keys(_whMemory).forEach(key => delete _whMemory[key]);
  },
};
const mockNavigator = { onLine: true };
const mockWindow = {};

const SHIP_CLASSES = {
  battleship: { label: '战列舰' },
  cruiser: { label: '巡洋舰' },
  destroyer: { label: '驱逐舰' },
};
const FACTIONS = {
  egov: { name: '地球联合政府', color: '#17d7b6' },
  vanguard: { name: '银河先遣队', color: '#4da3ff' },
};
function priorityToClass(p) {
  return { urgent: 'battleship', high: 'cruiser', medium: 'destroyer' }[p] || 'destroyer';
}
function nearestPlanet() {
  return '地球司令部';
}
function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;' }[c]));
}

function createWarHistoryStore() {
  return {
    _key: 'gv_war_history',
    _queueKey: 'gvu_war_history_queue',
    _maxRecords: 50,
    _id: 0,
    load() {
      try {
        const data = JSON.parse(mockLocalStorage.getItem(this._key)) || { records: [], stats: {} };
        data.records = (data.records || []).map(r => this._normalizeRecord(r));
        return data;
      } catch {
        return { records: [], stats: {} };
      }
    },
    save(data) {
      data.records = (data.records || []).map(r => this._normalizeRecord(r));
      safeLS.setJSON(this._key, data);
    },
    _createClientId(prefix = 'wh') {
      this._id += 1;
      return `${prefix}-${this._id}`;
    },
    _normalizeRecord(record) {
      const r = { ...(record || {}) };
      r.clientId = r.clientId || r.client_id || r.id || this._createClientId('wh-legacy');
      r.id = r.id || r.clientId;
      r.time = r.time || new Date().toISOString();
      r.synced = !!r.synced;
      return r;
    },
    get() {
      const data = this.load();
      if (!data.records) data.records = [];
      if (!data.stats) data.stats = {};
      return data;
    },
    hasKill(missionId) {
      return this.get().records.some(r => r.type === 'kill' && r.missionId === missionId);
    },
    _enqueue(record) {
      const normalized = this._normalizeRecord(record);
      const queue = this._loadQueue();
      if (!queue.some(r => r.clientId === normalized.clientId)) {
        queue.push(normalized);
        this._saveQueue(queue);
      }
    },
    _dequeue(clientId) {
      this._saveQueue(this._loadQueue().filter(r => r.clientId !== clientId));
    },
    _loadQueue() {
      try {
        return (JSON.parse(mockLocalStorage.getItem(this._queueKey)) || []).map(r => this._normalizeRecord(r));
      } catch {
        return [];
      }
    },
    _saveQueue(queue) {
      safeLS.setJSON(this._queueKey, queue || []);
    },
    async _syncRecord(record) {
      record = this._normalizeRecord(record);
      if (mockNavigator.onLine === false || !mockWindow.GVSupabase?.isReady) {
        this._enqueue(record);
        return false;
      }
      const payload = {
        client_id: record.clientId,
        user_id: mockWindow.GVSupabase.getUserId(),
        type: record.type,
        mission_id: record.missionId || null,
        ship_name: record.shipName || null,
        time: record.time,
        description: record.desc || null,
        metadata: record.metadata || {},
      };
      const result = await mockWindow.GVSupabase.upsert('war_history', payload, { onConflict: 'client_id' });
      if (result.error) {
        this._enqueue(record);
        return false;
      }
      this._dequeue(record.clientId);
      return true;
    },
    recordKill(unit, wipEarned) {
      const data = this.get();
      const missionId = unit?.missionId || unit?.mission?.linearId || unit?.id || '';
      const existing = missionId ? data.records.find(r => r.type === 'kill' && r.missionId === missionId) : null;
      if (existing) return existing;
      const shipClass = unit?.shipClass || priorityToClass(unit?.priority);
      const faction = unit?.faction || 'vanguard';
      const clientId = unit?.clientId || this._createClientId('wh-k');
      const record = {
        id: clientId,
        clientId,
        type: 'kill',
        time: new Date().toISOString(),
        shipName: unit?.shipName || unit?.name || '先锋舰',
        shipClass: SHIP_CLASSES[shipClass]?.label || shipClass || '',
        faction,
        factionName: FACTIONS[faction]?.name || faction,
        missionTitle: unit?.missionTitle || unit?.title || unit?.mission?.title || '',
        missionId,
        wipEarned: unit?.wipEarned ?? wipEarned ?? 0,
        location: nearestPlanet(),
        desc: unit?.desc || ('任务完成：' + (unit?.missionTitle || unit?.title || missionId)),
        metadata: { source: unit?.source || 'manual' },
        synced: false,
      };
      data.records.unshift(record);
      this.save(data);
      this._syncRecord(record);
      return record;
    },
    recordPomodoro(info, sessionNum) {
      if (typeof info !== 'object' || info === null) info = { wipEarned: info, sessionNum };
      const data = this.get();
      const id = this._createClientId('wh-p');
      const record = {
        id,
        clientId: id,
        type: 'pomodoro',
        time: new Date().toISOString(),
        wipEarned: info.wipEarned ?? info.added ?? 0,
        sessionNum: info.sessionNum || 1,
        desc: `完成第 ${info.sessionNum || 1} 个番茄钟，专注 25 分钟`,
        metadata: { added: info.added || info.wipEarned || 0, removed: info.removed || 0 },
      };
      data.records.unshift(record);
      this.save(data);
      this._syncRecord(record);
      return data;
    },
    recordSync(added, removed) {
      if (typeof added === 'object' && added !== null) {
        removed = added.removed || 0;
        added = added.added || 0;
      }
      const data = this.get();
      const records = [];
      if (added > 0) records.push({ id: this._createClientId('wh-s'), type: 'sync-in', count: added, desc: `探测到 ${added} 艘新敌舰` });
      if (removed > 0) records.push({ id: this._createClientId('wh-s'), type: 'sync-out', count: removed, desc: `${removed} 艘敌舰已撤离` });
      records.forEach(r => {
        r.clientId = r.id;
        r.time = new Date().toISOString();
        r.metadata = { syncType: r.type === 'sync-in' ? 'in' : 'out' };
        data.records.unshift(r);
      });
      this.save(data);
      records.forEach(r => this._syncRecord(r));
      return data;
    },
    getRecords(limit = 8) {
      return this.get().records.slice(0, limit);
    },
  };
}

function renderCampaignTimeline(store) {
  return store.getRecords(20).map(r => {
    const dateStr = r.time ? new Date(r.time).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
    const title = r.shipName ? `${r.shipName}${r.shipClass ? ' · ' + r.shipClass : ''}` : ({ 'sync-in': 'Linear 同步', 'sync-out': 'Linear 同步', pomodoro: '专注记录' }[r.type] || '战史记录');
    const desc = r.desc || r.missionTitle || r.description || '';
    return `<div><span>${escapeHtml(dateStr)}</span><b>${escapeHtml(title)}</b><p>${escapeHtml(desc)}</p></div>`;
  }).join('');
}

describe('WarHistoryStore', () => {
  let store;

  beforeEach(() => {
    mockLocalStorage.clear();
    mockNavigator.onLine = true;
    mockWindow.GVSupabase = null;
    store = createWarHistoryStore();
  });

  it('recordKill creates a kill record', () => {
    const record = store.recordKill({ missionId: 'ISSUE-1', shipName: '先锋号', faction: 'egov' });
    expect(record.type).toBe('kill');
    expect(record.missionId).toBe('ISSUE-1');
    expect(record.clientId).toMatch(/^wh-k-/);
  });

  it('recordKill is idempotent for same missionId', () => {
    store.recordKill({ missionId: 'ISSUE-1', shipName: '先锋号' });
    store.recordKill({ missionId: 'ISSUE-1', shipName: '先锋号' });
    const kills = store.get().records.filter(r => r.type === 'kill' && r.missionId === 'ISSUE-1');
    expect(kills.length).toBe(1);
  });

  it('recordPomodoro accepts object args and does not throw', () => {
    store.recordPomodoro({ added: 1, removed: 0, sessionNum: 2 });
    const record = store.get().records[0];
    expect(record.type).toBe('pomodoro');
    expect(record.wipEarned).toBe(1);
  });

  it('recordSync creates sync records and queues while offline', () => {
    mockNavigator.onLine = false;
    store.recordSync(1, 1);
    expect(store.get().records.length).toBe(2);
    expect(store._loadQueue().length).toBe(2);
  });

  it('sync uses client_id upsert and dequeues on success', async () => {
    const calls = [];
    mockWindow.GVSupabase = {
      isReady: true,
      getUserId() { return 'user-1'; },
      async upsert(table, payload, options) {
        calls.push({ table, payload, options });
        return { data: [payload], error: null };
      },
    };
    const record = store.recordKill({ missionId: 'ISSUE-2', shipName: '深空星烛' });
    await store._syncRecord(record);
    expect(calls[0].payload.client_id).toBe(record.clientId);
    expect(calls[0].options.onConflict).toBe('client_id');
    expect(store._loadQueue().length).toBe(0);
  });

  it('campaign rendering uses time, shipName, and desc fields', () => {
    store.recordKill({ missionId: 'ISSUE-3', shipName: '千城河', shipClass: 'cruiser', desc: '任务完成：测试战役' });
    const html = renderCampaignTimeline(store);
    expect(html.includes('undefined')).toBeFalsy();
    expect(html).toContain('千城河');
    expect(html).toContain('任务完成：测试战役');
  });
});
