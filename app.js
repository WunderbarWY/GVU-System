const factions = {
  vanguard: {
    name: "银河先遣队",
    role: "玩家势力",
    domain: "已控制航道",
    color: "#4da3ff",
    glow: "rgba(77, 163, 255, 0.85)",
    territory: "地球、水星周围航道",
  },
  egov: {
    name: "地球联合政府",
    role: "敌军 1",
    domain: "商业活动",
    color: "#17d7b6",
    glow: "rgba(23, 215, 182, 0.82)",
    territory: "月球、金星周围航道",
  },
  jupiter: {
    name: "木星兵团",
    role: "敌军 2",
    domain: "创作线活动",
    color: "#ffd251",
    glow: "rgba(255, 210, 81, 0.78)",
    territory: "木星、土星航道",
  },
  remnant: {
    name: "星际遗民",
    role: "混乱势力",
    domain: "杂事、拖延、干扰",
    color: "#ff3f52",
    glow: "rgba(255, 63, 82, 0.86)",
    territory: "冥王星、无人航道",
  },
};

const planets = [
  { name: "水星前哨", x: 37, y: 51, size: 24, color: "#9fb5c8", glow: "rgba(77,163,255,.55)" },
  { name: "金星航道", x: 70, y: 29, size: 40, color: "#17d7b6", glow: "rgba(23,215,182,.6)" },
  { name: "地球司令部", x: 25, y: 48, size: 56, color: "#4da3ff", glow: "rgba(77,163,255,.72)" },
  { name: "月球封锁线", x: 49, y: 40, size: 18, color: "#c8fff6", glow: "rgba(23,215,182,.72)" },
  { name: "木星船坞", x: 76, y: 64, size: 86, color: "#ffd251", glow: "rgba(255,210,81,.62)" },
  { name: "土星议庭", x: 58, y: 74, size: 70, color: "#d7b14a", glow: "rgba(255,210,81,.5)", ring: true },
  { name: "冥王星暗港", x: 22, y: 82, size: 30, color: "#ff3f52", glow: "rgba(255,63,82,.6)" },
];

const tasks = [
  {
    id: "LIN-101",
    title: "商业合作提案定稿",
    faction: "egov",
    unit: "合同巡洋舰 01",
    shipClass: "cruiser",
    size: "巡洋舰",
    status: "In Progress",
    priority: "高",
    due: "今日",
    estimate: 5,
    x: 60,
    y: 32,
    power: 82,
    supply: 63,
    morale: 58,
    notes: "商业活动任务。接入 Linear 后会显示 issue 描述、负责人、评论和子任务。",
  },
  {
    id: "LIN-118",
    title: "客户跟进与报价",
    faction: "egov",
    unit: "报价驱逐舰 02",
    shipClass: "destroyer",
    size: "驱逐舰",
    status: "Todo",
    priority: "中",
    due: "明日",
    estimate: 3,
    x: 77,
    y: 22,
    power: 66,
    supply: 70,
    morale: 52,
    notes: "商业活动任务。当前是待办状态，未开始会保持在敌方控制航道附近。",
  },
  {
    id: "LIN-205",
    title: "小说第五章结构修订",
    faction: "jupiter",
    unit: "第五章战列舰",
    shipClass: "battleship",
    size: "战列舰",
    status: "In Progress",
    priority: "高",
    due: "本周",
    estimate: 8,
    x: 69,
    y: 54,
    power: 76,
    supply: 88,
    morale: 74,
    notes: "创作线任务。用于承载小说章节推进，后续可同步 Linear project 或 label。",
  },
  {
    id: "LIN-232",
    title: "世界观势力表整理",
    faction: "jupiter",
    unit: "档案工程母舰",
    shipClass: "carrier",
    size: "工程母舰",
    status: "Todo",
    priority: "中",
    due: "3 日后",
    estimate: 5,
    x: 52,
    y: 68,
    power: 52,
    supply: 82,
    morale: 68,
    notes: "创作线任务。用于整理阵营、航道和战役规则的设定资料。",
  },
  {
    id: "LIN-309",
    title: "邮箱和碎片消息清理",
    faction: "remnant",
    unit: "碎片袭扰艇",
    shipClass: "raider",
    size: "袭扰艇",
    status: "Backlog",
    priority: "低",
    due: "逾期",
    estimate: 2,
    x: 30,
    y: 76,
    power: 38,
    supply: 36,
    morale: 91,
    notes: "杂事任务。逾期或长期未处理时，会显示为红色干扰单位。",
  },
  {
    id: "LIN-330",
    title: "拖延积压复盘",
    faction: "remnant",
    unit: "积压劫掠舰",
    shipClass: "raider",
    size: "混编单位",
    status: "Todo",
    priority: "中",
    due: "逾期",
    estimate: 3,
    x: 20,
    y: 75,
    power: 57,
    supply: 41,
    morale: 86,
    notes: "拖延积压任务。后续可以把它拆成多个 Linear 子 issue。",
  },
  {
    id: "LIN-001",
    title: "今日最小胜利",
    faction: "vanguard",
    unit: "先遣旗舰",
    shipClass: "flagship",
    size: "旗舰",
    status: "Done",
    priority: "高",
    due: "今日",
    estimate: 1,
    x: 31,
    y: 38,
    power: 91,
    supply: 78,
    morale: 84,
    notes: "今日已完成样例。接入 Linear 后，Done 状态会转化为己方蓝白单位。",
  },
];

const mapState = {
  zoom: 0.58,
  panX: 0,
  panY: 0,
  dragging: false,
  startX: 0,
  startY: 0,
  originX: 0,
  originY: 0,
};

function drawStarfield() {
  const canvas = document.querySelector("#starfield");
  const stage = document.querySelector("#mapStage");
  const ctx = canvas.getContext("2d");
  const rect = stage.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = rect.width * ratio;
  canvas.height = rect.height * ratio;
  ctx.scale(ratio, ratio);
  ctx.clearRect(0, 0, rect.width, rect.height);

  for (let i = 0; i < 180; i += 1) {
    const x = Math.random() * rect.width;
    const y = Math.random() * rect.height;
    const r = Math.random() * 1.4 + 0.35;
    const alpha = Math.random() * 0.65 + 0.18;
    ctx.fillStyle = `rgba(232, 251, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderPlanets() {
  const layer = document.querySelector("#celestialBodies");
  layer.innerHTML = planets
    .map(
      (planet) => `
        <div class="body-marker" style="left:${planet.x}%;top:${planet.y}%">
          <span class="planet ${planet.ring ? "has-ring" : ""}" style="--size:${planet.size}px;--color:${planet.color};--glow:${planet.glow}"></span>
          <span>${planet.name}</span>
        </div>
      `,
    )
    .join("");
}

function renderFactions() {
  const factionList = document.querySelector("#factions");
  factionList.innerHTML = Object.values(factions)
    .map(
      (faction) => `
        <div class="faction">
          <span class="swatch" style="--color:${faction.color}"></span>
          <div>
            <strong>${faction.name}</strong>
            <span>${faction.domain}</span>
          </div>
          <small>${faction.role}</small>
        </div>
      `,
    )
    .join("");
}

function renderUnits() {
  const layer = document.querySelector("#unitLayer");
  layer.innerHTML = tasks
    .map((task) => {
      const faction = factions[task.faction];
      const threatRadius = task.faction === "vanguard" ? 56 : 58 + task.power * 0.45;
      return `
        <span class="threat-pulse" style="left:${task.x}%;top:${task.y}%;--radius:${threatRadius}px;--unit-color:${faction.color}"></span>
        <span class="unit-trail" style="left:${task.x - 1.4}%;top:${task.y + 1.1}%;--trail-width:${40 + task.power * 0.25}px;--angle:${task.faction === "remnant" ? "-28deg" : task.faction === "jupiter" ? "18deg" : "-12deg"};--unit-color:${faction.color}"></span>
        <button
          class="unit ship-${task.shipClass}"
          data-id="${task.id}"
          type="button"
          aria-label="查看 ${task.title}"
          style="left:${task.x}%;top:${task.y}%;--unit-color:${faction.color};--unit-glow:${faction.glow};--status-color:${statusColor(task.status)};color:${faction.color}"
        >
          ${shipIcon(task.shipClass)}
          <span class="unit-code">${task.id}</span>
          <span class="unit-label">${task.unit}</span>
          <span class="status-chip"></span>
        </button>
      `;
    })
    .join("");

  layer.querySelectorAll(".unit").forEach((unit) => {
    unit.addEventListener("click", () => selectUnit(unit.dataset.id));
  });
}

function statusColor(status) {
  const colors = {
    Done: "#4da3ff",
    "In Progress": "#e8fbff",
    Todo: "#ffd251",
    Backlog: "#ff3f52",
  };

  return colors[status] || "#8ea4b8";
}

function renderBriefing() {
  const done = tasks.filter((task) => task.status === "Done");
  const todo = tasks.filter((task) => task.status !== "Done");
  const overdue = tasks.filter((task) => task.due === "逾期").length;

  document.querySelector("#dailyBrief").innerHTML = `
    <div class="sync-grid">
      <div><strong>${done.length}</strong><span>已完成</span></div>
      <div><strong>${todo.length}</strong><span>待办</span></div>
      <div><strong>${overdue}</strong><span>逾期</span></div>
    </div>
    <div class="task-list">
      <h3>已完成</h3>
      ${briefRows(done)}
      <h3>待办</h3>
      ${briefRows(todo)}
    </div>
  `;

  const state = `${done.length} 完成 / ${todo.length} 待办`;
  document.querySelector("#frontlineState").textContent = state;
}

function selectUnit(id) {
  const task = tasks.find((item) => item.id === id);
  const faction = factions[task.faction];
  document.querySelectorAll(".unit").forEach((unit) => {
    unit.classList.toggle("is-selected", unit.dataset.id === id);
  });

  document.querySelector("#unitDetail").innerHTML = `
    <p class="eyebrow">${task.id} / ${faction.name}</p>
    <h2 class="unit-title" style="--unit-color:${faction.color}">${task.title}</h2>
    <p>${task.notes}</p>
    <div class="tag-row">
      <span class="tag">${task.unit}</span>
      <span class="tag">${task.size}</span>
      <span class="tag">Linear: ${task.status}</span>
      <span class="tag">${task.priority}优先级</span>
      <span class="tag">${task.estimate} 点</span>
      <span class="tag">${task.due}</span>
    </div>
    ${stat("战斗力", task.power, faction.color)}
    ${stat("补给", task.supply, faction.color)}
    ${stat("士气", task.morale, faction.color)}
    <p class="muted">这里后续会从 Linear issue 实时读取：标题、描述、状态、优先级、截止时间、子任务和评论。</p>
  `;
}

function briefRows(items) {
  if (!items.length) {
    return `<p class="empty-row">暂无</p>`;
  }

  return items
    .map((task) => {
      const faction = factions[task.faction];
      return `
        <button class="brief-row" type="button" onclick="selectUnit('${task.id}')">
          <span class="dot" style="--color:${faction.color}"></span>
          <span>${task.title}</span>
          <small>${task.status}</small>
        </button>
      `;
    })
    .join("");
}

function shipIcon(shipClass) {
  const paths = {
    flagship:
      '<path d="M50 6 L68 36 L88 48 L66 54 L58 88 L50 76 L42 88 L34 54 L12 48 L32 36 Z"/><path d="M50 19 L50 68"/><path d="M35 47 L65 47"/>',
    battleship:
      '<path d="M50 8 L75 38 L82 66 L59 60 L50 88 L41 60 L18 66 L25 38 Z"/><path d="M33 41 L67 41"/><path d="M39 57 L61 57"/>',
    carrier:
      '<path d="M50 10 L84 42 L74 74 L54 65 L50 90 L46 65 L26 74 L16 42 Z"/><path d="M28 45 L72 45"/><path d="M33 57 L67 57"/><path d="M42 31 L58 31"/>',
    cruiser:
      '<path d="M50 9 L70 34 L77 61 L58 58 L50 86 L42 58 L23 61 L30 34 Z"/><path d="M38 39 L62 39"/>',
    destroyer:
      '<path d="M50 8 L66 35 L71 58 L56 55 L50 84 L44 55 L29 58 L34 35 Z"/><path d="M39 43 L61 43"/>',
    raider:
      '<path d="M50 12 L72 52 L58 50 L50 84 L42 50 L28 52 Z"/><path d="M35 38 L22 31"/><path d="M65 38 L78 31"/>',
  };

  return `
    <svg class="ship-icon" viewBox="0 0 100 100" aria-hidden="true">
      ${paths[shipClass] || paths.destroyer}
    </svg>
  `;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function applyMapTransform() {
  const world = document.querySelector("#mapWorld");
  const label = document.querySelector("#zoomLabel");
  world.style.setProperty("--zoom", mapState.zoom.toFixed(2));
  world.style.setProperty("--pan-x", `${Math.round(mapState.panX)}px`);
  world.style.setProperty("--pan-y", `${Math.round(mapState.panY)}px`);
  label.textContent = `${Math.round(mapState.zoom * 100)}%`;
}

function zoomMap(delta) {
  mapState.zoom = clamp(mapState.zoom + delta, 0.65, 2.4);
  applyMapTransform();
}

function resetMap() {
  mapState.zoom = 1;
  mapState.panX = 0;
  mapState.panY = 0;
  applyMapTransform();
}

function initMapControls() {
  const stage = document.querySelector("#mapStage");
  document.querySelectorAll("[data-zoom]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.zoom;
      if (action === "in") zoomMap(0.18);
      if (action === "out") zoomMap(-0.18);
      if (action === "reset") resetMap();
    });
  });

  stage.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      zoomMap(event.deltaY < 0 ? 0.12 : -0.12);
    },
    { passive: false },
  );

  stage.addEventListener("pointerdown", (event) => {
    if (event.target.closest(".unit, .map-controls")) return;
    mapState.dragging = true;
    mapState.startX = event.clientX;
    mapState.startY = event.clientY;
    mapState.originX = mapState.panX;
    mapState.originY = mapState.panY;
    stage.classList.add("is-panning");
    stage.setPointerCapture(event.pointerId);
  });

  stage.addEventListener("pointermove", (event) => {
    if (!mapState.dragging) return;
    mapState.panX = mapState.originX + event.clientX - mapState.startX;
    mapState.panY = mapState.originY + event.clientY - mapState.startY;
    applyMapTransform();
  });

  stage.addEventListener("pointerup", (event) => {
    if (!mapState.dragging) return;
    mapState.dragging = false;
    stage.classList.remove("is-panning");
    stage.releasePointerCapture(event.pointerId);
  });
}

function stat(label, value, color) {
  return `
    <div class="stat-row">
      <span>${label}</span>
      <div class="meter"><span style="--value:${value}%;--color:${color}"></span></div>
      <strong>${value}</strong>
    </div>
  `;
}

function boot() {
  drawStarfield();
  renderPlanets();
  renderFactions();
  renderUnits();
  renderBriefing();
  initMapControls();
  applyMapTransform();
  selectUnit("LIN-001");
}

window.addEventListener("resize", drawStarfield);
boot();
