/**
 * Supabase 客户端封装
 * 负责：客户端初始化、邮箱/密码认证、通用 CRUD、错误处理
 *
 * v2.0 改动：
 * - 移除匿名登录，改为指挥官邮箱/密码登录
 * - 同一账号换设备可恢复数据
 */
(function initSupabaseClient() {
  'use strict';

  const config = window.SUPABASE_CONFIG;
  if (!config || !config.URL || !config.ANON_KEY || config.URL.includes('YOUR_PROJECT_ID')) {
    console.warn('[Supabase] 配置未填写，请在 src/config/supabase.js 中填入真实 URL 和 ANON_KEY');
    window.GVSupabase = { ready: false, reason: 'config_missing' };
    return;
  }

  let client = null;
  let currentUser = null;
  let ready = false;

  function createClient() {
    if (typeof supabase === 'undefined' || !supabase.createClient) {
      console.warn('[Supabase] SDK 未加载，请检查 index.html 是否引入 @supabase/supabase-js');
      return null;
    }
    return supabase.createClient(config.URL, config.ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
      db: {
        schema: 'public',
      },
    });
  }

  /**
   * 把指挥官代号转换成合规邮箱
   * 使用真实域名 gvu.pinme.dev，避免被 Supabase 邮箱校验拒绝
   * 例如 COMMANDER-1 -> commander-1@gvu.pinme.dev
   */
  function callsignToEmail(callsign) {
    const normalized = String(callsign || '').trim().toLowerCase().replace(/\s+/g, '-');
    if (!normalized) return '';
    return `${normalized}@gvu.pinme.dev`;
  }

  async function signUp(callsign, password) {
    if (!client) return { error: new Error('Supabase client not initialized') };
    const email = callsignToEmail(callsign);
    const { data, error } = await client.auth.signUp({ email, password });
    if (error) return { error };
    currentUser = data.user;
    ready = !!currentUser;
    return { user: data.user, session: data.session };
  }

  async function signIn(callsign, password) {
    if (!client) return { error: new Error('Supabase client not initialized') };
    const email = callsignToEmail(callsign);
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) return { error };
    currentUser = data.user;
    ready = !!currentUser;
    return { user: data.user, session: data.session };
  }

  async function signOut() {
    if (!client) return { error: new Error('Supabase client not initialized') };
    const { error } = await client.auth.signOut();
    currentUser = null;
    ready = false;
    return { error };
  }

  async function getSession() {
    if (!client) return { error: new Error('Supabase client not initialized') };
    const { data, error } = await client.auth.getSession();
    if (error) return { error };
    currentUser = data.session?.user || null;
    ready = !!currentUser;
    return { user: currentUser, session: data.session };
  }

  /**
   * 尝试恢复已有会话，不自动创建匿名用户
   */
  async function ensureAuth() {
    if (ready && currentUser) return { user: currentUser };
    return getSession();
  }

  function getUserId() {
    return currentUser?.id || null;
  }

  function isReady() {
    return ready && !!currentUser;
  }

  async function upsert(table, payload, options = {}) {
    if (!isReady()) return { error: new Error('用户未登录') };
    const conflictCols = options.onConflict || Object.keys(payload).filter(k => k !== 'updated_at').join(',');
    if (!options.onConflict) {
      console.warn(`[Supabase] upsert ${table} 未指定 onConflict，自动推断为: ${conflictCols}`);
    }
    const { data, error } = await client.from(table).upsert(payload, { onConflict: conflictCols }).select();
    if (error) console.error(`[Supabase] upsert ${table} failed:`, error);
    return { data, error };
  }

  async function insert(table, payload) {
    if (!isReady()) return { error: new Error('用户未登录') };
    const { data, error } = await client.from(table).insert(payload).select();
    if (error) console.error(`[Supabase] insert ${table} failed:`, error);
    return { data, error };
  }

  async function select(table, options = {}) {
    if (!isReady()) return { error: new Error('用户未登录') };
    let q = client.from(table).select(options.columns || '*');
    if (options.order) {
      options.order.forEach(o => { q = q.order(o.column, { ascending: o.ascending ?? false }); });
    }
    if (options.limit) q = q.limit(options.limit);
    if (options.eq) {
      Object.entries(options.eq).forEach(([k, v]) => { q = q.eq(k, v); });
    }
    const { data, error } = await q;
    if (error) console.error(`[Supabase] select ${table} failed:`, error);
    return { data, error };
  }

  async function remove(table, match) {
    if (!isReady()) return { error: new Error('用户未登录') };
    let q = client.from(table).delete();
    Object.entries(match).forEach(([k, v]) => { q = q.eq(k, v); });
    const { data, error } = await q;
    if (error) console.error(`[Supabase] delete ${table} failed:`, error);
    return { data, error };
  }

  async function rpc(fn, params) {
    if (!isReady()) return { error: new Error('用户未登录') };
    const { data, error } = await client.rpc(fn, params);
    if (error) console.error(`[Supabase] rpc ${fn} failed:`, error);
    return { data, error };
  }

  client = createClient();

  // 监听登录态变化（多标签页同步、token 刷新）
  if (client) {
    client.auth.onAuthStateChange((_event, session) => {
      currentUser = session?.user || null;
      ready = !!currentUser;
    });
  }

  window.GVSupabase = {
    ready,
    client,
    callsignToEmail,
    signUp,
    signIn,
    signOut,
    ensureAuth,
    getSession,
    getUserId,
    upsert,
    insert,
    select,
    remove,
    rpc,
    get isReady() { return ready && !!currentUser; },
  };

  // 启动时尝试恢复已有会话（静默，不自动匿名登录）
  getSession().then(({ user, error }) => {
    if (error) {
      console.error('[Supabase] 会话恢复失败:', error.message);
    } else if (user) {
      console.log('[Supabase] 已恢复登录:', user.id.slice(0, 8) + '...');
    } else {
      console.log('[Supabase] 未登录，等待指挥官接入');
    }
  });
})();
