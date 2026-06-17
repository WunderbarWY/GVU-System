/**
 * Supabase 客户端封装
 * 负责：客户端初始化、匿名认证、通用 CRUD、错误处理
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

  async function signInAnonymously() {
    if (!client) return { error: new Error('Supabase client not initialized') };
    // Supabase v2.39+ 支持匿名登录
    if (!client.auth.signInAnonymously) {
      return { error: new Error('当前 Supabase SDK 版本不支持匿名登录，请升级到 v2.39+') };
    }
    const { data, error } = await client.auth.signInAnonymously();
    if (error) return { error };
    currentUser = data.user;
    ready = true;
    return { user: data.user };
  }

  async function getSession() {
    if (!client) return { error: new Error('Supabase client not initialized') };
    const { data, error } = await client.auth.getSession();
    if (error) return { error };
    currentUser = data.session?.user || null;
    ready = !!currentUser;
    return { user: currentUser, session: data.session };
  }

  async function ensureAuth() {
    if (ready && currentUser) return { user: currentUser };
    const session = await getSession();
    if (session.user) return session;
    return signInAnonymously();
  }

  function getUserId() {
    return currentUser?.id || null;
  }

  async function upsert(table, payload) {
    const auth = await ensureAuth();
    if (auth.error) return { error: auth.error };
    const { data, error } = await client.from(table).upsert(payload, { onConflict: Object.keys(payload).filter(k => k !== 'updated_at').join(',') }).select();
    if (error) console.error(`[Supabase] upsert ${table} failed:`, error);
    return { data, error };
  }

  async function insert(table, payload) {
    const auth = await ensureAuth();
    if (auth.error) return { error: auth.error };
    const { data, error } = await client.from(table).insert(payload).select();
    if (error) console.error(`[Supabase] insert ${table} failed:`, error);
    return { data, error };
  }

  async function select(table, options = {}) {
    const auth = await ensureAuth();
    if (auth.error) return { error: auth.error };
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
    const auth = await ensureAuth();
    if (auth.error) return { error: auth.error };
    let q = client.from(table).delete();
    Object.entries(match).forEach(([k, v]) => { q = q.eq(k, v); });
    const { data, error } = await q;
    if (error) console.error(`[Supabase] delete ${table} failed:`, error);
    return { data, error };
  }

  async function rpc(fn, params) {
    const auth = await ensureAuth();
    if (auth.error) return { error: auth.error };
    const { data, error } = await client.rpc(fn, params);
    if (error) console.error(`[Supabase] rpc ${fn} failed:`, error);
    return { data, error };
  }

  client = createClient();

  window.GVSupabase = {
    ready,
    client,
    ensureAuth,
    getSession,
    signInAnonymously,
    getUserId,
    upsert,
    insert,
    select,
    remove,
    rpc,
    get isReady() { return ready && !!currentUser; },
  };

  // 启动时尝试恢复/创建匿名会话
  ensureAuth().then(({ user, error }) => {
    if (error) {
      console.error('[Supabase] 匿名认证失败:', error.message);
    } else if (user) {
      console.log('[Supabase] 匿名用户已就绪:', user.id.slice(0, 8) + '...');
    }
  });
})();
