# TODO — GVU 战争历史系统改造任务看板

执行者每完成一个任务，将 `[ ]` 改为 `[x]`。遇到偏差时，同步更新 `99-执行偏差日志.md`。

---

## Phase -1: 环境验证

- [x] 检查项目根目录可访问性
- [x] 确认 `app.js` 存在
- [x] 确认 `src/api/supabase.js` 存在
- [x] 确认 `supabase/migrations/20260617000000_initial_schema.sql` 存在
- [x] 检查 Supabase CLI 可用性
- [x] 检查 Pinme 部署工具可用性

---

## Phase 0: Schema 更新

- [x] 检查 `war_history` 现有列
- [x] 确认/新增 `client_id TEXT UNIQUE` 列
- [ ] 应用 migration 到本地/远程数据库
- [x] 验证列存在

---

## Phase 1: 修复 recordPomodoro + recordSync

- [x] 修改 `recordPomodoro` 函数签名与内部实现
- [x] 修复 `added`/`removed` 未定义问题
- [x] 修改 `recordSync` 函数，调用 `_syncRecord`
- [x] 验证两个函数不抛错且尝试同步

---

## Phase 2: Linear done → recordKill 集成

- [x] 修改 `StarshipSync.applyIncremental` 检测 done 状态变化
- [x] 修改 `WarHistoryStore.recordKill` 支持 `source: 'linear'`
- [x] 确保同一 missionId 不重复生成 kill
- [x] 验证 Linear done 触发 recordKill

---

## Phase 3: 幂等性 + 离线队列

- [x] 修改 `_syncRecord` 使用 `client_id` 上传
- [x] 在 `src/api/supabase.js` 补充 `upsert` 封装
- [x] 新增 `_enqueue` / `_dequeue` / `_loadQueue` / `_saveQueue`
- [x] 新增 `flushQueue` 函数
- [x] 在 `online` 事件与页面加载时调用 `flushQueue`
- [x] 验证幂等 upsert 不产生重复行
- [x] 验证离线队列与恢复同步

---

## Phase 4: UI 修复

- [x] 修复 `renderCampaign` 字段映射（time/shipName/desc）
- [x] 修复 `renderWarHistory` 字段映射
- [x] 移除/替换 `G.warHistory` 中 `type: 'victory'` 写入
- [x] 保持旧读取兼容
- [x] 验证 UI 不显示 undefined 或错位

---

## Phase 5: 测试

- [x] 新增 `tests/war-history.test.js`（或项目约定目录）
- [x] 编写 `recordKill` 测试
- [x] 编写 `recordPomodoro` 测试
- [x] 编写 `recordSync` 测试
- [x] 编写幂等性测试
- [x] 编写离线队列测试
- [x] 编写 UI 渲染测试
- [x] 运行测试并修复失败项

---

## Phase 6: 部署

- [x] 检查并修改 Edge Function（如需要）
- [ ] 本地 serve 验证 Edge Function
- [ ] 部署 Edge Function（如需要）
- [x] 构建前端
- [ ] 部署到 Pinme
- [ ] 确认线上可访问

---

## Phase 7: 验证

- [ ] 手动完成 mission 验证 war history
- [ ] Linear 完成 issue 验证 war history
- [x] 重复触发验证幂等
- [x] 离线恢复验证队列
- [x] 验证战役时间线
- [x] 验证情报面板
- [x] 运行全部测试
- [ ] 完成 `10-AI自检清单.md` 全部勾选

---

## 文档维护

- [x] 更新 `TODO.md` 状态
- [x] 记录所有偏差到 `99-执行偏差日志.md`
- [ ] 完成最终总结
