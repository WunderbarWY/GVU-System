# INIT — GVU 战争历史系统改造启动文档

## 1. 项目背景

**GVU（银河先遣队作战指挥台）** 是一款浏览器端战术地图 + 生产力游戏。用户在游戏中通过完成 Linear 任务来驱动星际舰队作战。战争历史系统（War History）负责记录每一次已完成的任务/战役，包括：

- 击杀（kill）— 任务完成
- 部署（deploy）— 飞船/单位部署
- 番茄钟（pomodoro）— 专注时段
- 同步事件（sync）— 与 Linear 的双向同步

当前系统存在记录遗漏、同步失败、UI 字段不匹配、缺乏幂等性与离线支持等问题。本文档指导另一名 AI（Codex）在不询问人类的情况下完成改造。

## 2. 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | 原生 HTML / CSS / JavaScript（静态站点，无框架） |
| 状态存储 | 浏览器 `localStorage` + 内存对象 `G` |
| 后端/数据库 | Supabase（PostgreSQL + Edge Functions） |
| 任务管理 | Linear API（通过 Supabase Edge Function 代理） |
| 部署托管 | Pinme IPFS 静态托管 |
| 测试 | 浏览器控制台脚本 或 Node.js 测试文件（视项目现有结构而定） |

## 3. 核心文件路径

从项目根目录出发，关键文件如下：

- `app.js` — 主应用逻辑，包含 `WarHistoryStore`、`completeMission`、`startMission`、`renderWarHistory`、`StarshipSync`
- `src/api/supabase.js` — Supabase 客户端封装（auth + CRUD）
- `supabase/migrations/20260617000000_initial_schema.sql` — 数据库初始 schema，包含 `war_history` 表

> 实际项目根目录：`/Users/waiyuen/Documents/Codex/2026-05-29/kimi-kimi-linear-api-linear-linear/`（本文档集所在目录的父级）。所有文件路径均相对于该根目录书写。

## 4. 当前已确认的问题

1. Linear 中标记为完成的 issue 仅触发 `recordSync(sync-out)`（敌方撤退），未触发 `recordKill` / WIP 奖励。
2. `recordPomodoro` 引用未定义的 `added`/`removed`，导致同步失败。
3. `recordSync` 仅保存本地，未调用 `_syncRecord`。
4. `renderCampaign` 时间线期望 `r.date`/`r.title`/`r.description`，但实际记录为 `r.time`/`r.shipName`/`r.desc`。
5. `G.warHistory` 使用 `type: 'victory'` 单独轨道，该类型从未同步，应统一使用 `WarHistoryStore`。
6. 云端插入缺乏去重/幂等机制。
7. 缺乏离线同步队列。
8. 缺乏战争历史相关测试。

## 5. 执行规则

### 5.1 必须遵守

- **不得删除现有功能**：只修复 bug 和填补缺口，不重构无关模块。
- **最小改动原则**：每个改动只解决一个具体问题。
- **字段映射规则**：
  - 数据库列使用 `snake_case`
  - 本地内存/ localStorage 键使用 `camelCase`
  - Supabase 返回数据为 snake_case，读取后应转换为 camelCase 再进入 `WarHistoryStore`
- **幂等性**：每条战争历史记录必须带 `client_id`（本地生成的 UUID），云端插入按 `client_id` 去重。
- **离线优先**：网络不可用时写入本地队列，恢复后按序同步。
- **测试先行**：新增测试覆盖核心函数，改造后才能标记完成。

### 5.2 代码风格

- 沿用 `app.js` 现有 ES5/ES6 混合风格。
- 新函数采用 `camelCase`，注释使用中文或英文均可，但关键逻辑必须注释。
- 不要在全局命名空间乱加变量；优先挂载到 `G` 或 `WarHistoryStore`。

### 5.3 安全与提交

- 不要修改 `.env` 或提交真实密钥。
- 不要执行 `git commit` / `git push`，除非用户明确授权。
- Edge Function 如需修改，先本地 `supabase functions serve` 验证，再部署。

## 6. BOOT 序列（执行者启动步骤）

执行者在阅读完本文件后，按以下顺序启动：

1. 阅读 `00-README.md`，了解文档集结构与阅读顺序。
2. 阅读 `01-PRD.md`，确认需求与验收标准。
3. 阅读 `03-平台适配决策树.md`，确认平台适配策略。
4. 阅读 `05-执行规划.md`，按文件逐步实施。
5. 阅读 `09-执行时序与里程碑.md`，按阶段执行并打卡。
6. 每完成一阶段，在 `TODO.md` 更新状态，并在 `99-执行偏差日志.md` 记录偏差。
7. 全部完成后，对照 `10-AI自检清单.md` 逐项自检。

## 7. 术语表

| 术语 | 说明 |
|------|------|
| WarHistoryStore | 本地战争历史记录仓库，位于 `app.js` |
| `client_id` | 本地生成的唯一标识，用于幂等去重 |
| `sync-out` | 本地状态同步到 Linear |
| `sync-in` | 从 Linear 拉取状态到本地 |
| `recordKill` | 记录任务完成（击杀） |
| `recordSync` | 记录同步事件 |
| `recordPomodoro` | 记录番茄钟事件 |

---

**下一步**：打开 `00-README.md`。
