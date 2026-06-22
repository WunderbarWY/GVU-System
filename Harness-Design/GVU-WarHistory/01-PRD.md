# 01-PRD — 战争历史系统产品需求文档

## 1. 目标

让 GVU 的战争历史系统能够完整、可靠、幂等地记录每一次任务完成与同步事件，并在 UI 中正确展示；同时具备离线恢复能力，最终通过自动化测试验证。

## 2. 功能需求

### FR-1 完整记录任务完成

无论是用户在游戏中手动点击完成，还是在 Linear 中将 issue 标记为 done，系统都必须生成一条 `kill` 类型的战争历史记录。

### FR-2 可靠同步到 Supabase

每条记录必须被持久化到 Supabase `war_history` 表。同步失败时必须有重试与离线队列机制。

### FR-3 幂等去重

同一任务完成事件不得被记录两次。使用 `client_id` 作为本地生成的唯一键，云端按 `client_id` 去重。

### FR-4 离线支持

当浏览器处于离线状态或 Supabase 不可达时，记录进入本地队列；网络恢复后自动按序同步。

### FR-5 UI 正确展示

战役时间线（`renderCampaign`）与情报面板（`renderWarHistory`）必须正确显示时间、标题、描述、飞船名称等字段。

### FR-6 修复现有 bug

- `recordPomodoro` 不再引用未定义变量。
- `recordSync` 调用 `_syncRecord`。
- `renderCampaign` 字段映射正确。
- `G.warHistory` 不再使用未同步的 `type: 'victory'`。

### FR-7 测试覆盖

为核心函数（`recordKill`、`recordSync`、`recordPomodoro`、离线队列、幂等去重、UI 渲染）新增测试。

## 3. 用户故事

### US-1 作为玩家，我希望在游戏中点击完成任务后，战争历史立即显示一次击杀

**验收标准**：
- 点击完成后，`WarHistoryStore.records` 增加一条 `type: 'kill'` 记录。
- 记录包含 `clientId`、`missionId`、`shipName`、`time`、`desc`。
- 网络正常时，Supabase `war_history` 表在 5 秒内出现对应行。

### US-2 作为玩家，我希望在 Linear 中标记 issue 完成后，游戏中也能记录击杀

**验收标准**：
- `StarshipSync.applyIncremental` 拉取到状态为 `done` 的 issue 时，调用 `WarHistoryStore.recordKill`。
- 该击杀与手动完成的击杀在数据结构上完全一致。
- 不生成多余的 `sync-out` / 敌方撤退记录。

### US-3 作为玩家，我不希望同一任务被记录两次

**验收标准**：
- 重复调用 `recordKill` 同一 `missionId` 仅生成一条云端记录。
- 网络超时重试时，Supabase 中不会产生重复行。
- UI 中时间线不显示重复条目。

### US-4 作为玩家，我希望离线时完成的战斗不会丢失

**验收标准**：
- 离线状态下完成 mission，`recordKill` 先将记录写入 `localStorage` 队列。
- 网络恢复后，系统自动将队列中的记录同步到 Supabase。
- 同步成功后从队列移除。

### US-5 作为玩家，我希望战役时间线展示正确的信息

**验收标准**：
- 时间线显示真实时间、飞船名称、任务描述。
- 不出现 `undefined` 或字段错位。
- `victory` 类型不再单独展示。

## 4. 数据模型

### 4.1 本地记录（camelCase）

```js
{
  clientId:    'uuid-string',      // 本地生成，幂等键
  type:        'kill' | 'deploy' | 'pomodoro' | 'sync',
  missionId:   'linear-issue-id',  // kill/sync 时必填
  shipName:    '飞船名称',          // UI 展示
  time:        1718900000000,      // 时间戳 ms
  desc:        '描述文本',
  metadata:    { source: 'manual' | 'linear', syncType: 'in' | 'out', ... },
  synced:      false               // 是否已同步到云端
}
```

### 4.2 云端表（snake_case）

参考 `supabase/migrations/20260617000000_initial_schema.sql` 中的 `war_history` 表：

```sql
CREATE TABLE war_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   TEXT UNIQUE NOT NULL,  -- 新增/确认存在，用于幂等
  user_id     UUID REFERENCES auth.users(id),
  type        TEXT NOT NULL,
  mission_id  TEXT,
  ship_name   TEXT,
  time        BIGINT,
  description TEXT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

如 `client_id` 列不存在，需在 Phase 0 新增。

## 5. 非功能性需求

### NFR-1 性能
- 本地记录操作必须在 50ms 内完成。
- 批量同步队列时，每次最多发送 50 条。

### NFR-2 可靠性
- 同步失败至少重试 3 次，间隔指数退避（1s、2s、4s）。
- 队列持久化到 `localStorage`，刷新页面不丢失。

### NFR-3 兼容性
- 保持 `app.js` 现有函数签名不变，必要时新增可选参数。
- 不影响其他模块（地图渲染、Linear 同步等）。

## 6. 验收标准总览

| 编号 | 标准 | 验证方式 |
|------|------|----------|
| AC-1 | 手动完成任务生成 kill 记录 | 单元测试 + 手动点击 |
| AC-2 | Linear done 触发 recordKill | 单元测试模拟 + 实际同步 |
| AC-3 | 重复 missionId 只生成一条云端记录 | 幂等测试 |
| AC-4 | 离线记录进入队列并恢复同步 | 离线模拟测试 |
| AC-5 | 时间线字段正确 | UI 测试/手动检查 |
| AC-6 | 所有新增/修改测试通过 | 测试命令 |
| AC-7 | 部署后功能正常 | 线上验证 |

## 7. 边界条件

- 同一 `missionId` 手动完成后再在 Linear 中完成：只生成一条 kill。
- Linear 已完成 issue 被重新打开再完成：是否生成新 kill 由 `clientId` 与 `time` 决定；同一 `missionId` 仍只一条。
- `recordPomodoro` 传入空参数：优雅降级，不崩溃。
- `recordSync` 在离线时：进入队列，不抛错。

## 8. 不在本次范围

- 战争历史的高级筛选/搜索。
- 历史记录的删除/编辑功能。
- 多用户共享历史。
- 数据迁移脚本（旧 `victory` 记录如需保留，仅做读取兼容）。

---

**下一步**：`03-平台适配决策树.md`。
