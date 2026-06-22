# GVU 项目上下文参考

## 项目根目录

`/Users/waiyuen/Documents/Codex/2026-05-29/kimi-kimi-linear-api-linear-linear/`

## 技术栈

- 原生 HTML / CSS / JavaScript（无框架）
- localStorage + 内存对象 `G`
- Supabase（PostgreSQL + Edge Functions）
- Linear API（通过 Supabase Edge Function `linear-proxy` 代理）
- Pinme IPFS 静态部署

## 关键文件

| 文件 | 作用 |
|------|------|
| `app.js` | 主逻辑：`WarHistoryStore`、`WIPStore`、`completeMission`、`startMission`、`renderWarHistory`、`renderCampaign`、`StarshipSync`、`bootMain` |
| `src/api/supabase.js` | Supabase 客户端封装：`signUp`/`signIn`/`signOut`/`ensureAuth`/`insert`/`select`/`upsert` |
| `src/config/supabase.js` | Supabase URL + anon key |
| `supabase/migrations/20260617000000_initial_schema.sql` | 数据库 schema、RLS、索引、触发器 |
| `supabase/functions/linear-proxy/index.ts` | Linear GraphQL 代理 Edge Function |
| `index.html` | 入口页面 |
| `tests/core.test.js` | 现有测试（无战史相关测试） |

## `war_history` 表结构

```sql
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
```

## `WarHistoryStore` 已知结构

- `load()` / `save(data)` — localStorage 读写
- `_syncRecord(record)` — 单条插入 Supabase
- `pullFromCloud(limit)` — 拉取云端并重建本地 `{records, stats}`
- `migrateToCloud()` — 批量上传本地记录
- `recordKill(unit, wipEarned)` — 记录击杀并同步
- `recordDeploy(ship)` — 记录部署并同步
- `recordPomodoro(wipEarned, sessionNum)` — **有 bug：引用未定义变量**
- `recordSync(added, removed)` — **只存本地，未调用 `_syncRecord`**

本地记录字段：`id`, `type`, `time`, `shipName`, `shipClass`, `faction`, `factionName`, `missionTitle`, `missionId`, `wipEarned`, `wipSpent`, `location`, `sessionNum`, `desc`, `count`

## 认证

- 指挥官代号 → `callsignToEmail()` → `xxx@gvu.pinme.dev`
- 邮箱 + 密码登录/注册
- 会话自动恢复：`GVSupabase.ensureAuth()`

## 同步模式

- local-first：UI 读写 localStorage，云端同步异步后台执行
- 启动时：先 pull 云端，为空则 migrate 本地
- 多设备：云端为最终一致来源

## 已知 bug 速查

1. Linear done 只触发 sync-out，不触发 kill/WIP
2. `recordPomodoro` 同步失败
3. `recordSync` 不同步
4. `renderCampaign` 字段不匹配
5. `G.warHistory` 使用未同步的 `type: 'victory'`
6. 无幂等/离线机制
7. 无战史测试
