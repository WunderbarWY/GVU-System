/**
 * Supabase 连接配置
 *
 * 1. 在 https://supabase.com 创建项目
 * 2. 进入 Project Settings -> API
 * 3. 复制 Project URL 和 anon public API key
 * 4. 把下面的占位符替换为你的真实值
 *
 * 注意：anon key 可以放在前端，因为 Row Level Security (RLS)
 * 会确保每个用户只能访问自己的数据。
 */

const SUPABASE_CONFIG = {
  URL: 'https://xsawiocbacbnvidqraxh.supabase.co',
  ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzYXdpb2NiYWNibnZpZHFyYXhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2ODcxODksImV4cCI6MjA5NzI2MzE4OX0.Qwded55Q3aZ7k0n5-WzVoi5ixozfg3EqbCcqSO39rIE',
};

// 全局暴露，方便其他模块使用
window.SUPABASE_CONFIG = SUPABASE_CONFIG;
