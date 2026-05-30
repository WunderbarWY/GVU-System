# 银河先遣队作战指挥台

> **版本**：v3.0  
> **本质**：一个把 Linear 任务映射成星际战棋的任务管理系统  
> **原则**：不点开是战棋，点开了是工作

## 截图预览

打开 `http://localhost:5180`，你会看到：
- 左侧：星际战棋地图，太阳系航道，敌方舰队分布
- 右侧：任务详情面板，战区控制度，战报系统
- 点击任意敌舰 → 查看对应的 Linear 任务详情
- 点击"完成任务" → 击沉敌舰 + 自动回写 Linear 为 Done

## 核心功能

| 功能 | 状态 |
|------|------|
| Linear 单向读取（纯展示型） | ✅ |
| 任务 → 敌军舰队（优先级 = 舰型大小） | ✅ |
| 逾期 → 敌军向地球推进 | ✅ |
| 点击"完成" → 回写 Linear Done | ✅ |
| 点击"开始推进" → 回写 Linear In Progress | ✅ |
| 自动连接（无需每次输 Key） | ✅ |
| 战区控制度面板 | ✅ |
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

## 势力映射规则

| Linear 标签/项目/标题关键词 | 游戏势力 | 颜色 |
|---------------------------|---------|------|
| 商业、客户、销售、合同、市场 | 地球联合政府 | 青绿 |
| 创作、写作、设计、内容、视频 | 木星兵团 | 金黄 |
| 杂务、日常、行政、邮件、报销 | 星际遗民 | 暗红 |
| 其他 / 无匹配 | 按优先级分配 | - |

## 项目文档

- `MEMORY.md` — 详细进度、已知问题、TODO、架构说明
- `INSTRUCTIONS_FOR_CODEX.md` — Codex 协作分工指令
- `STANDBY_NOTICE_FOR_CODEX.md` — Codex 待命通知

## GitHub

https://github.com/WunderbarWY/GVU-System
