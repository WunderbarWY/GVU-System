# 项目记忆 — 银河先遣队控制中心 (GVU System)

> **最后更新**：2026-05-31  
> **当前版本**：v4.0  
> **核心原则**：不点开是战棋，点开了是工作  
> **数据流向**：Linear 单向读取 → 游戏展示（不回写）

---

## 已完成功能（v4.0）

### 数据层
- [x] Linear GraphQL API 对接（单向读取，纯展示型）
- [x] `fetchIssues(first: 100)` → 敌军舰队映射
- [x] 自动连接：通过 `~/.gv_linear_key` + `/api/config` GET 接口
- [x] ~~回写 Linear~~（已取消，v3.0 后改为纯展示型）
- [x] 势力映射规则 v2：
  - 默认全部 → 地球联合政府（egov）
  - "野居"字样 或 创作相关 → 木星兵团（jupiter）
  - 星际遗民（remnant）作为备用，不自动分配
- [x] 优先级映射：urgent→战列舰, high→巡洋舰, medium→驱逐舰, low→袭扰艇
- [x] 敌军反扑：逾期任务 → 向地球推进
- [x] 增援波次：逾期≥3 时自动生成增援舰（假数据占位）

### WIP 工时系统（v4.0 新增核心机制）
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
- [x] 加载画面（Logo + 进度条）
- [x] CRT 扫描线 + 暗角 vignette
- [x] 太阳系战役地图（SVG 航道 + Canvas 星空）
- [x] 舰船浮动动画 + 引擎尾焰
- [x] 势力光环（战区呼吸发光）
- [x] 战术击沉效果（锁定十字 + SIGNAL LOST）
- [x] 科幻 HUD（地图右下角角标面板，蓝色发光）
- [x] 标题栏：银河先遣队控制中心 + GALACTIC VANGUARD UNIT + logo

### 交互层
- [x] 点击地图舰船 → 右侧面板显示任务详情
- [x] 任务详情面板 v2：
  - 任务卡片（彩色左边框）
  - 倒计时条（绿色/黄色/红色）
  - 标签 pills（优先级 + Linear labels）
  - 任务描述预览（200 字截断，3 行 clamp）
  - 信息网格（截止日期 + 预估工时）
  - 作战记录（最近 3 条）
- [x] 地图缩放/拖拽/滚轮控制
- [x] 势力信息面板（简化版，无 domain/role 文本）
- [x] 战史记录（最近 50 条）

### 已删除的元素
- [x] ~~战区控制度面板~~（用户要求删除）
- [x] ~~战斗力/补给/士气进度条~~（用户要求删除）
- [x] ~~"完成任务" / "开始推进" 按钮~~（纯展示型不需要）
- [x] ~~"纯展示型"提示文案~~（用户要求删除）
- [x] ~~第 X 作战日 + 防线状态~~（用户要求删除）
- [x] ~~紧急战报叙事~~（用户要求删除）

---

## 已知问题 / 限制

| 问题 | 状态 | 说明 |
|------|------|------|
| Linear 连接偶发 HTML 错误 | 已修复 | server.py 已处理 trailing slash + GET /api/config，加 cleanKey 过滤 + 绝对 URL + 调试日志 |
| 增援舰队是假数据 | 已知 | `spawnReinforcement()` 生成的增援舰不对应真实 Linear 任务 |
| 势力映射纯启发式 | 已知 | 靠关键词匹配，可能误判。用户已简化规则（默认 egov，创作/野居→jupiter） |
| 最多拉取100条任务 | 已知 | `first: 100` 硬编码，任务超多时需分页 |
| 无离线模式 | 已知 | 没网时无法使用，需考虑缓存策略 |
| 音效层未开始 | 待开发 | 用户有需求但还没动工 |
| 移动端未适配 | 待开发 | 目前只适配桌面端 |

---

## 下一步目标（按优先级）

### P0 — 近期必做
- [ ] **音效系统**：击沉音效、警报音效、部署音效、背景氛围音
- [ ] **战役里程碑/成就**：Linear Cycle 完成 → 大捷事件，连续击沉 streak → 勋章
- [ ] **势力映射 UI 微调**：让用户在详情面板里手动改势力（万一映射错了）

### P1 — 体验深化
- [ ] **战史时间线面板**：把 50 条记录做成可视化时间线
- [ ] **每日开局简报动画**：打字机效果播报今日任务概况
- [ ] **舰队编队系统**：同类型舰可以编组，批量查看
- [ ] **事件系统**：随机天气异常（太阳风暴影响航道视觉）、紧急求救信号

### P2 — 扩展性
- [ ] **移动端适配**：响应式布局，触摸操作
- [ ] **离线缓存**：localStorage 缓存 Linear 数据，没网也能看
- [ ] **多 workspace 支持**：切换不同的 Linear team/workspace
- [ ] **数据导出**：战史、统计数字导出为 Markdown/图片

---

## 技术架构

```
前端（纯静态）
  ├── index.html      # DOM 结构（~190行）
  ├── styles.css      # 视觉基础 + 面板样式（~2200行）
  ├── effects.css     # 特效层（~250行）
  ├── app.js          # 核心逻辑引擎（~1400行）
  └── logo.png        # GVU Logo

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
| 舰队部署 | `deployShip()` | app.js |
| 战报生成 | `generateReport()` | app.js |
| 任务详情面板 | `renderDetail()` | app.js |
| 战术击沉效果 | `tacticalStrike()` | app.js |

---

## 用户决策记录

- **视觉主基调**：深空冷调 + 霓虹点缀，Codex 负责 HUD/框架/舰船 SVG，Kimi 负责特效/逻辑
- **游戏层 ↔ 任务层分离**：地图上永远看不到工作词汇，点开才是 Linear 原文
- **纯展示型**：v3.0 后取消回写，游戏内操作不同步到 Linear
- **WIP 工时系统**：打开页面积累工时，击沉敌舰赚 WIP，花 WIP 部署我方舰
- **势力映射 v2**：默认 egov，创作/野居→jupiter，remnant 备用不自动分配
- ** NATO 中文命名**：保留 NATO 的 "Name-Number" 风格，但用中文词
- **自动连接**：通过 `~/.gv_linear_key` 文件（server.py 读取），而非 localStorage（跨端口隔离）

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
