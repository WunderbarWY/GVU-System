# 项目记忆 — 银河先遣队控制中心 (GVU System)

> **最后更新**：2026-05-29  
> **当前版本**：v4.1（用户版本号 v2.6）  
> **核心原则**：不点开是战棋，点开了是工作  
> **数据流向**：Linear 单向读取 → 游戏展示（不回写）

---

## 版本速览

| 版本 | 核心内容 |
|------|----------|
| v2.1 | 实时轮询同步 + 差异检测 + 丝滑入场/离场动画 |
| v2.2 | rAF 游戏循环 + 飞船自主移动 + 漂移系统 + 轨道预留 |
| v2.3 | 战史面板 + 持久化记录 + 自动统计 |
| v2.3.1 | 点击系统稳定性修复（事件委托重构） |
| v2.4 | 沉浸式舰船部署弹窗 + 自定义命名/指挥官/编队/扇区 + 跃迁光束动画 |
| v2.5 | 指挥官登录首页（打字机动画/Space跳过） + 卡顿紧急修复 |
| v2.6 | **系统性性能优化** + **舰船速度分级**：scanline transform 化、filter 动画移除、mix-blend-mode 清理、hover 节流、自动降级；漂移按舰船大小分级（小船轻快/大船庄重）

---

## 已完成功能

### 数据层
- [x] Linear GraphQL API 对接（单向读取，纯展示型）
- [x] `fetchIssues(first: 100)` → 敌军舰队映射
- [x] 自动连接：通过 `~/.gv_linear_key` + `/api/config` GET 接口
- [x] **自动轮询同步**（v2.1）：每 30 秒拉取 Linear，差异检测增量更新
- [x] ~~回写 Linear~~（已取消，v3.0 后改为纯展示型）
- [x] 势力映射规则 v2：
  - 默认全部 → 地球联合政府（egov）
  - "野居"字样 或 创作相关 → 木星兵团（jupiter）
  - 星际遗民（remnant）作为备用，不自动分配
- [x] 优先级映射：urgent→战列舰, high→巡洋舰, medium→驱逐舰, low→袭扰艇
- [x] 敌军反扑：逾期任务 → 向地球推进
- [x] 增援波次：逾期≥3 时自动生成增援舰

### WIP 工时系统
- [x] 在线时长：页面打开每分钟 +1 WIP，每日上限 60
- [x] 击沉奖励：`estimate × 10`，streak 加成（3 艘×1.2，5 艘×1.5）
- [x] 每日首杀 bonus：+50 WIP
- [x] 舰队部署消耗：袭扰艇30 / 驱逐舰60 / 巡洋舰120 / 战列舰220 / 旗舰450
- [x] WIP 数据 localStorage 持久化，每日 00:00 自动重置在线时长
- [x] 科幻 HUD 时钟：地图右下角，显示今日工作时长（HH:MM）+ WIP 总数 + Streak

### 命名系统
- [x] NATO 风格中文命名：`名称-编号` 格式
  - 我方：星座/希腊字母（猎户-7、阿尔法-12）
  - 商业：矿物（翡翠-4、琥珀-9）
  - 创作：天文现象（脉冲星-3、新星-8）
  - 杂务：气象（疾风-7、暴风雨-2）

### 视觉层
- [x] **指挥官登录首页**（v2.5）：全屏科幻登录页，logo 浮动 + 脉冲光环 + 扫描线 + 打字机欢迎动画
- [x] 加载画面（Logo + 进度条）
- [x] CRT 扫描线 + 暗角 vignette
- [x] 太阳系战役地图（SVG 航道 + Canvas 星空）
- [x] **飞船自主移动**（v2.2）：rAF 驱动，逾期飞船向地球推进，巡逻漂移替代 CSS shipFloat
- [x] 引擎尾焰
- [x] 势力光环（战区呼吸发光）
- [x] 战术击沉效果（锁定十字 + SIGNAL LOST）
- [x] 科幻 HUD（地图右下角角标面板，蓝色发光）
- [x] 标题栏：银河先遣队控制中心 + GALACTIC VANGUARD UNIT + logo
- [x] **跃迁光束部署动画**（v2.4）：从地球发射光束，飞船沿轨迹飞入扇区

### 交互层
- [x] 点击地图舰船 → 右侧面板显示任务详情
- [x] 任务详情面板 v2：任务卡片 + 倒计时条 + 标签 pills + 任务描述预览 + 信息网格
- [x] **友方详情扩展**（v2.4）：显示指挥官 + 所属编队
- [x] 地图缩放/拖拽/滚轮控制
- [x] 势力信息面板
- [x] **战史记录面板**（v2.3）：今日击沉/总计/今日WIP 统计 + 时间线记录
- [x] **部署弹窗**（v2.4）：舰名/指挥官/编队/扇区选择，非直接生成

### 实时同步（v2.1）
- [x] 30 秒自动轮询
- [x] 差异检测：`diff(oldIssues, newIssues)` → `{added, removed, changed}`
- [x] 新飞船跃迁入场动画（warpFlash + 平滑移动）
- [x] 任务完成/取消 → 离场动画
- [x] 同步 Toast 通知（右下角 HUD）

### 已删除的元素
- [x] ~~战区控制度面板~~
- [x] ~~战斗力/补给/士气进度条~~
- [x] ~~"完成任务" / "开始推进" 按钮~~
- [x] ~~"纯展示型"提示文案~~
- [x] ~~第 X 作战日 + 防线状态~~
- [x] ~~紧急战报叙事~~

---

## 已知问题 / 限制

| 问题 | 状态 | 说明 |
|------|------|------|
| Linear 连接偶发 HTML 错误 | 已修复 | server.py 已处理 trailing slash + GET /api/config，加 cleanKey 过滤 + 绝对 URL |
| **画面卡顿** | 已修复（v2.5） | renderUnits() 后无 warmCache() + driftMap 内存泄漏，已加缓存刷新 + Map 清理 |
| 增援舰队是假数据 | 已知 | `spawnReinforcement()` 生成的增援舰不对应真实 Linear 任务 |
| 势力映射纯启发式 | 已知 | 靠关键词匹配，可能误判 |
| 最多拉取100条任务 | 已知 | `first: 100` 硬编码，任务超多时需分页 |
| 无离线模式 | 已知 | 没网时无法使用，需考虑缓存策略 |
| 音效层未开始 | 待开发 | 用户有需求但还没动工 |
| 移动端未适配 | 待开发 | 目前只适配桌面端 |

---

## 下一步目标（按优先级）

### P0 — 近期必做
- [ ] **音效系统**：击沉音效、警报音效、部署音效、背景氛围音
- [ ] **战役里程碑/成就**：Linear Cycle 完成 → 大捷事件，连续击沉 streak → 勋章
- [ ] **势力映射 UI 微调**：让用户在详情面板里手动改势力

### P1 — 体验深化
- [ ] **战史时间线可视化**：把 50 条记录做成图表/时间轴
- [ ] **每日开局简报动画**：打字机效果播报今日任务概况
- [ ] **舰队编队系统**：同类型舰可以编组，批量查看
- [ ] **事件系统**：随机天气异常、紧急求救信号

### P2 — 扩展性
- [ ] **移动端适配**：响应式布局，触摸操作
- [ ] **离线缓存**：localStorage 缓存 Linear 数据
- [ ] **多 workspace 支持**
- [ ] **数据导出**：战史、统计导出为 Markdown/图片

---

## 技术架构

```
前端（纯静态）
  ├── index.html      # DOM 结构（~280行）
  ├── styles.css      # 视觉基础 + 面板样式（~2200行）
  ├── effects.css     # 特效层（~700行）
  ├── app.js          # 核心逻辑引擎（~2500行）
  ├── logo.png        # GVU Logo
  └── assets/ships/   # 飞船素材（PNG + JSON，用户自添加）

代理（Python）
  └── server.py       # 静态文件 + /api/linear POST代理 + /api/config GET

数据流
  Browser → fetch(http://localhost:5180/api/linear) → server.py → curl → Linear API
  Browser → fetch(http://localhost:5180/api/config) → server.py → ~/.gv_linear_key
```

### 关键代码入口

| 功能 | 函数 | 文件 |
|------|------|------|
| 同步 Linear 数据 | `LinearAPI.sync()` | app.js |
| 映射到游戏单位 | `syncLinearToGame()` | app.js |
| 敌军推进 | `processAdvance()` | app.js |
| 击沉敌舰（本地） | `completeMission()` | app.js |
| WIP 计时器 | `startWipTimer()` | app.js |
| **舰队部署（弹窗）** | `openDeployModal()` → `confirmDeploy()` | app.js |
| 战报生成 | `generateReport()` | app.js |
| 任务详情面板 | `renderDetail()` | app.js |
| 战术击沉效果 | `tacticalStrike()` | app.js |
| **实时同步引擎** | `StarshipSync.applyIncremental()` | app.js |
| **动画引擎** | `AnimationEngine.tick()` | app.js |
| **战史系统** | `WarHistoryStore.recordKill()` | app.js |
| **登录首页** | `doLogin()` → `typeWriter()` → `finishLogin()` | app.js |

---

## 性能关键

### v2.6 深度优化（系统性修复）
- **scanline 动画**：`top` 属性动画 → `transform: translateY()`，消除每帧布局重排（layout thrashing）
- **太阳 filter 动画移除**：`.sun` 的 `@keyframes stellarPulse` 不再改变 `filter: saturate/contrast/brightness`，这是星球闪烁的根本原因
- **太阳 corona 简化**：移除 `::before` 的 `filter: blur(10px)` + conic-gradient 旋转动画，改为静态 radial-gradient
- **mix-blend-mode 全面清理**：移除 `.routes`、`.ship-glyph`、`.tactical-strike`、`.map-stage::before` 等 6 处 `mix-blend-mode: screen`，减少合成层开销
- **enginePulse 移除 blur**：`filter: blur()` 动画极昂贵，已移除
- **deploy-backdrop 移除 backdrop-filter**：`blur(6px)` 开销大
- **strategic-grid 移除 mask-image**：某些浏览器下 mask-image 渲染昂贵
- **hover 检测 rAF 节流**：`pointermove` 中 `unitFromPoint()` 的 `getBoundingClientRect()` 每帧触发强制同步布局 → 改为 `requestAnimationFrame` 节流
- **AnimationEngine.updateDOM() 精确写**：CSS 变量（--ship-heading、--motion-opacity 等）只在值变化时才 setProperty；left/top 只在位置变化 > 0.001% 时才写
- **PerformanceMonitor 自动降级**：FPS < 25 时自动暂停 scanline/route 动画；FPS < 38 时暂停 corona 旋转；FPS > 55 时恢复
- **GPU 层稳定**：`.sun`、`.planet` 添加 `will-change: transform` + `backface-visibility: hidden`，防止合成层闪烁

### v2.5 及之前的性能记录
- **AnimationEngine.elCache**：DOM 引用缓存，避免每帧 querySelector
- **warmCache() 调用时机**：`renderUnits()` 重建 DOM 后**必须**调用，否则每帧 N×3 次 querySelector 导致严重卡顿
- **driftMap/orbitMap 清理**：`warmCache()` 中自动清理已不存在的 unitId，防止内存泄漏

---

## 用户决策记录

- **视觉主基调**：深空冷调 + 霓虹点缀
- **游戏层 ↔ 任务层分离**：地图上永远看不到工作词汇，点开才是 Linear 原文
- **纯展示型**：v3.0 后取消回写，游戏内操作不同步到 Linear
- **WIP 工时系统**：打开页面积累工时，击沉敌舰赚 WIP，花 WIP 部署我方舰
- **势力映射 v2**：默认 egov，创作/野居→jupiter，remnant 备用不自动分配
- **NATO 中文命名**：保留 NATO 的 "Name-Number" 风格，但用中文词
- **自动连接**：通过 `~/.gv_linear_key` 文件（server.py 读取），而非 localStorage（跨端口隔离）
- **部署流程**：必须经弹窗确认（舰名/指挥官/编队/扇区），不能直接生成
- **登录首页**：首屏必须是登录页，打字机欢迎动画，Space 跳过
- **性能优先于特效**：filter 动画、mix-blend-mode、backdrop-filter 等 GPU 杀手必须评估后再加入；新功能默认走 `PerformanceMonitor` 审查
- **舰船速度分级**：漂移速度必须按舰船量级区分 — 袭扰艇最快（amp~0.09/freq~0.12），旗舰几乎静止（amp~0.02/freq~0.04），demo traffic 的 orbit/route 速度同步降低约 60%

---

## 快速启动

```bash
cd ~/Documents/Codex/2026-05-29/kimi-kimi-linear-api-linear-linear
python3 server.py
# 浏览器打开 http://localhost:5180
# API Key 已写入 ~/.gv_linear_key，页面自动连接
```

---

## GitHub

https://github.com/WunderbarWY/GVU-System
