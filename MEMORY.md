# 银河先遣队作战指挥台 — 项目记忆

## 当前版本

v2.6.1 — P0 启动卡死已修复，回到正常开发轨道

---

## 已修复的问题

### ✅ P0：启动卡死（2026-06-01）
- **根因**：`loading-screen` 默认可见且 `z-index: 1000`，把 `login-screen`（`z-index: 150`）完全盖住，用户点不到"接入系统"按钮，bootMain() 永远不会执行
- **修复**：给 `loading-screen` 默认添加 `is-hidden`，`showLoading()` 调用时移除

---

## 项目架构

### 文件结构
- `index.html` — 主页面（loading screen + login screen + 主界面）
- `app.js` — 核心逻辑引擎（~2760 行）
- `styles.css` — 基础样式
- `effects.css` — 动画/特效样式
- `console-skin.css` — 终端皮肤
- `server.py` — Python 代理服务器（curl 转发 Linear GraphQL）
- `logo.png` — Logo 图片
- `assets/ships/` — 舰船贴图

### 核心模块
- `AnimationEngine` — rAF 动画循环，舰船漂移/轨道动画
- `StarshipSync` — 与 Linear API 同步，增量更新
- `WarHistoryStore` — 战史记录存储（localStorage）
- `PerformanceMonitor` — FPS 监控，自动降级动画
- `LinearAPI` — 封装 fetch，自动轮询

### 启动流程
```
页面加载 → login-screen 显示，loading-screen 隐藏 → 用户点击"接入系统"
→ doLogin() → finishLogin() → bootMain() → showLoading() → 各初始化步骤 → hideLoading()
```

### 关键配置
- **纯展示型原则**：游戏内任何操作不回写 Linear
- **势力映射**："野居"/创作 → jupiter，其他 → egov，remnant 备用
- **API Key**：`~/.gv_linear_key`（chmod 600）
- **服务器**：`python3 server.py` → `http://localhost:5180`
- **版本号**：`?v=bootfix-1`

---

## 待办事项（按优先级）

### P1：音效系统
- 状态：**未开始**
- 需求：为部署、交战、任务完成等事件添加音效反馈
- 技术选型待决定（Web Audio API vs HTML5 Audio）

### P2：移动端适配
- 状态：**未开始**
- 需求：当前 UI 在手机上完全不可用，需要响应式布局
- 涉及：地图缩放、面板布局、触摸交互

### P3：性能持续优化
- 已做：scanline transform、移除 filter/blend-mode、pointermove 节流、PerformanceMonitor
- 可继续：减少 DOM 操作频率、canvas 离屏渲染、对象池

---

## 版本历史

- v2.1 — 实时轮询同步
- v2.2 — rAF 动画引擎
- v2.3 — 战史系统
- v2.3.1 — 部署弹窗
- v2.4 — 跃迁光束效果
- v2.5 — 指挥官登录首页
- v2.6 — 系统性性能优化（scanline transform、移除 filter/blend-mode、pointermove 节流、PerformanceMonitor 自动降级、舰船速度分级）
- v2.6.1 — 修复 P0 启动卡死（loading-screen 默认隐藏）
