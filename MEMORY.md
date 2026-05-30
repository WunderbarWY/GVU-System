# 项目记忆 — 银河先遣队作战指挥台

> **最后更新**：2026-05-30  
> **当前版本**：v3.0  
> **核心原则**：不点开是战棋，点开了是工作

---

## 已完成功能

### 数据层
- [x] Linear GraphQL API 对接（双向同步）
- [x] 读取任务：issues(first: 100) → 敌军舰队
- [x] 读取工作流状态：workflowStates → 用于状态回写
- [x] **回写 Linear**：完成任务 → Linear 状态变 Done
- [x] **回写 Linear**：开始推进 → Linear 状态变 In Progress
- [x] 智能势力映射：按 Project/Label/Title 关键词分配势力
- [x] 优先级映射：Urgent→战列舰, High→巡洋舰, Medium→驱逐舰, Low→袭扰艇
- [x] 自动连接：通过 `~/.gv_linear_key` 文件持久化（跨端口）

### 视觉层
- [x] 加载画面（Logo + 进度条 + 打字机状态文字）
- [x] CRT 扫描线叠加 + 暗角 vignette
- [x] 航道流动动画（SVG stroke-dashoffset）
- [x] 舰船浮动动画
- [x] 引擎尾焰（CSS 渐变 + 脉动）
- [x] 势力光环（5个战区呼吸式发光）
- [x] 跃迁效果（完成任务时蓝色闪光）
- [x] 升级粒子爆炸（60主粒子 + 20碎片）
- [x] 战略网格背景

### 玩法层
- [x] 5个交战区（水星走廊、金星前线、木星封锁带、冥王星边境、地球轨道）
- [x] 6条额外航道（战略网络）
- [x] 战区控制度面板（2×2 四势力百分比）
- [x] 敌军反扑：逾期任务 → 敌舰向地球推进
- [x] 增援波次：逾期≥3个时自动生成增援舰
- [x] 随机军事化舰船命名（18前缀×12后缀×4势力专属词库）
- [x] 双层战报系统：上层游戏叙事 + 下层工作统计

### 交互层
- [x] 点击地图舰船 → 右侧面板显示 Linear 任务详情
- [x] 点击右侧面板任务列表 → 自动定位到地图对应舰船
- [x] 地图缩放/拖拽/滚轮控制
- [x] 势力信息面板
- [x] 战史记录（最近50条）

---

## 已知问题 / 限制

| 问题 | 状态 | 说明 |
|------|------|------|
| 视觉特效"不明显" | 待优化 | 用户反馈引擎尾焰、航道流动等效果太淡，需要等用户有具体画面感后再迭代 |
| 增援舰队是假数据 | 已知 | `spawnReinforcement()` 生成的增援舰只有占位标题，不对应真实 Linear 任务 |
| 势力映射纯启发式 | 已知 | 靠关键词匹配，可能误判。未来可让用户手动调整映射规则 |
| 工作流状态回写严格 | 设计如此 | 必须 team + state type 匹配，否则报错。若团队没有标准 Done 状态会失败 |
| 最多拉取100条任务 | 已知 | `first: 100` 硬编码，任务超多时需要分页 |
| 无离线模式 | 已知 | 没网时无法使用，需考虑缓存策略 |

---

## 下一步 TODO（按优先级）

### P0 - 核心闭环
- [ ] 视觉特效重做（等用户有具体想法）
- [ ] 增援舰队对应真实子任务（而非占位符）
- [ ] 势力映射可手动调整（UI 里点一下改势力）

### P1 - 体验打磨
- [ ] 完成任务后播放音效（击沉、跃迁、警报）
- [ ] 每日开局简报动画（打字机 + 语音合成？）
- [ ] 战役里程碑（Linear Cycle 完成 → 大捷事件）
- [ ] 移动端适配

### P2 - 深度玩法
- [ ] 舰队编队系统（同势力多舰编组）
- [ ] 战略资源点（小行星带、空间站）
- [ ] 天气异常（太阳风暴影响航道）
- [ ] 战史时间线面板

---

## 技术架构

```
前端（纯静态）
  ├── index.html      # DOM 结构 + 加载画面
  ├── styles.css      # Codex 写的视觉基础（~1000行）
  ├── effects.css     # Kimi 写的特效层（~200行）
  └── app.js          # 核心逻辑引擎（~1200行）

代理（Python）
  └── server.py       # 静态文件 + /api/linear 代理 + /api/config

数据流
  Browser → fetch('/api/linear') → server.py → curl → Linear API
  Browser → fetch('/api/config') → server.py → ~/.gv_linear_key
```

### 关键代码入口

| 功能 | 函数 | 文件 |
|------|------|------|
| 同步 Linear 数据 | `LinearAPI.sync()` | app.js |
| 映射到游戏单位 | `syncLinearToGame()` | app.js |
| 敌军推进 | `processAdvance()` | app.js |
| 完成任务 | `completeMission()` | app.js |
| 开始推进 | `startMission()` | app.js |
| 战报生成 | `generateReport()` | app.js |
| 粒子爆炸 | `explode()` | app.js |
| 跃迁效果 | `warpJump()` | app.js |

---

## 用户决策记录

- **视觉主基调**：深空冷调 + 霓虹点缀，Codex 负责 HUD/框架/舰船 SVG，Kimi 负责特效/逻辑
- **游戏层 ↔ 任务层分离**：地图上永远看不到工作词汇，点开才是 Linear 原文
- **战报双层**：上层纯军事叙事，下层机器提取工作统计
- **势力映射**：商业→地球联合政府(青绿)，创作→木星兵团(黄)，杂务→星际遗民(红)
- **完成任务 = 击沉敌舰 + 生成我方增援舰**
- **自动连接**：通过 `~/.gv_linear_key` 文件，而非 localStorage（跨端口）

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
