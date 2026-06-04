# GVU 开发 TODO

## 🔴 P0（今晚执行）
- [x] **优先级映射到地图位置** ✅
  - urgent/high + in_progress → 靠近地球中心（偏移强度 50-70%）
  - low + backlog → 靠近势力外围（偏移远离 30-40%）
  - medium → 轻微靠近 20%
  - 修改点：`app.js` `spawnZone()` + `syncLinearToGame()`

- [x] **增强舰船漂移动画** ✅
  - urgent 漂移 ×2.5，high ×2.0，medium ×1.5，low ×1.0
  - in_progress 额外 ×1.2
  - 修改点：`AnimationEngine.applyDrift()`

## 🟡 P1（近期）
- [ ] 工程化第二阶段：拆分 API 层、渲染层
- [ ] README + MIT License（为开源做准备）

## 🟢 P2（远期）
- [ ] 音效系统
- [ ] 移动端适配
