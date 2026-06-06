# GVU System — 项目术语库 (Project Terminology)

> **定位**：本文档是 GVU System 的「领域语言词典」。任何参与本项目的 agent 在修改代码前，应通读此文档以建立统一语境。代码量 11,500+ 行，自定义概念超过 200 个，没有统一术语库极易跑偏。
>
> **版本**：v1.0 ｜ **最后更新**：2026-05-29 ｜ **对应代码版本**：`?v=pomodoro-21`

---

## 目录

1. [核心隐喻与架构](#1-核心隐喻与架构)
2. [游戏世界观术语](#2-游戏世界观术语)
3. [核心数据模型](#3-核心数据模型)
4. [全局常量与配置](#4-全局常量与配置)
5. [核心函数清单](#5-核心函数清单)
6. [子系统对象 API](#6-子系统对象-api)
7. [CSS 类名体系](#7-css-类名体系)
8. [DOM ID 体系](#8-dom-id-体系)
9. [状态与枚举](#9-状态与枚举)
10. [安全化工具](#10-安全化工具)
11. [命名约定](#11-命名约定)
12. [关键工程认知](#12-关键工程认知)

---

## 1. 核心隐喻与架构

GVU = **Galactic Vanguard Unit（银河先遣队）**。本质上是一个把 Linear 任务映射成星际战棋的任务管理系统。

| 概念 | 游戏层（用户看到的） | 任务层（Linear 数据） |
|------|---------------------|----------------------|
| 敌军舰队 | 地图上漂浮的舰船图标 | Linear 中未完成的 issue |
| 击沉敌舰 | 点击舰船 → 弹出详情 → 标记完成 | 将 Linear issue 设为 done |
| 舰船类型（旗舰/战列舰/巡洋舰…） | 视觉大小和威胁圈 | Linear priority（urgent/high/medium/low） |
| 敌军向地球推进 | 逾期天数越长，舰船越靠近中心 | 截止日期已过 |
| WIP 工时 | 游戏内货币，右下角 HUD 显示 | 在线时长 + 击沉奖励 + 番茄钟 |
| 巡航 / 番茄钟 | 25 分钟倒计时，HUD 显示 | PomodoroTimer 专注计时 |
| 势力（地球联合政府/木星兵团…） | 颜色和航道 | Linear 标签/项目/标题关键词自动识别 |
| 中立舰船 | 背景交通，不参与交战 | 纯装饰性，增强沉浸感 |

**双层映射原则**：游戏层 ←→ 任务层双向独立。游戏层的视觉表现（位置、漂移、特效）不依赖任务层的数据变更频率。

---

## 2. 游戏世界观术语

### 2.1 势力（Factions）

| 术语 | 代码标识 | 颜色 | 命名池 | 控制区域 |
|------|---------|------|--------|---------|
| 银河先遣队 | `vanguard` | `#4da3ff`（蓝） | 希腊字母 + 星座名 | 地球、水星周围航道 |
| 地球联合政府 | `egov` | `#17d7b6`（青绿） | 矿物/宝石名 | 月球、金星周围航道 |
| 木星兵团 | `jupiter` | `#ffd251`（金黄） | 天文/天体名 | 木星、土星航道 |
| 星际遗民 | `remnant` | `#ff3f52`（暗红） | 气象/灾难名 | 冥王星、无人航道 |

势力单字母编码：`V`（vanguard）、`E`（egov）、`J`（jupiter）、`R`（remnant），用于生成舰船编码如 `V-001`、`E-006`。

### 2.2 舰船类型（Ship Classes）

| 中文 | 代码标识 | 地图尺寸(px) | 威胁半径 | 战力基准 | 对应优先级 |
|------|---------|-------------|---------|---------|-----------|
| 旗舰 | `flagship` → 归一化为 `dreadnought` | 72 | 150 | 90 | —（仅玩家部署） |
| 无畏舰 | `dreadnought` | 72 | 150 | 90 | `urgent` |
| 战列舰 | `battleship` | 60 | 125 | 80 | `urgent` |
| 母舰 | `carrier` → 归一化为 `cruiser` | 50 | 112 | 70 | — |
| 巡洋舰 | `cruiser` | 50 | 94 | 65 | `high` |
| 驱逐舰 | `destroyer` | 42 | 72 | 50 | `medium` |
| 护卫舰 | `frigate` | 34 | 64 | 44 | —（演示用） |
| 袭扰艇 | `raider` | 28 | 54 | 35 | `low` |

> **归一化规则**：`flagship` → `dreadnought`，`carrier` → `cruiser`。由 `normalizeShipClass(cls)` 处理。原因：SHIP_CLASSES 和 MAP_SHIP_SIZES 只定义了归一化后的键。

### 2.3 中立舰船类型（Neutral Units）

| 类型 | 代码 | 标签 | 颜色 | 舰名来源 | 名称限制 |
|------|------|------|------|---------|---------|
| 货运舰 | `cargo` | 货运舰 | `#8aa8c4` | 世界城市名 | 不限 |
| 客运舰 | `passenger` | 客运舰 | `#c4a86b` | 航空公司名 | 限 2 汉字 |
| 补给舰 | `supply` | 补给舰 | `#6bc49a` | 植物名 | 限 3 汉字 |

中立舰船特点：不参与交战、不属于任何势力、归属某个星球（`planetIndex`）、在 `#neutralLayer` 独立渲染。

### 2.4 天体/地名（Planets）

| 名称 | 坐标(x,y) | 势力关联 | 特殊 |
|------|----------|---------|------|
| 水星前哨 | (36, 50) | vanguard | — |
| 金星航道 | (76, 22) | egov | — |
| 地球司令部 | (22, 47) | vanguard | 玩家基地，最大 |
| 月球封锁线 | (50, 38) | egov | — |
| 木星船坞 | (85, 63) | jupiter | 最大 |
| 土星议庭 | (55, 82) | jupiter | 有光环 `ring: true` |
| 冥王星暗港 | (13, 88) | remnant | — |

坐标系：百分比 0–100，`x` 向右，`y` 向下。`distToEarth(x, y)` 计算与 `CONFIG.EARTH` 的欧氏距离。

### 2.5 部署扇区（Sectors）

玩家部署舰队时可选择的区域：水星走廊、金星前线、木星航道、冥王星外围。

### 2.6 其他概念

| 术语 | 含义 |
|------|------|
| WIP | Work In Progress Points，游戏内货币/积分 |
| 巡航 | PomodoroTimer 的番茄钟专注模式，25/15/45/60 分钟可选 |
| Streak | 连续击沉敌舰的连击计数，影响 WIP 收益倍率 |
| 跃迁 (Warp) | 新单位出现时的闪光特效，旧单位消失时的淡出 |
| 威胁圈 | 敌方单位周围的脉冲圆环 `.threat-pulse` |
| 引擎尾焰 | 舰船底部的动态火焰 `.engine-flame` |
| 战术锁定 | 点击舰船时出现的坐标锁定动画 `.coordinate-lock` |
| 雷达 | 势力控制区域的圆形遮罩层 `#radarLayer` |
| 战史 (War History) | 持久化存储的战斗记录与统计，存于 `localStorage` |
| 深空航道 | `planetIndex === -1` 的中立单位归属描述 |

---

## 3. 核心数据模型

### 3.1 G — 全局状态对象

```javascript
const G = {
  turn: 5,              // 当前作战日计数
  units: [],            // Unit[] — 所有作战单位
  neutrals: [],         // NeutralUnit[] — 中立背景交通单位
  warHistory: [],       // object[] — 当前会话的战史记录（内存级）
  selectedId: null,     // string|null — 当前选中单位的 ID
  stats: {              // 击杀/任务/连胜统计
    kills: 0,
    missions: 0,
    streak: 0,          // 当前连击
    maxStreak: 0,       // 历史最高连击
  },
};
```

### 3.2 Unit — 作战单位对象

```javascript
{
  id: 'E-006',              // 单位编码
  name: '翡翠',             // 舰名（NATO_NAMES 随机生成）
  shipClass: 'battleship',  // 舰船类型（已归一化）
  faction: 'egov',          // 所属势力
  x: 65.4,                  // 地图 X 坐标（百分比）
  y: 32.1,                  // 地图 Y 坐标（百分比）
  status: 'stationed',      // 状态（见 §9.1）
  advanceDist: 42.3,        // 与地球的距离
  power: 80,                // 战斗力
  supply: 87,               // 补给值 0–100
  morale: 72,               // 士气值 0–100
  mission: { ... },         // Mission 对象（见 §3.3）
  commander: '张三',         // 指挥官（仅玩家舰队）
  squadron: '第一特遣队',     // 所属编队（仅玩家舰队）
  isDemoTraffic: false,     // 是否为演示假数据
  isPermanent: false,       // 是否为永久旗舰（不对应 Linear，不可删去）
  deployedAt: '2026-05-29', // 手动部署日期（仅 permanent）
  motion: { ... },          // 特殊运动轨迹（轨道/航道）
  _driftX: 0.5,             // 当前帧 X 漂移偏移（内部）
  _driftY: -0.3,            // 当前帧 Y 漂移偏移（内部）
  _renderX: 65.4,           // 上一帧实际渲染 X（内部）
  _renderY: 32.1,           // 上一帧实际渲染 Y（内部）
  _lastHeading: '45deg',    // 上一帧朝向字符串（内部，CSS 变量）
  _headingVelocityX: 0,     // heading 平滑速度 X（内部）
  _headingVelocityY: 0,     // heading 平滑速度 Y（内部）
  _headingDeg: 0,           // 平滑后的朝向角度（内部）
}
```

### 3.3 Mission — 任务对象（映射 Linear Issue）

```javascript
{
  linearId: 'LIN-101',      // Linear 原始任务标识符
  title: '商业合作提案定稿',
  priority: 'urgent',       // urgent/high/medium/low
  due: '2026-05-29',        // 截止日期（ISO 日期字符串）
  status: 'in_progress',    // todo/in_progress/backlog/done/canceled
  estimate: 5,              // 预估工时点数
  labels: ['商业'],          // 标签数组
  overdue: 3,               // 逾期天数（由 daysOverdue 计算）
  description: '...',       // 任务描述（HTML 已清洗）
}
```

> **关键字段 `linearId`**：这是连接游戏层与 Linear 任务层的唯一桥梁。`selectByMission()` 和 `findUnitByMissionRef()` 都通过此字段匹配。注意：API 数据用 `issue.id`（GraphQL 内部 ID），模拟数据用 `issue.identifier`（LIN-101 格式），代码中用 `i.linearId || i.id` 兼容两者。

### 3.4 NeutralUnit — 中立单位对象

```javascript
{
  id: 'NEU-001',            // 编码前缀 NEU
  name: '纽约',              // 随机生成的舰名
  type: 'cargo',            // cargo/passenger/supply
  label: '货运舰',           // 显示标签
  color: '#8aa8c4',         // 单位颜色
  size: 34,                 // 地图显示尺寸（px）
  planetIndex: 2,           // 归属行星索引（-1 为深空）
  baseX: 22.0,              // 基础锚点 X
  baseY: 47.0,              // 基础锚点 Y
  driftPhase: 1.23,         // 漂移相位
  driftAmpX: 0.5,           // X 漂移振幅
  driftAmpY: 0.3,           // Y 漂移振幅
  driftFreq: 0.4,           // 漂移频率
}
```

### 3.5 map — 地图变换状态

```javascript
const map = {
  zoom: 0.22,       // 当前缩放（默认 MAP_DEFAULT_ZOOM）
  panX: 0,          // X 平移（px）
  panY: 0,          // Y 平移（px）
  dragging: false,  // 是否正在拖拽
  sx: 0, sy: 0,     // 拖拽起始屏幕坐标
  ox: 0, oy: 0,     // 拖拽起始时的 panX/panY
  hoverId: null,    // 当前 hover 的单位 ID
  frame: 0,         // rAF 帧 ID（节流用）
};
```

> **核心认知**：`#mapWorld` 有 `left:50%; top:50%; transform:translate(-50%,-50%)`，意味着其中心始终对准父元素中心。`panX/panY` 只需在此基础上做 `(世界中心 - 目标位置) × zoom` 的补偿。这是 `focusOnUnit()` 坐标公式的理论基础。

---

## 4. 全局常量与配置

### 4.1 CONFIG

| 键 | 值 | 含义 |
|----|-----|------|
| `EARTH` | `{x:25, y:48}` | 地球坐标（百分比） |
| `ADVANCE_RATE` | `2.5` | 敌军每日推进速率 |
| `CRITICAL_DISTANCE` | `15` | 临界距离（单位靠近地球的阈值） |
| `MAX_HISTORY` | `50` | 最大战史记录条数 |
| `FACTION_COLORS` | `{vanguard:'#4da3ff',...}` | 各势力 HEX 色值 |

### 4.2 舰型与渲染常量

| 常量 | 类型 | 说明 |
|------|------|------|
| `SHIP_CLASSES` | object | 舰型定义：`{label, size, threat, powerBase}` |
| `MAP_SHIP_SIZES` | object | 地图渲染尺寸（px），键为归一化后舰型 |
| `MAP_MOTION_SPEED_SCALE` | `1/16` | 动画速度缩放系数 |
| `DRIFT_PROFILES` | object | 各舰型漂移参数：`{ampBase, ampVar, freqBase, freqVar}` |
| `NATO_NAMES` | object | 各势力舰名命名池（4 组中文词库） |
| `NEUTRAL_CONFIG` | object | 中立舰船配置：`{cargo, passenger, supply}` |
| `WAR_TEMPLATES` | object | 战报模板：`{morning, victory, advance, critical, calm}` |
| `PLANETS` | array | 天体数组：`{name, x, y, size, color, glow, ring}` |
| `DEPLOY_COSTS` | object | 部署各舰型所需 WIP：`{raider:30, destroyer:60, cruiser:120, battleship:220, flagship:450}` |
| `WAR_ZONES` | array | 交战区配置：`{name, x, y, radius, faction, importance}` |
| `EXTRA_ROUTES` | array | 额外 SVG 航道路径数据 |

### 4.3 地图常量

| 常量 | 值 | 说明 |
|------|-----|------|
| `MAP_DEFAULT_ZOOM` | `0.22` | 默认缩放 |
| `MAP_MIN_ZOOM` | `0.14` | 最小缩放 |
| `MAP_MAX_ZOOM` | `2.4` | 最大缩放 |
| `CLICK_DRAG_THRESHOLD` | `6` | 拖拽与点击的像素阈值 |

### 4.4 localStorage 键名（全部 `gv_` 前缀）

| 键名 | 存储内容 | 所属子系统 |
|------|---------|-----------|
| `gv_wip` | WIP 工时数据 | WIPStore |
| `gv_war_history` | 战史记录 | WarHistoryStore |
| `gv_pomodoro` | 番茄钟状态 | PomodoroTimer |
| `gv_pomodoro_settings` | 番茄钟设置（时长） | PomodoroTimer |
| `gv_linear_key` | API Key | LinearAPI |
| `gv_linear_sync` | 最后同步时间戳 | LinearAPI |
| `gv_perf_mode` | 性能模式 | PerformanceMonitor |
| `gv_panel_width` | 左侧面板宽度 | initPanelResize |

---

## 5. 核心函数清单

### 5.1 工具函数

| 函数 | 签名 | 功能 |
|------|------|------|
| `rand` | `(n) => int` | `[0, n)` 随机整数 |
| `pick` | `(a) => any` | 从数组随机取一个元素 |
| `clamp` | `(v, lo, hi) => number` | 数值限制在范围内 |
| `distToEarth` | `(x, y) => number` | 计算与 `CONFIG.EARTH` 的欧氏距离 |
| `daysOverdue` | `(dateStr) => number` | 计算逾期天数（正数=已逾期，0=今天，负数=未到期） |
| `daysUntil` | `(dateStr) => number` | 计算距截止日剩余天数 |
| `cleanKey` | `(key) => string` | 清洗 API Key，去除非 ASCII 字符 |
| `cssEscape` | `(value) => string` | **安全化** CSS 选择器字符串转义（完整实现，非原生的仅转义 `"/\``） |
| `usedShipNames` | `() => Set` | 提取 `G.units` 中所有已用舰名，消除重复代码 |
| `safeLS.get` | `(key, fallback) => any` | **安全化** localStorage.getItem 的 try-catch 包装 |
| `safeLS.set` | `(key, value) => bool` | **安全化** localStorage.setItem |
| `safeLS.remove` | `(key) => bool` | **安全化** localStorage.removeItem |
| `safeLS.getJSON` | `(key, fallback) => any` | **安全化** getItem + JSON.parse |
| `safeLS.setJSON` | `(key, value) => bool` | **安全化** JSON.stringify + setItem |

### 5.2 舰船生成

| 函数 | 功能 |
|------|------|
| `genShipName(faction, used)` | 按势力从 NATO_NAMES 生成唯一舰名 |
| `genCode(faction, idx)` | 生成单位编码，如 `V-001`、`E-006` |
| `normalizeShipClass(cls)` | 归一化舰型：`flagship→dreadnought`，`carrier→cruiser` |
| `shipMapSize(cls)` | 获取地图渲染尺寸（基于归一化舰型） |
| `priorityToClass(p)` | Linear priority → 舰型映射：`urgent→battleship`，`high→cruiser`，`medium→destroyer`，`low→raider` |
| `spawnZone(faction, priority, status)` | 计算单位出生区域（基于势力领土） |
| `routeMotion(points, speed, progress, offsetX, offsetY)` | 构造航道运动数据 |
| `orbitMotion(cx, cy, rx, ry, speed, angle)` | 构造轨道运动数据 |
| `sampleRoute(points, progress)` | 按进度采样航道坐标 |

### 5.3 渲染与交互

| 函数 | 功能 |
|------|------|
| `drawStarfield()` | 绘制星空背景 Canvas |
| `renderPlanets()` | 渲染天体标记 `#celestialBodies` |
| `renderFactions()` | 渲染势力列表 `#factions` |
| `shipIcon(cls)` | 返回舰船 SVG 图标字符串（新版） |
| `legacyShipIcon(cls)` | 返回舰船 SVG 图标字符串（旧版 fallback） |
| `neutralIcon(type)` | 返回中立舰船 SVG 图标字符串 |
| `spawnNeutralUnits()` | 生成中立背景交通单位，写入 `G.neutrals` |
| `makeNeutralUnit(...)` | 构造单个 NeutralUnit 对象 |
| `renderNeutrals()` | 渲染中立单位 DOM → `#neutralLayer` |
| `renderUnits()` | 渲染所有作战单位 DOM → `#unitLayer` |
| `renderBriefing()` | 渲染左侧任务简报面板 `#dailyBrief` |
| `briefRow(t, color, label)` | 生成简报行 HTML |
| `renderDetail(id, animate)` | 渲染右侧单位详情面板 `#unitDetail` |
| `renderNeutralDetail(n)` | 渲染中立单位详情（防 `PLANETS[-1]` 崩溃） |
| `renderWarHistory()` | 渲染战史记录面板 `#warHistoryDisplay` |
| `selectUnit(id)` | 选中单位，更新 `G.selectedId`，播放选中动画 |
| `selectByMission(missionRef)` | **任务栏点击链路**：通过 Linear ID 定位 → 切 tab → `selectUnit` → `focusOnUnit` |
| `findUnitByMissionRef(ref)` | 按 `mission.linearId` 或 `mission.id` 查找单位 |
| `normalizeMissionRef(value)` | 标准化 missionRef（处理前缀、大小写） |
| `focusOnUnit(id)` | **地图自动平移居中**目标舰船。正确公式：`(worldW/2 - wx) * map.zoom` |
| `playCoordinateLock(unit)` | 播放坐标锁定动画 `.coordinate-lock` |
| `previewUnit(id)` / `clearUnitPreview(id)` | hover 预览与清除 |
| `unitFromPoint(x, y)` | 从屏幕坐标查找最近单位（缩放感知阈值） |
| `selectUnitAtPoint(e)` | 点击地图空白处选中最近单位 |

### 5.4 游戏逻辑

| 函数 | 功能 |
|------|------|
| `completeMission(unitId)` | 击沉敌舰：移除单位、奖励 WIP、记录战史、播放特效 |
| `startMission(unitId)` | 将任务标记为进行中（状态同步） |
| `generateReport()` | 生成上下层双层战报 |
| `nearestPlanet(x, y)` | 查找最近的天体名称 |
| `sectorName(f)` | 势力映射到区域名 |
| `processAdvance()` | 处理敌军逾期推进（每 turn 向地球移动 `ADVANCE_RATE`） |
| `checkReinforcements()` | 检查是否需要增援波次 |
| `spawnReinforcement(faction)` | 生成增援舰队 |
| `renderWarZones()` | 渲染交战区光环与额外航道 |
| `tacticalStrike(x, y, color)` | 播放战术击沉特效（扩散环 + 坐标轴） |
| `warpJump(px, py, color)` | 播放跃迁闪光特效 |

### 5.5 地图变换

| 函数 | 功能 |
|------|------|
| `applyMap()` | 将 `map.zoom/panX/panY` 应用到 `#mapWorld` 的 CSS transform |
| `scheduleMap()` | rAF 节流版 `applyMap()`，避免每帧强制重排 |
| `zoom(d)` | 缩放 ±d，限制在 `[MAP_MIN_ZOOM, MAP_MAX_ZOOM]` |
| `resetMap()` | 重置缩放到默认值，平移归零 |
| `initMap()` | 初始化地图交互：拖拽（pointerdown/move/up）、缩放（wheel）、点击、hover 检测 |
| `throttledHoverCheck(e)` | hover 检测节流，避免 pointermove 每帧触发强制同步布局 |

### 5.6 面板与 UI

| 函数 | 功能 |
|------|------|
| `initPermanentVanguard()` | 初始化 5 艘永久旗舰（不对应 Linear，任何时候不得删去） |
| `radarTargetState(unit)` | 计算单位的雷达目标状态（in_progress / dueSoon / overdue / null） |
| `applyRadarTargets()` | 应用雷达高亮：目标舰加 `is-radar-target`，其余加 `is-radar-muted` |
| `frameRadarTargets(targets)` | 计算目标区域边界框，自动缩放并聚焦到最优视图 |
| `clearRadarTargets()` | 清除所有雷达状态类 |
| `toggleRadar()` | 战术任务雷达开关：冻结动画 → 扫描 → 聚焦 → 恢复 |
| `initPanelResize()` | 初始化左侧面板宽度拖拽条 `.panel-resize-handle`，范围 240~540px，localStorage 记忆 |
| `switchTab(tab)` | 切换顶部标签页：`situation`/`fleet`/`campaign`/`intel`/`settings` |
| `renderFleet()` / `setFleetFilter(f)` | 舰队标签页渲染与筛选 |
| `renderCampaign()` | 战役标签页渲染 |
| `renderIntel()` | 情报标签页渲染 |
| `renderSettings()` | 设置标签页渲染 |
| `initLinearUI()` | 初始化 Linear API 连接 UI |
| `doLogin()` / `finishLogin()` / `bootMain()` | 登录与系统启动流程 |
| `showLoading(text, pct)` / `hideLoading()` | 加载画面控制 |

### 5.7 部署系统

| 函数 | 功能 |
|------|------|
| `openDeployModal(classType)` | 打开部署弹窗 |
| `closeDeployModal()` | 关闭部署弹窗 |
| `randomDeployName()` | 随机生成部署舰名 |
| `selectDeploySector(btn)` | 选择部署扇区 |
| `confirmDeploy()` | 确认部署，校验 WIP 余额 |
| `buildShipForDeploy(...)` | 构造部署单位对象 |
| `playDeployAnimation(ship)` | 播放部署动画（光束 + 跃迁） |
| `finalizeDeploy(ship, el)` | 完成部署，加入 `G.units`，扣减 WIP |

### 5.8 数据导入导出

| 函数 | 功能 |
|------|------|
| `exportGameData()` | 导出 WIP + 战史 + 番茄钟 + 部署舰队为 JSON |
| `importGameData(input)` | 从文件导入 JSON 数据，schema 版本校验（`_version`） |

---

## 6. 子系统对象 API

### 6.1 LinearAPI — Linear 数据同步

```javascript
const LinearAPI = {
  endpoint: 'http://localhost:5180/api/linear',
  key: '...',           // 从 ~/.gv_linear_key 读取
  pollingId: null,      // setInterval ID
  isPolling: false,
  lastSyncTime: 0,

  startPolling(interval = 30000)   // 启动轮询（默认 30s）
  stopPolling()                    // 停止轮询
  query(q, vars = {})              // GraphQL POST 查询
  fetchIssues()                    // 拉取所有 issues
  sync()                           // 全量同步 → 更新 Linear.issues / Linear.done
};
```

### 6.2 StarshipSync — 增量同步引擎

```javascript
const StarshipSync = {
  diff(oldIssues, newIssues)       // 差异检测：返回 {added, removed, changed}
  createUnit(issue)                // 为新 issue 创建 Unit
  spawnAnimation(unit)             // 新单位入场：跃迁 + 出现
  despawnAnimation(unit, onDone)   // 旧单位离场：淡出 + 消失
  updateUnit(unit, issue)          // 更新现有单位属性
  createWarpFlash(x, y, color)     // 创建跃迁闪光 DOM
  applyIncremental()               // 应用增量差异到 G.units
};
```

### 6.3 AnimationEngine — rAF 动画驱动

```javascript
const AnimationEngine = {
  frameId: null,        // rAF ID
  lastTime: 0,          // 上一帧时间戳

  start()               // 启动动画循环
  stop()                // 停止动画循环
  warmCache()           // 预热 DOM 缓存（一次性 querySelectorAll）
  tick(now)             // 主循环：计算漂移 → 更新特殊运动 → 更新 DOM
  updateVanguard(unit)  // 更新友方单位动画
  updateEnemy(unit)     // 更新敌方单位动画
  updateSpecialMotion(unit, dt)  // 更新轨道/航道运动
  applyDrift(unit, dt)  // 应用正弦漂移（选中时 scale 0.15，优先级倍率）
  updateDOM()           // 批量写入 DOM transform/position

  // 轨道注册（内部管理）
  registerOrbit(unitId, motion)
  unregisterOrbit(unitId)
  registerFactionOrbit(faction, cx, cy, rx, ry, speed, count)
  clearAllOrbits()
};
```

> **漂移优先级倍率**：`urgent×2.5` / `high×2.0` / `medium×1.5` / `low×1.0`。选中时漂移幅度缩小到 15%（`selectedScale = 0.15`），让选中单位视觉上更稳定。

### 6.4 PerformanceMonitor — 性能监控与自动降级

```javascript
const PerformanceMonitor = {
  fps: 60,
  frameTimes: [],       // 最近 90 帧的 FPS 样本
  quality: 'high',      // high / medium / low
  checkInterval: null,
  _rafId: null,

  start()               // 启动监控
  stop()                // 停止监控
  measureLoop()         // rAF 循环测帧
  evaluate()            // 每 4s 评估一次，决定是否降级
  setQuality(mode)      // 设置画质，写入 `body.dataset.quality`
};
```

画质等级影响：`body[data-quality="low"]` 会关闭特效、暂停动画、降低星空密度。

### 6.5 WIPStore — 工时系统

```javascript
const WIPStore = {
  _key: 'gv_wip',
  _version: 1,

  load() / save(data)   // localStorage 读写
  get()                 // 获取今日数据（自动处理日期切换重置）
  addOnline(minutes)    // 在线时长奖励（每日上限 60）
  addKill(estimate)     // 击沉奖励：estimate×10 + streak 倍率 + 首杀 bonus
  addPomodoro(minutes)  // 番茄钟奖励：每分钟 1 WIP
  resetStreak()         // 重置连击计数
  canDeploy(cost)       // 检查余额是否足够
  spend(cost)           // 消费 WIP，失败返回 false
  addDeployed(ship)     // 记录已部署舰队
  removeDeployed(id)    // 移除已部署舰队记录
  getDeployed()         // 获取已部署舰队数组
};
```

### 6.6 WarHistoryStore — 战史系统

```javascript
const WarHistoryStore = {
  _key: 'gv_war_history',
  _maxRecords: 50,      // 最大记录数

  load() / save(data)   // localStorage 读写
  get()                 // 获取数据（自动处理日期切换）
  recordKill(unit, wipEarned)     // 记录击沉
  recordDeploy(ship)              // 记录部署
  recordPomodoro(wipEarned, sessionNum)  // 记录番茄钟
  recordSync(added, removed)      // 记录同步事件（新威胁/撤离）
  getStats()            // 获取统计对象
  getRecords(limit = 8) // 获取最近 N 条记录
  clear()               // 清空战史
};
```

### 6.7 PomodoroTimer — 番茄钟系统

```javascript
const PomodoroTimer = {
  _key: 'gv_pomodoro',
  _settingsKey: 'gv_pomodoro_settings',
  DEFAULT_DURATION: 25 * 60,  // 默认 25 分钟（秒）
  _rafId: null,               // rAF ID
  _lastTick: 0,               // 上次 tick 时间戳

  getDuration() / setDuration(minutes)  // 获取/设置时长（15/25/45/60）
  load() / save(data)           // localStorage 读写
  getState()                    // 获取状态（自动处理日期切换、版本升级）
  start() / pause() / toggle()  // 开始/暂停/切换
  reset()                       // 重置为 idle
  complete()                    // 完成：+WIP，+session 计数，闪烁提示
  _startTick() / _stopTick()    // rAF 驱动倒计时
  resumeOnBoot()                // 页面刷新后恢复运行中的计时器
  initInterruptDetection()      // 打断检测：切标签页/最小化自动暂停
  formatTime(seconds)           // 格式化为 `MM:SS`
};
```

番茄钟状态：`idle` → `running` → `paused` → `completed` → (5s 后自动) → `idle`。

打断检测：`document.hidden` 变化时自动 pause/resume，`_wasRunningBeforeHidden` 标记恢复状态。

---

## 7. CSS 类名体系

> **命名风格**：kebab-case，语义化模块前缀。例：`.fleet-card`、`.hud-time`、`.login-screen`。

### 7.1 布局与容器

| 类名 | 模块 | 说明 |
|------|------|------|
| `.command-shell` | 全局 | 主容器，grid 布局：`var(--panel-width) minmax(0, 1fr)` |
| `.command-panel` | 面板 | 左侧指挥面板（aside） |
| `.panel-resize-handle` | 面板 | 面板宽度拖拽条，5px 宽，绝对定位右边缘 |

### 7.2 地图层

| 类名 | 模块 | 说明 |
|------|------|------|
| `.solar-map` | 地图 | 太阳系地图容器 |
| `.map-stage` / `#mapStage` | 地图 | 星图画布舞台 |
| `.map-world` / `#mapWorld` | 地图 | 可变换的世界层（`translate3d` + `scale`） |
| `#starfield` | 地图 | 星空 Canvas |
| `#celestialBodies` | 地图 | 天体层 |
| `#unitLayer` | 地图 | 作战单位层（z-index: 6） |
| `#neutralLayer` | 地图 | 中立单位层（z-index: 7） |
| `#radarLayer` | 地图 | 雷达覆盖层 |
| `.strategic-grid` | 地图 | 战略网格覆盖层 |
| `.body-marker` | 天体 | 天体标记容器 |
| `.planet` | 天体 | 行星本体 |
| `.has-ring` | 天体 | 带光环（土星） |
| `.sector-label` | 天体 | 扇区文字标签 |
| `.routes` / `.route` / `.route-{faction}` | 地图 | SVG 航道 |

### 7.3 舰船与单位

| 类名 | 模块 | 说明 |
|------|------|------|
| `.unit` | 单位 | 作战单位基础样式 |
| `.ship-flagship` ~ `.ship-raider` | 单位 | 各舰型尺寸定义 |
| `.ship-icon` / `.ship-glyph` / `.map-ship-glyph` | 单位 | 舰船 SVG 图标 |
| `.neutral-unit` / `.neutral-icon` | 中立 | 中立单位样式（无 threat-pulse，无 engine-flame） |
| `.unit-label` | 单位 | 舰名悬浮标签 |
| `.unit-code` | 单位 | 单位编码悬浮标签 |
| `.engine-flame` | 单位 | 引擎尾焰 |
| `.unit-trail` | 单位 | 舰船尾迹 |
| `.threat-pulse` | 单位 | 威胁脉冲圈（仅敌方） |
| `.status-chip` | 单位 | 状态小点（已隐藏） |

### 7.4 状态标记类

| 类名 | 何时添加 | 说明 |
|------|---------|------|
| `.is-selected` | 单位被选中 | 高亮、放大 |
| `.is-previewed` | 鼠标 hover | 临时高亮 |
| `.is-spawning` | 新单位入场 | 跃迁出现动画 |
| `.is-deploying` | 玩家部署 | 光束 + 跃迁动画 |
| `.is-destroying` | 单位被击沉 | 扩散消失动画 |
| `.is-demo-traffic` | 演示假数据 | 半透明标记 |
| `.is-panning` | 地图拖拽中 | `#mapStage` 添加 |
| `.is-focusing-unit` | 地图聚焦中 | `#mapWorld` 添加（过渡动画） |
| `.is-locking` | 详情面板锁定 | 坐标锁定动画 |
| `.has-selection` | 详情面板有内容 | 显示状态 |
| `.is-active` | 标签页/按钮激活 | — |
| `.is-hidden` | 加载画面隐藏 | — |
| `.is-done` | 登录页完成 | 退出动画 |
| `.is-processing` | 登录按钮处理中 | 禁用状态 |
| `.is-visible` | 欢迎文字可见 | 打字机动画 |
| `.is-dragging` | 面板拖拽中 | `.panel-resize-handle` |
| `.is-open` | 部署弹窗打开 | `.deploy-modal` |
| `.advancing` / `.stationed` / `.patrol` | 单位状态 | 对应 `status` 字段 |

### 7.5 面板与 HUD

| 类名 | 模块 | 说明 |
|------|------|------|
| `.briefing-panel` | 面板 | 简报卡片 |
| `.unit-detail` / `#unitDetail` | 面板 | 单位详情面板 |
| `.sync-grid` | 面板 | 统计网格（已完成/待办/逾期） |
| `.task-list` | 面板 | 任务列表 |
| `.brief-row` | 面板 | 简报任务行 |
| `.mission-card` | 面板 | 任务详情卡片 |
| `.tag-pills` / `.tag-pill` | 面板 | 标签胶囊 |
| `.countdown-bar` | 面板 | 截止倒计时条 |
| `.mission-desc` | 面板 | 任务描述区 |
| `.info-grid` | 面板 | 信息双列网格 |
| `.history-block` | 面板 | 战史记录区 |
| `.vanguard-info` / `.vg-row` | 面板 | 友方单位详情 |
| `.meter` / `.stat-row` | 面板 | 属性计量条 |
| `.sci-fi-hud` / `#sciFiHud` | HUD | 右下角科幻时钟容器 |
| `.hud-corner` `.tl`~`.br` | HUD | 四个边角装饰 |
| `.hud-time` / `#hudTime` | HUD | 倒计时时间显示（可点击） |
| `.hud-pomodoro-label` | HUD | 巡航状态标签 |
| `.hud-pomodoro-bar` | HUD | 巡航进度条 |
| `.hud-online-mini` | HUD | 在线时长小字 |
| `.hud-wip-value` / `.hud-wip-label` | HUD | WIP 显示 |

### 7.6 登录页

| 类名 | 说明 |
|------|------|
| `.login-screen` / `.login-backdrop` / `.login-scanline` / `.login-grid` | 登录页层 |
| `.login-content` | 登录卡片 |
| `.login-logo-wrap` / `.login-logo` / `.login-logo-ring` | Logo 区 |
| `.login-title` / `.login-subtitle` / `.login-mission` | 标题区 |
| `.login-form` / `.login-field` / `.login-btn` / `.login-btn-glow` | 表单区 |
| `.login-welcome` / `.welcome-line` / `.welcome-sub` / `.welcome-cursor` | 欢迎动画 |

### 7.7 标签页

| 类名 | 模块 | 说明 |
|------|------|------|
| `.tab-page` / `.tab-header` / `.tab-body` | 标签 | 容器 |
| `.fleet-sidebar` / `.fleet-filter` / `.fleet-filter-btn` / `.fleet-summary` / `.fleet-list` | 舰队页 | 舰队页结构 |
| `.fleet-card` | 舰队页 | 舰队卡片 |
| `.campaign-stats` / `.campaign-timeline` | 战役页 | 统计与时间线 |
| `.stat-card` | 战役页 | 统计卡片 |
| `.timeline-item` | 战役页 | 时间线条目 |
| `.intel-grid` / `.intel-card` / `.intel-bar` | 情报页 | 情报网格与进度条 |
| `.settings-group` / `.settings-row` | 设置页 | 设置分组 |

### 7.8 部署弹窗

| 类名 | 说明 |
|------|------|
| `.deploy-modal` / `.deploy-backdrop` / `.deploy-card` | 弹窗容器 |
| `.deploy-header` / `.deploy-badge` / `.deploy-close` | 头部 |
| `.deploy-preview` / `.deploy-ship-icon` / `.deploy-class-label` | 预览区 |
| `.deploy-fields` / `.deploy-field` / `.deploy-input-wrap` / `.deploy-random` | 表单区 |
| `.deploy-sectors` / `.sector-btn` | 扇区选择 |
| `.deploy-cancel` / `.deploy-confirm` | 底部按钮 |

### 7.9 特效与动画

| 类名 | 说明 |
|------|------|
| `.crt-overlay` / `.crt-vignette` | CRT 扫描线与暗角 |
| `.scanline` | 扫描线动画 |
| `.warp-effect` | 跃迁闪光 |
| `.tactical-strike` / `.strike-ring` / `.strike-axis` / `.strike-core` / `.strike-label` | 战术击沉特效 |
| `.faction-aura` | 势力光环 |
| `.war-zone` | 交战区脉冲 |
| `.radar-layer` / `.radar-zone` / `.radar-toggle` | 雷达层 |
| `.coordinate-lock` / `.coordinate-lock-ring` / `.coordinate-lock-cross` / `.coordinate-lock-corner` `.corner-nw`~`.corner-se` | 坐标锁定动画 |
| `.loading-screen` / `.loading-logo` / `.loading-status` / `.loading-bar-track` / `.loading-bar-fill` | 加载画面 |
| `.neon-glow` / `.neon-glow-strong` | 霓虹文字 |
| `.data-stream` | 数据流动画 |
| `.sync-toast` | 同步通知 Toast |
| `.sync-indicator` / `.idle` | 同步状态指示灯 |
| `.deploy-beam` | 部署光束 |
| `.pomodoro-done` | 番茄钟完成闪烁 |

### 7.10 战史

| 类名 | 说明 |
|------|------|
| `.wh-stats` / `.wh-stat` / `.wh-stat-val` / `.wh-stat-label` | 战史统计 |
| `.wh-list` / `.wh-item` / `.wh-time` / `.wh-dot` / `.wh-text` / `.wh-class` / `.wh-wip` | 战史记录列表 |

---

## 8. DOM ID 体系

> ID 命名采用 camelCase（HTML 传统）或 kebab-case（CSS 传统），与引用它们的 JS 变量名对应。

### 8.1 全局

| ID | 说明 |
|----|------|
| `#loadingScreen` / `#loadingText` / `#loadingBar` | 加载画面 |
| `#loginScreen` / `#loginForm` / `#loginCallsign` / `#loginKey` / `#loginBtn` / `#loginWelcome` / `#welcomeLine` / `#welcomeSub` / `#welcomeCursor` | 登录页 |

### 8.2 HUD

| ID | 说明 |
|----|------|
| `#sciFiHud` | 科幻时钟容器 |
| `#hudTime` | 倒计时时间显示 |
| `#hudPomodoroLabel` | 巡航状态标签 |
| `#hudPomodoroBar` | 巡航进度条 |
| `#hudOnlineMini` | 在线时长小字 |
| `#hudWipTotal` | WIP 总数 |
| `#hudStreak` | 当前连击数 |

### 8.3 地图

| ID | 说明 |
|----|------|
| `#mapStage` | 星图舞台 |
| `#starfield` | 星空 Canvas |
| `#mapWorld` | 世界变换层 |
| `#celestialBodies` | 天体层 |
| `#unitLayer` | 作战单位层 |
| `#neutralLayer` | 中立单位层 |
| `#radarLayer` | 雷达覆盖层 |
| `#radarToggle` | 雷达开关按钮 |
| `#zoomLabel` | 缩放百分比显示 |

### 8.4 面板

| ID | 说明 |
|----|------|
| `#dailyBrief` | 今日任务简报 |
| `#wipDisplay` | WIP 资源显示 |
| `#warHistoryPanel` / `#warHistoryDisplay` | 战史面板 |
| `#factions` | 势力列表 |
| `#unitDetail` | 单位详情面板 |
| `#connectUI` | Linear 连接区 |
| `#apiKeyInput` | API Key 输入框 |
| `#btnConnect` | 连接按钮 |
| `#btnDemo` | 演示数据按钮 |
| `#connectStatus` | 连接状态文字 |

### 8.5 标签页

| ID | 模块 | 说明 |
|----|------|------|
| `#fleetFilter` | 舰队页 | 筛选按钮组 |
| `#fleetSummary` | 舰队页 | 统计摘要 |
| `#fleetList` | 舰队页 | 舰队卡片列表 |
| `#campaignStats` | 战役页 | 统计卡片区 |
| `#campaignTimeline` | 战役页 | 时间线区 |
| `#intelFactionAnalysis` | 情报页 | 势力分析 |
| `#intelLabelStats` | 情报页 | 标签统计 |
| `#intelThreatAlert` | 情报页 | 威胁预警 |
| `#intelEconomy` | 情报页 | 经济账 |
| `#settingsBody` | 设置页 | 设置内容容器 |
| `#perfMode` | 设置页 | 性能模式下拉框 |
| `#pomodoroDuration` | 设置页 | 巡航时长下拉框 |
| `#importFile` | 设置页 | 导入文件选择器 |
| `#settingsApiKey` | 设置页 | 设置页 API Key 输入 |
| `#settingsStatus` | 设置页 | 设置页状态文字 |

### 8.6 部署弹窗

| ID | 说明 |
|----|------|
| `#deployModal` | 部署弹窗 |
| `#deployCostBadge` | WIP 消耗徽章 |
| `#deployClassLabel` | 舰型标签 |
| `#deployShipIcon` | 舰船图标预览 |
| `#deployName` | 舰名输入 |
| `#deployCommander` | 指挥官输入 |
| `#deploySquadron` | 编队下拉框 |
| `#deploySectors` | 扇区选择按钮组 |

### 8.7 SVG Marker

| ID | 用途 |
|----|------|
| `#arrow-blue` | 先遣队航道箭头（蓝色） |
| `#arrow-teal` | 地球联合政府航道箭头（青色） |
| `#arrow-yellow` | 木星兵团航道箭头（黄色） |
| `#arrow-red` | 星际遗民航道箭头（红色） |

---

## 9. 状态与枚举

### 9.1 单位状态 (`unit.status`)

| 取值 | 含义 | 视觉表现 |
|------|------|---------|
| `patrol` | 友方巡逻中 | 正常漂移，蓝色标识 |
| `stationed` | 敌方驻扎中 | 正常漂移，有 threat-pulse |
| `advancing` | 敌方逾期推进中 | 向地球移动，motion opacity 0.78 |
| `destroyed` | 已击沉/已摧毁 | 从 G.units 移除，不再渲染 |
| `reinforcement` | 增援舰队 | 特殊入场动画 |
| `reserve` | 预备役 | 玩家未分配任务 |
| `traffic-demo` | 演示交通数据 | 半透明标记 |

### 9.2 任务状态 (`mission.status` / Linear 映射)

| 内部取值 | Linear 来源 | 含义 |
|----------|------------|------|
| `todo` | 默认 / `state.type !== started/completed/canceled/backlog` | 待办 |
| `in_progress` | `state.type === 'started'` / 名含 "progress/进行中" | 进行中 |
| `backlog` | `state.type === 'backlog'` / 名含 "backlog" | 积压 |
| `done` | `state.type === 'completed'` / 名含 "done/完成" | 已完成 |
| `canceled` | `state.type === 'canceled'` / 名含 "cancel/取消" | 已取消 |

### 9.3 任务优先级 (`mission.priority`)

| 取值 | Linear 原始值 | 映射舰型 |
|------|--------------|---------|
| `urgent` | `priority: 1` | 战列舰 (battleship) |
| `high` | `priority: 2` | 巡洋舰 (cruiser) |
| `medium` | `priority: 3` | 驱逐舰 (destroyer) |
| `low` | `priority: 4` 或 `0` | 袭扰艇 (raider) |

### 9.4 番茄钟状态 (`PomodoroTimer.state`)

| 取值 | 含义 | 转换条件 |
|------|------|---------|
| `idle` | 待机 | 初始状态 / 重置后 / 完成 5s 后 |
| `running` | 巡航中 | 点击开始 / 打断恢复 |
| `paused` | 已暂停 | 点击暂停 / 切标签页自动暂停 |
| `completed` | 完成 | 倒计时归零，+WIP，闪烁提示 |

### 9.5 画质等级 (`PerformanceMonitor.quality` / `body.dataset.quality`)

| 取值 | 含义 |
|------|------|
| `high` | 高画质（全部特效开启） |
| `medium` | 中画质（简化部分粒子/光环） |
| `low` | 低画质（关闭特效、暂停动画） |

### 9.6 当前标签页 (`_activeTab`)

| 取值 | 含义 |
|------|------|
| `situation` | 态势（主星图） |
| `fleet` | 舰队 |
| `campaign` | 战役 |
| `intel` | 情报 |
| `settings` | 设置 |

### 9.7 舰队筛选 (`_fleetFilter`)

| 取值 | 含义 |
|------|------|
| `all` | 全部势力 |
| `vanguard` / `egov` / `jupiter` / `remnant` | 对应势力 |

### 9.8 布尔标记

| 标记 | 含义 |
|------|------|
| `_radarActive` | 雷达是否开启 |
| `_loginSkip` | 登录是否已跳过 |
| `map.dragging` | 地图是否正在拖拽 |
| `unit.isDemoTraffic` | 是否为演示交通 |

---

## 10. 安全化工具

### 10.1 safeLS — localStorage 安全包装器

所有原生的 `localStorage.getItem/setItem/removeItem` 调用已替换为 `safeLS` 方法。新增代码**严禁**直接使用 `localStorage.xxx`。

```javascript
const safeLS = {
  get(key, fallback = null)     // try-catch 包装 getItem
  set(key, value)               // try-catch 包装 setItem，返回 bool
  remove(key)                   // try-catch 包装 removeItem，返回 bool
  getJSON(key, fallback = null) // getItem + JSON.parse
  setJSON(key, value)           // JSON.stringify + setItem
};
```

### 10.2 cssEscape — CSS 选择器转义

所有 `data-id` 选择器必须使用 `cssEscape()` 包装，防止特殊字符导致选择器语法错误。

```javascript
function cssEscape(value) {
  if (window.CSS?.escape) return CSS.escape(value);
  return String(value)
    .replace(/[!"#$%&'()*+,\/;<=>?@[\\\]^`{|}~]/g, '\\$&')
    .replace(/^\d/, '\\3$& ')
    .replace(/^-(?=[\d-])/, '\\-')
    .replace(/[\x00-\x1f\x7f]/g, '');
}

// 使用示例
const el = document.querySelector(`.unit[data-id="${cssEscape(id)}"]`);
```

> 原实现仅转义 `/\`` 三个字符，已被多次 bug 证明不足。新实现完整覆盖 dot、colon、hash、space、leading digits、control chars。

---

## 11. 命名约定

| 类别 | 约定 | 示例 |
|------|------|------|
| **文件命名** | kebab-case | `console-skin.css`, `core.test.js` |
| **JS 变量/函数** | camelCase | `animationEngine`, `renderUnits`, `selectedId` |
| **全局常量** | UPPER_SNAKE_CASE | `CONFIG`, `FACTIONS`, `SHIP_CLASSES`, `PLANETS` |
| **CSS 类名** | kebab-case，语义化模块前缀 | `.fleet-card`, `.hud-time`, `.login-screen` |
| **私有属性/内部方法** | 下划线前缀 | `_key`, `_rafId`, `_deployState`, `_driftX`, `_renderX`, `_lastHeading` |
| **localStorage 键名** | `gv_` 前缀 | `gv_wip`, `gv_war_history`, `gv_pomodoro` |
| **势力缩写** | 单字母编码 | `V` (vanguard), `E` (egov), `J` (jupiter), `R` (remnant) |
| **版本标记** | 行内注释 `v{major}.{minor}` | `v2.9`, `v4.6`, `v5.3` 散布于文件头部注释 |
| **常见缩写** | — | `WIP`, `HUD`, `LS` (localStorage), `rAF` (requestAnimationFrame), `NEU` (Neutral) |

---

## 12. 关键工程认知

### 12.1 坐标系统

`#mapWorld` 的 CSS：`left:50%; top:50%; transform:translate(-50%,-50%)`。这意味着其中心始终对准 `#mapStage` 的中心。**不需要**在 `panX/panY` 中额外加 `stageW/2` 或 `worldW/2`。

`focusOnUnit()` 的正确公式：

```javascript
const wx = (u.x / 100) * worldW;     // 单位在世界坐标系中的像素位置
const wy = (u.y / 100) * worldH;
map.panX = (worldW / 2 - wx) * map.zoom;   // 世界中心 - 目标位置，再乘缩放
map.panY = (worldH / 2 - wy) * map.zoom;
```

**错误公式**（曾导致定位偏移）：`(stageW/2 + worldW/2 - wx) * zoom` ❌

### 12.2 缓存策略

所有 CSS/JS 资源使用统一 cache-bust 参数 `?v=pomodoro-21`。更新任何文件后必须同步更新所有引用点的版本号，否则会出现「新 JS + 旧 CSS」组合 bug（曾导致 HUD 不可点击、标签页黑屏、中立图层尺寸不一致）。

### 12.3 动画性能

- `AnimationEngine` 用 **rAF** 驱动，替代纯 CSS `shipFloat` 动画
- `scheduleMap()` 用 rAF 节流，避免每帧强制重排
- `throttledHoverCheck()` 避免 `pointermove` 每帧触发 `getBoundingClientRect`
- `PerformanceMonitor` 自动检测 FPS，低于阈值时降级到 `medium`/`low`

### 12.4 数据持久化策略

三层持久化：
1. **localStorage** — 实时状态（WIP、战史、番茄钟、设置）
2. **JSON 导出/导入** — 完整备份恢复（`exportGameData`/`importGameData`）
3. **Schema 版本号** — 每个 Store 有 `_version` 字段，未来迁移接口不变

未来可能接入 Supabase，但 `WIPStore`/`WarHistoryStore`/`PomodoroTimer` 的 API 接口保持不变。

### 12.5 测试框架

浏览器打开 `tests/index.html` 运行全部单元测试。测试框架零依赖，自实现 `describe`/`it`/`expect`（12 种断言）。

当前覆盖：`rand`、`pick`、`clamp`、`distToEarth`、`daysOverdue`、`daysUntil`、`normalizeShipClass`、`genCode`、`priorityToClass`、`sectorName`、`nearestPlanet`、`cssEscape`。

### 12.6 中立单位设计约束

- **货运舰**：城市名命名池
- **客运舰**：航空公司名，限 2 汉字
- **补给舰**：植物名，限 3 汉字
- 不参与交战、不属于势力、归星球所有（`planetIndex`）
- `planetIndex: -1` 表示深空单位，`renderNeutralDetail` 中显示「深空航道」
- 独立渲染层 `#neutralLayer`，z-index: 7（在 `#unitLayer` 之上）

### 12.7 全局调试

`window.__game` 暴露所有核心对象，浏览器控制台可直接访问：

```javascript
window.__game.G          // 全局状态
window.__game.map        // 地图变换
window.__game.LinearAPI  // API 对象
window.__game.WIPStore   // WIP 系统
window.__game.PomodoroTimer  // 番茄钟
```
