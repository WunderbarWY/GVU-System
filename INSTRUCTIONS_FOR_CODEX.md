# 银河先遣队作战指挥台 — Codex 协作指令

> **版本**：v1.0  
> **日期**：2026-05-29  
> **分工模式**：你（Codex）负责视觉与交互层，Kimi 负责数据逻辑与 API 层

---

## 🚫 不要碰这些（Kimi 的地盘）

以下文件/区域由 Kimi 维护，**不要修改**，避免冲突：

| 文件 | 原因 |
|------|------|
| `app.js` | 核心逻辑层：数据状态、Linear API 对接、敌军 AI、战斗计算 |
| `tasks` 数据数组 | 已移除，改为动态从 Linear 拉取 |
| `boot()` 及初始化流程 | Kimi 控制数据加载顺序 |

**如果你需要改 JS 逻辑**，在 `README.md` 里留言，或让 Kimi 来做。

---

## ✅ 你的任务范围（放心改）

### 1. 视觉与动画
- `styles.css` — 全局样式、响应式、特效
- 舰队单位的悬停/选中动效
- 敌军威胁脉冲动画的升级
- 地图背景、星云、星空粒子效果
- **新想法**：跃迁动画、受击闪烁、轨道扫描线

### 2. HTML 结构
- `index.html` — 可增删 UI 区块，但保留现有 ID：
  - `#mapStage` — 地图容器
  - `#celestialBodies` — 星球层
  - `#unitLayer` — 单位层
  - `#unitDetail` — 右侧详情面板
  - `#dailyBrief` / `#frontlineState` — 战报

### 3. 新 UI 组件（纯展示，不绑数据）
- 加载动画/跃迁过渡画面
- 通知弹窗（样式框架，内容由 Kimi 填充）
- 势力旗帜/徽章设计
- 时间线/作战日志面板（占位即可）

---

## 📋 数据接口约定

Kimi 会保证 `app.js` 向 DOM 注入以下结构，你的 CSS 和 HTML 可以依赖这些类名：

```html
<!-- 作战单位（舰队） -->
<button class="unit" data-id="任务ID">
  <span class="unit-label">舰队名称</span>
</button>

<!-- 选中状态 -->
<button class="unit is-selected" data-id="任务ID">...</button>

<!-- 威胁脉冲 -->
<span class="threat-pulse"></span>

<!-- 星球标记 -->
<div class="body-marker">
  <span class="planet has-ring"></span>
  <span>星球名</span>
</div>
```

### 势力颜色变量（CSS 已定义，不要改键名）
```css
--vanguard: #4da3ff;   /* 玩家：银河先遣队 */
--egov: #17d7b6;       /* 敌军1：地球联合政府 */
--jupiter: #ffd251;    /* 敌军2：木星兵团 */
--remnant: #ff3f52;    /* 敌军3：星际遗民 */
--neutral: #6d7b8f;    /* 中立航道 */
```

---

## 🎨 设计规范（请保持）

- **主题**：深空冷调 + 霓虹点缀
- **背景**：`--space: #050711`
- **字体**：Inter + 系统无衬线，中文优先 Microsoft YaHei
- **圆角**：面板 8px，标签 999px
- **发光效果**：所有势力色都要有 `box-shadow` 或 `filter: drop-shadow` 发光
- **透明感**：面板用 `backdrop-filter: blur(18px)` + 半透明背景

---

## 📝 如果你要新增文件

可以新建，但请在 `README.md` 里记一笔：

```
- `new-file.css` — 新增粒子特效（Codex）
```

---

## 🎯 当前优先需求（按顺序）

1. **敌军反扑视觉** — 逾期任务对应的红色单位要有更明显的"危险"提示（闪烁、裂纹边框、暗红拖尾）
2. **完成任务反馈** — 点击"完成任务"后，舰队要有"跃迁消失"或"爆炸消散"的动画
3. **地图动态感** — 星空背景加缓慢漂移，航道加流动虚线动画
4. **响应式打磨** — 移动端地图操作体验

---

## 💡 提示

- Kimi 的改动会集中在 `app.js`，你不会收到冲突通知
- 如果你改了 `app.js`，Kimi 下次会覆盖回来
- 有想法但不确定归谁？直接写在 `README.md` 底部：`[Codex 提议]: ...`

---

**开始你的视觉升级吧！** 🚀
