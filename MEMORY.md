# 银河先遣队作战指挥台 — 项目记忆

## 当前版本

v2.6 — 性能优化 + 速度分级 + 启动加速（但启动卡死 bug 未解决）

---

## 🔴 P0 事故：启动卡死（2026-06-01）

### 症状
- 点击"接入系统"按钮后，页面卡在"初始化战术系统..." loading 画面，永远进不去主界面
- CSS 动画（扫描线等）仍在运行，说明浏览器未完全卡死
- Chrome 和 Safari 均复现
- 本地服务器 `python3 server.py` → `http://localhost:5180`

### 已尝试的修复（全部失败）

| # | 修复措施 | 结果 |
|---|---------|------|
| 1 | 在 `bootMain()` 和 `initLinearUI()` 中添加 `console.time/timeEnd` 诊断标记 | Console 中完全无 `[GV]` 日志 |
| 2 | 添加 3 秒安全网 `setTimeout` 强制隐藏 loading screen | 未触发（主线程可能被卡住） |
| 3 | 在 `<head>` 中添加内联应急诊断脚本 | `[DIAG]` 日志正常输出，确认 HTML 加载了新版本 |
| 4 | 加 `Cache-Control: no-cache` meta 标签 | 无效 |
| 5 | 将 JS/CSS 版本号从 `?v=diag-1` 改为 `?v=fix-1` | 无效 |
| 6 | **复制 `app.js` → `app-v2.js`，HTML 引用新文件名** | **仍然卡住** |
| 7 | 简化 `doLogin()`：去掉所有 setTimeout/动画/打字机，直接 `finishLogin()` | 仍然卡住 |
| 8 | 简化 `bootMain()`：去掉 `throw e`，`hideLoading()` 立即执行，1 秒安全网 | 仍然卡住 |

### 从 Console 截图中确认的关键信息

**截图 1（页面加载 3 秒后，未点击按钮）：**
```
[DIAG] Emergency script loaded        (index):15
[DIAG] Page loaded                    (index):17
[DIAG] 3s check — loadingScreen visible: true   (index):21
[DIAG] 3s check — loginScreen visible: true     (index):22
```
- HTML 确实加载了新版本（行号 15/17/21/22 对应 v2 内联脚本）
- **loadingScreen 和 loginScreen 同时可见**（z-index: 1000 vs 150，用户看到的是 loadingScreen）
- **没有任何 `[GV]` 开头的日志** — 说明 `app-v2.js` 中的 `console.log` 完全没有输出

**截图 2（点击按钮后）：**
- 页面显示"初始化战术系统..." loading 画面（静态截图）
- 用户未提供此时的 Console 截图

### 核心矛盾点

1. **HTML 加载了新版本**（内联脚本的行号变了 → 不是缓存问题）
2. **JS 文件没有语法错误**（`node --check app-v2.js` 通过）
3. **按钮能点击**（说明 `window.__game` 存在，`app-v2.js` 至少执行到了末尾的 `window.__game = {...}`）
4. **但 `doLogin()` / `bootMain()` 中的 `console.log` 完全不输出**

### ✅ 已确认的根因（由 codex 定位）

**两个叠加问题：**

1. **`loading-screen` 默认可见，且 `z-index: 1000` 盖死了 `login-screen`（`z-index: 150`）**
   - `index.html` 中 `<div class="loading-screen" id="loadingScreen">` 没有默认 `is-hidden`
   - 页面加载后，用户根本看不到"接入系统"按钮
   - `bootMain()` 永远不会被调用，loading screen 永远显示"初始化战术系统..."

2. **版本分裂：HTML 引用的是 `app-v2.js`，但部分修复只改了 `app.js`**
   - 造成诊断混乱，Console 中看不到 `[GV]` 日志（因为执行的是 `app-v2.js`，而日志在 `app.js` 里）

### 修复方案

- 给 `loading-screen` 默认添加 `is-hidden` 类
- `showLoading()` 调用时 `remove('is-hidden')` 来显示
- `hideLoading()` 调用时 `add('is-hidden')` 来隐藏
- 统一 JS 文件，避免版本分裂

---

## 项目架构

### 文件结构
- `index.html` — 主页面（loading screen + login screen + 主界面）
- `app.js` / `app-v2.js` — 核心逻辑引擎（~2760 行）
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
doLogin() → finishLogin() → bootMain() → hideLoading()
```

### 关键配置
- **纯展示型原则**：游戏内任何操作不回写 Linear
- **势力映射**："野居"/创作 → jupiter，其他 → egov，remnant 备用
- **API Key**：`~/.gv_linear_key`（chmod 600）
- **服务器**：`python3 server.py` → `http://localhost:5180`

---

## 版本历史

- v2.1 — 实时轮询同步
- v2.2 — rAF 动画引擎
- v2.3 — 战史系统
- v2.3.1 — 部署弹窗
- v2.4 — 跃迁光束效果
- v2.5 — 指挥官登录首页
- v2.6 — 系统性性能优化（scanline transform、移除 filter/blend-mode、pointermove 节流、PerformanceMonitor 自动降级、舰船速度分级）
- v2.6-diag — 注入诊断代码（console.time 标记）
- v2.6-fix — 缓存修复 + 简化登录流程（当前，卡死未解决）

---

## 已知限制

- 移动端未适配
- 音效未实现
- 启动卡死（P0，未解决）
