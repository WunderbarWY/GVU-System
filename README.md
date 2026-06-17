# 银河先遣队控制中心 (GVU System)

> **版本**：v4.0  
> **本质**：一个把 Linear 任务映射成星际战棋的任务管理系统  
> **原则**：不点开是战棋，点开了是工作  
> **当前模式**：纯展示型（单向读取，不回写 Linear）

## 截图预览

打开 `http://localhost:5180`，你会看到：
- 左侧：星际战棋地图，太阳系航道，敌方舰队分布
- 右侧：任务详情面板，势力概览，WIP 工时系统
- 点击任意敌舰 → 查看对应的 Linear 任务详情（倒计时、标签、描述）
- 击沉敌舰 → 赚取 WIP 工时，用于部署我方舰队

## 核心功能

| 功能 | 状态 |
|------|------|
| Linear 单向读取（纯展示型） | ✅ |
| 任务 → 敌军舰队（优先级 = 舰型大小） | ✅ |
| 逾期 → 敌军向地球推进 | ✅ |
| WIP 工时系统（在线计时 + 击沉奖励 + 舰队部署） | ✅ |
| NATO 中文命名（星座/矿物/天文/气象） | ✅ |
| 自动连接（`~/.gv_linear_key`） | ✅ |
| 科幻 HUD 时钟（右下角 WIP + 工作时长） | ✅ |
| 增援波次系统 | ✅ |
| 加载画面 + CRT 特效 + 引擎尾焰 | ✅ |

## 快速启动

```bash
# 1. 确保 API Key 已写入文件（只需做一次）
echo "lin_api_你的Key" > ~/.gv_linear_key

# 2. 启动服务器
cd ~/Documents/Codex/2026-05-29/kimi-kimi-linear-api-linear-linear
python3 server.py

# 3. 浏览器打开，等 2 秒自动连接
open http://localhost:5180
```

## WIP 工时系统

| 收入方式 | 规则 |
|---------|------|
| 页面在线 | 每分钟 +1 WIP，每日上限 60 |
| 击沉敌舰 | `estimate × 10` |
| 连续击沉 streak | 3 艘 ×1.2，5 艘 ×1.5 |
| 每日首杀 | +50 WIP |

| 部署消耗 | WIP 成本 |
|---------|---------|
| 袭扰艇 | 30 |
| 驱逐舰 | 60 |
| 巡洋舰 | 120 |
| 战列舰 | 220 |
| 旗舰 | 450 |

## 势力映射规则

| Linear 标签/项目/标题关键词 | 游戏势力 | 颜色 |
|---------------------------|---------|------|
| 含"野居"字样 | 木星兵团 | 金黄 |
| 创作、写作、设计、内容、视频、小说 | 木星兵团 | 金黄 |
| **其他所有** | 地球联合政府 | 青绿 |
| （备用，不自动分配） | 星际遗民 | 暗红 |

## 项目文档

- `TERMINOLOGY.md` — **项目术语库（必读）** — 200+ 自定义概念的精确释义、数据结构字段、CSS 类名体系、DOM ID 体系、状态枚举、命名约定、关键工程认知
- `MEMORY.md` — 详细进度、已知问题、TODO、架构说明
- `DEVLOG.md` — 开发日志与需求 backlog
- `INSTRUCTIONS_FOR_CODEX.md` — Codex 协作分工指令
- `console-skin.css` — Codex 新增控制台视觉覆盖层，避开核心逻辑

## GitHub

https://github.com/WunderbarWY/GVU-System
# Codex visual layer

- `tactical-renderer.js` - viewport-sized Canvas renderer for routes, orbits, ships, engine plumes, threat rings, and selection indicators. Gameplay state and DOM interaction remain in `app.js`.
