# 银河先遣队作战指挥台 — 项目记忆

## 当前版本

v2.9 — 番茄钟 + 雷达键 + 经济账 + 数据持久化

---

## 已修复的问题

### ✅ P0：启动卡死（2026-06-01）
- **根因**：`loading-screen` 默认可见且 `z-index: 1000`，把 `login-screen`（`z-index: 150`）完全盖住
- **修复**：给 `loading-screen` 默认添加 `is-hidden`

### ✅ 部署弹窗问题（2026-06-04）
- **根因 1**：舰船图标（PNG）无尺寸限制，盖住输入框
- **根因 2**：扇区命名用希腊字母（αβγδ），用户看不懂
- **修复**：`max-width/max-height: 100%` + 扇区改名为「水星走廊/金星前线/木星航道/冥王星外围」

### ✅ 标签页黑屏（2026-06-04）
- **根因**：`.command-shell` grid 两列布局把 `.tab-page` 挤到侧边栏列；后续 CSS cache-bust 未更新导致用户端仍加载旧样式
- **修复**：`grid-column: 1 / -1` + `background: #02060c`；后续加内联 fallback 样式（`style="background:#02060c;grid-column:1/-1;..."`）确保即使 CSS 缓存也能正常显示

### ✅ 舰船点击无反应（2026-06-04）
- **根因 1**：`.threat-pulse` 无 `pointer-events: none`，拦截点击
- **根因 2**：事件委托在动态重建 DOM 后偶发失效
- **修复**：`pointer-events: none` + button 直接 `onclick`

### ✅ 服务器不稳定（2026-06-04）
- **根因**：curl 15秒超时 + 无重试 + 端口占用崩溃
- **修复**：30秒超时 + curl 自动重试 + `SO_REUSEADDR` + 健康检查端点

### ✅ 钟表模块点击无效（2026-06-05）
- **根因 1**：CSS cache-bust 长期未更新，浏览器加载旧 CSS，`.hud-time` 无 `cursor: pointer`
- **根因 2**：`updatePomodoroUI` 函数未被成功写入 app.js，调用时被 try-catch 静默吞掉
- **修复**：统一所有 CSS 文件的 cache-bust；补写 `updatePomodoroUI`；给 `.hud-time` 加 `cursor: pointer !important` + `display: inline-block` + `width: 100%`

### ✅ 任务详情乱显示截止时间（2026-06-05）
- **根因**：`renderDetail` 对所有任务都渲染「截止日期」行，即使 Linear 中未设置 due
- **修复**：加 `hasDue` 判断，无截止日期时不显示 countdown-bar 和截止日期字段

### ✅ 舰船移动像静止（2026-06-05）
- **根因**：`DRIFT_PROFILES` 振幅过小（0.02-0.09），在大幅面地图上几乎不可感知
- **修复**：振幅整体放大 2-3 倍（袭扰艇 0.26，旗舰 0.05），配合优先级倍率后移动明显

---

## 项目架构

### 文件结构
```
├── index.html          — 主页面（五标签页容器）
├── app.js              — 核心逻辑引擎（~3070 行，待拆分）
├── styles.css          — 基础样式 + 标签页样式
├── effects.css         — 动画/特效 + 部署弹窗样式
├── console-skin.css    — 终端皮肤
├── server.py           — Python 代理服务器 v2（curl 转发 + 重试）
├── src/
│   └── config/
│       └── game.js     — 配置层（势力/舰船/星球/交战区/关键词）
├── logo.png
└── assets/ships/       — 舰船贴图
```

### 核心模块
- `AnimationEngine` — rAF 动画循环，舰船漂移/轨道动画
- `StarshipSync` — 与 Linear API 同步，增量更新
- `WarHistoryStore` — 战史记录存储（localStorage）
- `WIPStore` — WIP 工时/经济系统，带 `_version` 字段
- `PomodoroTimer` — 番茄钟/巡航系统：rAF 倒计时、打断检测、自定义时长、持久化
- `PerformanceMonitor` — FPS 监控，自动降级动画
- `LinearAPI` — 封装 fetch，自动轮询
- `Radar` — 势力雷达层，显示势力控制区域底色（`toggleRadar`）

### 五标签页
| 标签 | 内容 | 状态 |
|------|------|------|
| **态势** | 战略地图 + 任务清单 + 部署按钮 + 单位详情 | ✅ 完成 |
| **舰队** | 势力筛选 + 舰船卡片列表，点击切回态势定位 | ✅ 完成 |
| **战役** | 统计概览 + 战史时间线 | ✅ 完成 |
| **情报** | 势力分析 + 标签统计 + 威胁预警 + **经济账** | ✅ 完成 |
| **设置** | API Key 配置 + 性能模式 + 演示数据 | ✅ 完成 |

### 启动流程
```
页面加载 → login-screen 显示 → 点击"接入系统"
→ doLogin() → finishLogin() → bootMain()
→ 初始化各模块 → hideLoading()
```

### 关键配置
- **纯展示型原则**：游戏内任何操作不回写 Linear
- **势力映射**："野居"/创作 → jupiter，其他 → egov，remnant 备用
- **API Key**：`~/.gv_linear_key`（chmod 600）
- **服务器**：`python3 server.py` → `http://localhost:5180`
- **健康检查**：`http://localhost:5180/api/health`
- **版本号**：`?v=pomodoro-4`
- **缓存策略**：所有 CSS/JS 统一 cache-bust；tab-page 带内联 fallback 样式
- **雷达键**：左下角 📡 按钮，切换势力控制区底色显示
- **番茄钟文案**：「发动巡航」/「巡航中」

---

## 待办事项

### P0（已完成）✅：优先级映射 + 动画增强 + 番茄钟
- [x] **优先级 → 地图位置**：urgent/high + in_progress → 靠近地球中心；low + backlog → 靠近势力外围
- [x] **舰船漂移增强**：按优先级放大 drift 幅度（urgent ×2.5，high ×2.0，medium ×1.5，low ×1.0，in_progress 额外×1.2）
- [x] **真正番茄钟**：rAF 倒计时，可自定义 15/25/45/60 分钟，奖励=时长分钟数×1 WIP，localStorage 持久化，切标签页自动暂停/恢复
- [x] **数据导出/导入**：JSON 备份，为 Supabase 迁移预留接口

### P1：工程化第二阶段
- [ ] 把 Linear API 抽到 `src/api/linear.js`
- [ ] 把渲染函数抽到 `src/renderers/`
- [ ] 引入 Vite + npm（可选，视开源意愿）

### P2：音效系统
- [ ] 部署/交战/任务完成音效
- [ ] Web Audio API 或 HTML5 Audio

### P3：移动端适配
- [ ] 响应式布局
- [ ] 触摸交互

---

## 版本历史

- v2.1 — 实时轮询同步
- v2.2 — rAF 动画引擎
- v2.3 — 战史系统
- v2.3.1 — 部署弹窗
- v2.4 — 跃迁光束效果
- v2.5 — 指挥官登录首页
- v2.6 — 系统性性能优化
- v2.6.1 — 修复 P0 启动卡死
- v2.7 — **五标签控制台**（态势/舰队/战役/情报/设置）+ 工程化第一阶段
- v2.8 — **优先级位置映射** + **增强漂移**（urgent×2.5漂移，in_progress额外×1.2，位置向地球偏移14%）
- v2.9 — **番茄钟** + **打断检测** + **自定义巡航时长** + **经济账** + **数据导出/导入** + **雷达键** + **舰船漂移增强**
