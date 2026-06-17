-- GVU System 初始数据库结构
-- 在 Supabase SQL Editor 中执行，或作为 migrations 使用

-- 启用 UUID 扩展（Supabase 通常已启用，保险起见）
create extension if not exists "uuid-ossp";

-- ============================================
-- 用户扩展资料表
-- Supabase Auth 自带 auth.users，这里只存业务字段
-- ============================================
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  callsign text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 新用户注册时自动创建 profile
-- 使用 trigger 确保匿名用户也能立刻有 profile 行
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- WIP 工时余额表
-- 按日期汇总，每日一行
-- ============================================
create table if not exists public.wip_balances (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  total integer default 0 not null,
  today_online integer default 0 not null,
  daily_kill_bonus boolean default false not null,
  kill_streak integer default 0 not null,
  date date default current_date not null,
  deployed jsonb default '[]'::jsonb not null,
  updated_at timestamptz default now(),
  unique (user_id, date)
);

comment on table public.wip_balances is '用户每日 WIP 余额与部署舰队快照';

-- ============================================
-- 战史记录表
-- ============================================
create table if not exists public.war_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  type text not null check (type in ('kill', 'deploy', 'pomodoro', 'sync-in', 'sync-out')),
  time timestamptz default now() not null,
  ship_name text,
  ship_class text,
  faction text,
  faction_name text,
  mission_title text,
  mission_id text,
  wip_earned integer default 0 not null,
  wip_spent integer default 0 not null,
  location text,
  session_num integer,
  description text,
  count integer,
  metadata jsonb default '{}'::jsonb not null
);

comment on table public.war_history is '用户所有战斗/部署/番茄钟/同步事件记录';

-- ============================================
-- 番茄钟 sessions 表
-- ============================================
create table if not exists public.pomodoro_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  duration_minutes integer not null,
  completed_at timestamptz default now() not null,
  wip_earned integer default 0 not null
);

-- ============================================
-- Linear 同步日志表
-- 每次同步的时间与变更统计
-- ============================================
create table if not exists public.sync_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  synced_at timestamptz default now() not null,
  added integer default 0 not null,
  removed integer default 0 not null,
  changed integer default 0 not null,
  raw_issue_count integer default 0 not null
);

comment on table public.sync_logs is 'Linear 数据同步时间戳与变更统计';

-- ============================================
-- 用户部署舰队表
-- 手动部署的舰船与永久旗舰
-- ============================================
create table if not exists public.deployed_fleets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  ship_id text not null,
  name text,
  ship_class text,
  commander text,
  squadron text,
  faction text default 'vanguard' not null,
  x real,
  y real,
  is_permanent boolean default false not null,
  deployed_at date default current_date,
  created_at timestamptz default now(),
  unique (user_id, ship_id)
);

comment on table public.deployed_fleets is '用户手动部署的舰队与永久旗舰';

-- ============================================
-- 用户设置表
-- ============================================
create table if not exists public.user_settings (
  user_id uuid references auth.users on delete cascade primary key,
  perf_mode text default 'auto' not null,
  pomodoro_duration integer default 25 not null,
  updated_at timestamptz default now()
);

comment on table public.user_settings is '用户偏好设置';

-- ============================================
-- Row Level Security（用户只能访问自己的数据）
-- ============================================
alter table public.profiles enable row level security;
alter table public.wip_balances enable row level security;
alter table public.war_history enable row level security;
alter table public.pomodoro_sessions enable row level security;
alter table public.sync_logs enable row level security;
alter table public.deployed_fleets enable row level security;
alter table public.user_settings enable row level security;

-- profiles：用户只能读写自己的 profile
drop policy if exists "Users can manage own profile" on public.profiles;
create policy "Users can manage own profile" on public.profiles
  for all using (auth.uid() = id);

-- wip_balances
drop policy if exists "Users can manage own wip" on public.wip_balances;
create policy "Users can manage own wip" on public.wip_balances
  for all using (auth.uid() = user_id);

-- war_history
drop policy if exists "Users can manage own war history" on public.war_history;
create policy "Users can manage own war history" on public.war_history
  for all using (auth.uid() = user_id);

-- pomodoro_sessions
drop policy if exists "Users can manage own pomodoro" on public.pomodoro_sessions;
create policy "Users can manage own pomodoro" on public.pomodoro_sessions
  for all using (auth.uid() = user_id);

-- sync_logs
drop policy if exists "Users can manage own sync logs" on public.sync_logs;
create policy "Users can manage own sync logs" on public.sync_logs
  for all using (auth.uid() = user_id);

-- deployed_fleets
drop policy if exists "Users can manage own fleets" on public.deployed_fleets;
create policy "Users can manage own fleets" on public.deployed_fleets
  for all using (auth.uid() = user_id);

-- user_settings
drop policy if exists "Users can manage own settings" on public.user_settings;
create policy "Users can manage own settings" on public.user_settings
  for all using (auth.uid() = user_id);

-- ============================================
-- 性能索引
-- ============================================
create index if not exists idx_war_history_user_time on public.war_history(user_id, time desc);
create index if not exists idx_wip_balances_user_date on public.wip_balances(user_id, date desc);
create index if not exists idx_sync_logs_user_time on public.sync_logs(user_id, synced_at desc);
create index if not exists idx_pomodoro_user_time on public.pomodoro_sessions(user_id, completed_at desc);
create index if not exists idx_fleets_user on public.deployed_fleets(user_id);
