# 开发日志 — 银河先遣队控制中心

> **用途**：给 AI（Kimi / Codex / GPT）看的开发记录  
> **更新频率**：每次有重大改动后追加  
> **阅读建议**：接手项目前先读 MEMORY.md，再扫一遍此文件的最新条目

---

## 2026-05-31 — v2.4 沉浸式舰船部署系统

### 新增的
- **部署弹窗**：点击部署按钮不再直接生成飞船，而是打开科幻风格创建面板
  - 舰型预览（飞船 SVG 图标 + 舰型名称）
  - 舰名输入（支持自定义，🎲 按钮随机生成 NATO 中文名）
  - 指挥官输入
  - 所属编队选择（第一特遣队 / 第二巡逻队 / 深空侦察队 / 机动打击群）
  - 部署扇区选择（α北天区 / β东天区 / γ西天区 / δ南天区）
  - WIP 消耗实时显示
- **部署动画**：从地球发射跃迁光束，飞船沿轨迹飞入目标扇区
  - `deploy-beam` 光束轨迹（scaleX 动画）
  - 飞船初始在地球位置，scale 0.2 + opacity 0
  - 1.6s cubic-bezier 平滑移动到目标位置
  - 到达时 warpFlash 闪光 + 引擎恢复正常
  - 完整动画时长约 1.7s
- **飞船数据扩展**：新增 `commander`（指挥官）和 `squadron`（所属编队）字段
- **详情面板扩展**：友方飞船详情新增指挥官和编队信息行（蓝色左边框）

### 暴露到全局
- `window.__game.openDeployModal(classType)`
- `window.__game.closeDeployModal()`
- `window.__game.randomDeployName()`
- `window.__game.selectDeploySector(btn)`
- `window.__game.confirmDeploy()`

---

## 2026-05-31 — v2.3.1 点击系统稳定性修复

### 修复的问题
- **双重事件绑定冲突**：`renderUnits()` 的 `layer.onclick` 事件委托 + `initMap()` 的 `stage.capture click` 同时存在，导致偶发重复触发或遗漏
  - 修复：移除 `layer.onclick`，改为每个飞船按钮直接内联 `onclick="window.__game.selectUnit('...')"`
- **threat-pulse 穿透误拖拽**：威胁圈是 `pointer-events:none`，pointerdown 事件穿透到 `#mapStage`，误开始拖拽
  - 修复：`pointerdown` 中用 `document.elementsFromPoint` 检查点击位置是否有飞船，有则直接 return 不开始拖拽
- **拖拽/点击冲突**：轻微移动鼠标后释放，click 事件仍然触发选中
  - 修复：`selectUnitAtPoint` 增加拖拽距离检测（`CLICK_DRAG_THRESHOLD = 6px`），pointerdown 和 click 之间移动超过 6px 不算点击
- **`unitFromPoint` 缩放阈值问题**：固定 44px 阈值在远距缩放下过小，导致点击空白处附近无法选中飞船
  - 修复：阈值改为 `44 / Math.max(map.zoom, 0.3)`，缩得越小阈值越大

### 紧急修复（点击完全失效）
- **根因**：内联 `onclick` + `selectUnitAtPoint` 的 `stopPropagation()` 产生冲突，且 `renderUnits` 重建 DOM 时内联事件处理器丢失
  - 修复：回滚到可靠的 `addEventListener` 事件委托（`layer._gvClickBound` 标志确保只绑定一次），移除所有内联事件处理器
  - `selectUnitAtPoint` 增加 `e.target.closest('.unit')` 检查，直接点击飞船时直接 return（让事件委托处理）

---

## 2026-05-31 — v2.3 战史系统（Combat Log + 统计面板）

### 新增的
- **WarHistoryStore**：localStorage 持久化战史记录
  - `recordKill(unit, wipEarned)` — 击沉时自动记录（飞船名/舰型/势力/位置/WIP）
  - `recordDeploy(ship)` — 部署时自动记录
  - `recordSync(added, removed)` — Linear 同步时自动记录新威胁/撤离
  - 统计：`totalKills`、`todayKills`、`todayWip`、`byFaction`
  - 最多保留 50 条记录，自动淘汰旧记录
- **战史面板 UI**：右侧面板新增"战史记录"区域（红色左边框）
  - 顶部统计行：今日击沉 / 总计 / 今日 WIP
  - 记录列表：时间线样式，彩色状态点区分事件类型
    - 红色点 = 击沉敌舰
    - 蓝色点 = 部署友舰
    - 黄色点 = 新威胁探测
    - 青色点 = 敌舰撤离
  - 今日记录时间高亮金色
- **自动记录时机**：
  - `completeMission()` → `WarHistoryStore.recordKill()` + `renderWarHistory()`
  - `deployShip()` → `WarHistoryStore.recordDeploy()` + `renderWarHistory()`
  - `StarshipSync.applyIncremental()` → `WarHistoryStore.recordSync()` + `renderWarHistory()`

### 暴露到全局
- `window.__game.WarHistoryStore` — 调试接口
- `window.__game.renderWarHistory` — 手动刷新面板

---

## 2026-05-31 — v2.2 飞船动画系统（rAF 游戏循环 + 轨道预留）

### 新增的
- **AnimationEngine**：`requestAnimationFrame` 驱动的游戏主循环
  - `start()/stop()` 控制循环生命周期
  - `warmCache()` 预热 DOM 引用，避免每帧 querySelector
  - `tick(now)`：计算 dt，更新所有飞船位置，刷新 DOM
- **敌方飞船自主移动**：
  - 逾期飞船持续向地球推进（速度 = `od * ADVANCE_RATE * 0.006`）
  - 推进到 `CRITICAL_DISTANCE` 内停止（不会重叠地球）
- **漂移系统（替代 CSS shipFloat）**：
  - 每艘飞船独立的正弦波漂移参数（phase/ampX/ampY/freq）
  - 选中时漂移幅度自动减小到 20%（聚焦感）
  - 友方漂移幅度 ×0.6（更稳重）
- **轨道系统预留接口**：
  - `registerOrbit(unitId, cx, cy, radius, speed)` — 单飞船圆形轨道
  - `registerFactionOrbit(faction, radius, speed)` — 批量按势力注册轨道
  - `unregisterOrbit(unitId)` / `clearAllOrbits()` — 清理
  - 轨道上的飞船位置 = `cx + cos(θ)*r, cy + sin(θ)*r`

### 改的
- **移除 CSS shipFloat**：`effects.css` 中的 `animation: shipFloat` 已注释掉，完全由 JS 驱动
- **transform 冲突解决**：CSS animation 和 JS rAF 不再抢 transform，统一由 AnimationEngine 控制

---

## 2026-05-31 — v2.1 Create星舰系统（实时同步引擎）

### 新增的
- **自动轮询同步**：`LinearAPI.startPolling(30000)`，每 30 秒自动拉取 Linear 数据
  - 连接成功后自动启动，断开/退出时自动停止
  - `sync()` 记录 `lastSyncTime` 时间戳
- **StarshipSync 差异检测引擎**：
  - `diff(oldIssues, newIssues)` → 返回 `{added, removed, changed}`
  - `createUnit(issue, index, usedNames)` → 从任务数据创建飞船对象
  - `applyIncremental()` → 增量同步入口，只更新变化的部分
- **丝滑入场动画**：新飞船从势力基地边缘跃迁到目标位置
  - `spawnAnimation(unit)`：创建 DOM + warpFlash 跃迁闪光 + CSS 过渡移动（1.4s cubic-bezier）
  - `is-spawning` 类触发 `spawnAppear` keyframe（缩放 0.2→1.12→1 + 模糊消失）
  - 威胁圈和尾迹同步淡入
- **平滑离场动画**：任务完成/取消时，`despawnAnimation()` 播放 `is-destroying` 收缩消失
- **属性变更追踪**：优先级、逾期状态等变化时，飞船自动平滑移动到新位置（1.5s 过渡）
- **同步 Toast 通知**：右下角 HUD 弹出 `+N 新威胁` / `-N 已清除` 提示
- **CSS 新增**：`spawnAppear`、`fadeInPulse`、`toastRise`、`syncPulse` keyframes

### 架构说明
- 全量同步（`syncLinearToGame`）仅在 boot / 手动连接时执行一次
- 轮询触发的增量同步不走 `renderUnits()` 全量刷新，直接操作 DOM
- `G._lastSyncedIssues` 保存上次同步的快照用于 diff

---

## 2026-05-31 — v4.0 大改版

### 改动的
- **任务详情面板完全重做**：删掉战斗力/补给/士气、删掉按钮、删掉纯展示型提示
  - 新增：任务卡片（彩色左边框）、倒计时条（距离截止/逾期）、标签 pills、任务描述预览（200字截断）、信息网格（截止日期+预估工时）
- **势力映射规则简化**：默认全部→地球联合政府，"野居"/创作→木星兵团，星际遗民备用
- **标题改造**：银河先遣队作战指挥台 → 银河先遣队控制中心，加 logo.png，英文统一 GALACTIC VANGUARD UNIT
- **删除元素**：战区控制度、第X作战日、防线告急、紧急战报叙事

### 修的 Bug
- **server.py 路径匹配**：`do_POST` 只匹配 `/api/linear` 精确路径，浏览器规范化后可能带斜杠 → 同时匹配 `/api/linear/`
- **server.py GET /api/config**：`fetch('/api/config')` 默认发 GET，但 handler 只在 `do_POST` 里 → 新增 `do_GET()` 处理
- **API Key 非 ASCII 字符**：`headers['X-Api-Key']` 含不可见字符导致 fetch 失败 → 新增 `cleanKey()` 过滤所有非打印 ASCII
- **绝对 URL**：`endpoint` 从相对路径 `'/'` 改为 `window.location.origin + '/api/linear'`，避免路径问题

---

## 2026-05-30 — v3.5 WIP 系统 + NATO 命名

### 新增的
- **WIP 工时系统**（Work In Progress Points）
  - 在线计时：每分钟 +1，每日上限 60
  - 击沉奖励：`estimate × 10`，streak 加成
  - 每日首杀 bonus：+50
  - 部署消耗：袭扰艇30 / 驱逐舰60 / 巡洋舰120 / 战列舰220 / 旗舰450
  - 科幻 HUD 时钟：地图右下角，HH:MM 格式，每日 00:00 清零
- **NATO 中文命名**：`名称-编号` 格式
  - 我方：猎户-7、阿尔法-12
  - 商业：翡翠-4、琥珀-9
  - 创作：脉冲星-3、新星-8
  - 杂务：疾风-7、暴风雨-2
- **手动舰队部署**：右侧面板"资源管理"区域，5 种舰型可选

### 改动的
- **纯展示型**：彻底取消回写 Linear，击沉只播动画
- **我方舰队不再自动生成**：Linear.done 不映射为巡逻舰，击沉敌舰不刷增援，全靠 WIP 手动部署
- **删除战区控制度面板**
- **势力介绍简化**：去掉 domain/role 文本

---

## 2026-05-29 — v3.0 视觉大升级

### 新增的
- GPT/Codex 做了视觉大改版
- 战术击沉效果（SIGNAL LOST + 十字锁定）
- 跃迁效果、引擎尾焰增强
- 势力光环、航道流动动画

---

## 需求 Backlog（下一步要做的事）

### 紧急 — 用户明确提出
- [ ] **音效系统**：击沉音效、警报音效、部署音效、背景氛围音
- [ ] **战役里程碑**：Linear Cycle 完成 → 大捷事件，连续 streak → 勋章/成就
- [ ] **势力映射手动修正**：详情面板里加一个下拉菜单，让用户手动改势力

### 重要 — 体验提升
- [ ] **战史时间线面板**：把 50 条记录做成可视化时间线（竖向，带势力色标记）
- [ ] **每日开局简报**：打字机动画播报今日任务概况（待办N个、逾期N个、推进中N个）
- [ ] **事件系统**：随机触发（太阳风暴影响航道、紧急求救信号、敌方增援情报）
- [ ] **舰队编队**：同类型舰可以编组，批量查看状态

### 一般 — 扩展性
- [ ] **移动端适配**：响应式布局，触摸拖拽，右侧面板可收起
- [ ] **离线缓存**：localStorage 缓存 Linear 数据，没网也能看地图
- [ ] **多 workspace 支持**：下拉选择不同的 Linear team
- [ ] **数据导出**：战史/统计导出 Markdown 或图片

---

## 技术债务

| 问题 | 优先级 | 说明 |
|------|--------|------|
| `server.py` 用 curl 子进程代理 | 中 | 历史遗留（macOS Python SSL bug），目前稳定但不够优雅 |
| `app.js` 1400+ 行单文件 | 中 | 逻辑集中在一文件，未来可考虑模块化拆分 |
| 增援舰队是假数据 | 低 | `spawnReinforcement()` 生成的舰只有占位标题，不对应真实 Linear 任务 |
| CSS 2200+ 行 | 低 | 视觉层和布局混在一起，可考虑拆分 |
| 无类型检查 | 低 | 纯原生 JS，无 TypeScript |

---

## 给 AI 的备注

### 接手此项目时请注意
1. **server.py 必须用 python3 启动**，不能直接用浏览器打开 HTML（`fetch` 需要 http 协议）
2. **强制刷新**：CSS/JS 改动后必须 `Cmd+Shift+R`，浏览器缓存很顽固
3. **API Key 位置**：`~/.gv_linear_key`（chmod 600），不是 localStorage
4. **势力映射在 `detectFaction()`**：修改规则时只改这一个函数
5. **WIP 数据在 `WIPStore`**：`localStorage` key 是 `gv_wip`，包含 total/todayOnline/killStreak/deployed
6. **命名池在 `NATO_NAMES`**：4 个势力的词库，修改时保持 `名称-编号` 格式
7. **面板 HTML 在 `renderDetail()`**：所有任务详情面板的 HTML 都在这里生成

### 常见坑
- `server.py` 的 `end_headers()` 重写了基类方法，会额外发送 CORS 头
- `app.js` 中的 `this.endpoint` 现在是函数 `() => window.location.origin + '/api/linear'`，不是字符串
- `cleanKey()` 会过滤掉所有非打印 ASCII（包括中文、emoji、零宽字符）
- 部署舰队的按钮在右侧面板"资源管理"区域，成本显示在按钮上
