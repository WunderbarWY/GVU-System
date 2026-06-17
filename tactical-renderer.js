/**
 * TacticalRenderer
 * View-only Canvas layers for the strategic map. Gameplay state remains owned
 * by app.js; DOM units remain as accessible hit targets and hover labels.
 */
(function initTacticalRenderer() {
  'use strict';

  const WORLD_WIDTH = 16000;
  const WORLD_HEIGHT = 10400;
  const DPR_CAP = 1.5;
  const FACTION_COLORS = {
    vanguard: '#4da3ff',
    egov: '#17d7b6',
    jupiter: '#ffd251',
    remnant: '#ff3f52',
  };
  const SHIP_SIZES = {
    raider: 14,
    frigate: 17,
    destroyer: 21,
    cruiser: 26,
    battleship: 32,
    dreadnought: 38,
  };
  const ORBITS = [
    [2800, 1844],
    [4900, 3143],
    [6850, 4390],
    [10300, 6383],
    [12700, 7880],
    [15800, 10073],
  ];
  const ROUTES = [
    { faction: 'vanguard', p: [500, 360, 420, 300, 350, 330, 280, 390] },
    { faction: 'egov', p: [500, 360, 570, 310, 670, 290, 735, 250] },
    { faction: 'jupiter', p: [500, 360, 620, 430, 710, 475, 820, 510] },
    { faction: 'remnant', p: [500, 360, 400, 505, 360, 585, 205, 620] },
    { faction: 'neutral', p: [280, 390, 390, 475, 605, 545, 820, 510] },
    { faction: 'neutral', p: [280, 390, 350, 420, 420, 450, 500, 360] },
    { faction: 'neutral', p: [735, 250, 680, 280, 620, 320, 500, 360] },
    { faction: 'neutral', p: [820, 510, 750, 480, 680, 450, 500, 360] },
    { faction: 'neutral', p: [205, 620, 280, 580, 350, 520, 500, 360] },
    { faction: 'neutral', p: [500, 360, 450, 250, 400, 200, 350, 180] },
    { faction: 'neutral', p: [500, 360, 550, 480, 580, 550, 600, 600] },
  ];
  const GLYPH_PATHS = {
    raider: 'M50 8 L66 52 L57 49 L50 90 L43 49 L34 52 Z',
    frigate: 'M50 6 L65 29 L72 64 L59 59 L53 90 L47 90 L41 59 L28 64 L35 29 Z',
    destroyer: 'M50 5 L68 29 L77 64 L60 59 L54 91 L46 91 L40 59 L23 64 L32 29 Z',
    cruiser: 'M50 4 L72 29 L83 66 L62 61 L55 93 L45 93 L38 61 L17 66 L28 29 Z',
    battleship: 'M50 3 L76 30 L89 69 L66 63 L58 94 L50 98 L42 94 L34 63 L11 69 L24 30 Z',
    dreadnought: 'M50 3 L79 28 L94 66 L72 66 L60 94 L50 99 L40 94 L28 66 L6 66 L21 28 Z',
  };
  const GLYPH_RANK = {
    raider: 0,
    frigate: 1,
    destroyer: 2,
    cruiser: 3,
    battleship: 4,
    dreadnought: 5,
  };
  const GLYPH_CACHE = new Map();

  const state = {
    stage: null,
    world: null,
    staticCanvas: null,
    unitCanvas: null,
    staticCtx: null,
    unitCtx: null,
    stageRect: null,
    worldRect: null,
    dpr: 1,
    staticDirty: true,
    running: false,
    frameId: 0,
    lastFrame: 0,
    frames: 0,
    culled: 0,
    domStates: new Map(),
    layoutPositions: new Map(),
    domStateTick: 0,
    visible: true,
    tooltip: null,
    hoverId: null,
    hoverHit: null,
    hoverAt: 0,
    effects: Array.from({ length: 48 }, () => ({ active: false })),
    metrics: {
      frameMs: 0,
      averageFrameMs: 0,
      fps: 60,
      drawn: 0,
      lod: 'unit',
      staticRenders: 0,
      samples: [],
    },
  };

  function normalizeClass(value) {
    return value === 'flagship' ? 'dreadnought' : value === 'carrier' ? 'cruiser' : value;
  }

  function hexToRgb(hex) {
    const value = hex.replace('#', '');
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16),
    };
  }

  function rgba(hex, alpha) {
    const c = hexToRgb(hex);
    return `rgba(${c.r},${c.g},${c.b},${alpha})`;
  }

  function resizeCanvas(canvas, ctx) {
    const width = Math.max(1, Math.round(state.stageRect.width * state.dpr));
    const height = Math.max(1, Math.round(state.stageRect.height * state.dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${state.stageRect.width}px`;
      canvas.style.height = `${state.stageRect.height}px`;
    }
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  }

  function measure() {
    if (!state.stage || !state.world) return;
    state.stageRect = state.stage.getBoundingClientRect();
    state.worldRect = state.world.getBoundingClientRect();
    state.dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    resizeCanvas(state.staticCanvas, state.staticCtx);
    resizeCanvas(state.unitCanvas, state.unitCtx);
    state.staticDirty = true;
  }

  function worldPoint(percentX, percentY) {
    return {
      x: state.worldRect.left - state.stageRect.left + state.worldRect.width * percentX / 100,
      y: state.worldRect.top - state.stageRect.top + state.worldRect.height * percentY / 100,
    };
  }

  function svgPoint(x, y) {
    return {
      x: state.worldRect.left - state.stageRect.left + state.worldRect.width * x / 1000,
      y: state.worldRect.top - state.stageRect.top + state.worldRect.height * y / 720,
    };
  }

  function visible(point, padding) {
    return point.x > -padding && point.y > -padding &&
      point.x < state.stageRect.width + padding &&
      point.y < state.stageRect.height + padding;
  }

  function gameState() {
    return window.__game?.G || null;
  }

  function currentScale() {
    return Math.min(state.worldRect.width / WORLD_WIDTH, state.worldRect.height / WORLD_HEIGHT);
  }

  function rawUnitPosition(unit) {
    return {
      x: unit._renderX ?? (unit.x + (unit._driftX || 0)),
      y: unit._renderY ?? (unit.y + (unit._driftY || 0)),
    };
  }

  function tacticalUnitPosition(unit) {
    return state.layoutPositions.get(unit.id) || rawUnitPosition(unit);
  }

  function buildTacticalLayout(game) {
    state.layoutPositions.clear();
    const items = game.units
      .filter(unit => unit.status !== 'destroyed')
      .map(unit => {
        const raw = rawUnitPosition(unit);
        const type = normalizeClass(unit.shipClass);
        return {
          unit,
          rawX: raw.x,
          rawY: raw.y,
          x: raw.x,
          y: raw.y,
          size: SHIP_SIZES[type] || SHIP_SIZES.destroyer,
        };
      });

    for (let pass = 0; pass < 7; pass += 1) {
      for (let i = 0; i < items.length; i += 1) {
        for (let j = i + 1; j < items.length; j += 1) {
          const a = items[i];
          const b = items[j];
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          let distance = Math.hypot(dx, dy);
          const sameFaction = a.unit.faction === b.unit.faction;
          const minSep = Math.max(2.4, Math.min(7.2, (a.size + b.size) * (sameFaction ? 0.09 : 0.12)));
          if (distance >= minSep) continue;
          if (distance < 0.01) {
            const seed = (i * 37 + j * 17) % 360;
            dx = Math.cos(seed);
            dy = Math.sin(seed);
            distance = 1;
          }
          const push = (minSep - distance) * 0.52;
          const ux = dx / distance;
          const uy = dy / distance;
          a.x -= ux * push;
          a.y -= uy * push;
          b.x += ux * push;
          b.y += uy * push;
        }
      }
      items.forEach(item => {
        item.x += (item.rawX - item.x) * 0.08;
        item.y += (item.rawY - item.y) * 0.08;
        item.x = Math.max(3, Math.min(97, item.x));
        item.y = Math.max(3, Math.min(97, item.y));
      });
    }

    items.forEach(item => {
      state.layoutPositions.set(item.unit.id, { x: item.x, y: item.y });
    });
  }

  function drawStaticLayer() {
    const ctx = state.staticCtx;
    const width = state.stageRect.width;
    const height = state.stageRect.height;
    ctx.clearRect(0, 0, width, height);
    state.metrics.staticRenders += 1;

    const center = worldPoint(50, 50);
    const scaleX = state.worldRect.width / WORLD_WIDTH;
    const scaleY = state.worldRect.height / WORLD_HEIGHT;
    ctx.save();
    ctx.setLineDash([2, 12]);
    ORBITS.forEach((orbit, index) => {
      ctx.beginPath();
      ctx.ellipse(center.x, center.y, orbit[0] * scaleX / 2, orbit[1] * scaleY / 2, 0, 0, Math.PI * 2);
      ctx.strokeStyle = index === 2 ? 'rgba(77,163,255,0.17)' : 'rgba(190,218,238,0.105)';
      ctx.lineWidth = index === 2 ? 1.1 : 0.75;
      ctx.stroke();
    });
    ctx.restore();

    const phase = (performance.now() * 0.018) % 28;
    ROUTES.forEach(route => {
      const color = FACTION_COLORS[route.faction] || '#7f93a8';
      const p = route.p;
      const a = svgPoint(p[0], p[1]);
      const b = svgPoint(p[2], p[3]);
      const c = svgPoint(p[4], p[5]);
      const d = svgPoint(p[6], p[7]);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.bezierCurveTo(b.x, b.y, c.x, c.y, d.x, d.y);
      ctx.strokeStyle = rgba(color, route.faction === 'neutral' ? 0.18 : 0.48);
      ctx.lineWidth = route.faction === 'neutral' ? 0.8 : 1.25;
      ctx.setLineDash(route.faction === 'neutral' ? [2, 18] : [3, 13]);
      ctx.lineDashOffset = -phase;
      ctx.shadowColor = rgba(color, 0.35);
      ctx.shadowBlur = route.faction === 'neutral' ? 0 : 5;
      ctx.stroke();
      ctx.restore();
    });
  }

  function drawPlume(ctx, size, color, advancing) {
    const length = size * (advancing ? 1.2 : 0.85);
    const gradient = ctx.createLinearGradient(0, size * 0.18, 0, size * 0.18 + length);
    gradient.addColorStop(0, rgba(color, 0.9));
    gradient.addColorStop(0.22, rgba(color, 0.48));
    gradient.addColorStop(1, rgba(color, 0));
    ctx.beginPath();
    ctx.moveTo(-size * 0.11, size * 0.22);
    ctx.quadraticCurveTo(0, size * 0.54 + length, size * 0.11, size * 0.22);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  function drawGlyph(ctx, type, size, color, muted) {
    const normalizedType = GLYPH_PATHS[type] ? type : 'destroyer';
    const rank = GLYPH_RANK[normalizedType];
    let glyph = GLYPH_CACHE.get(normalizedType);
    if (!glyph) {
      glyph = new Path2D(GLYPH_PATHS[normalizedType]);
      GLYPH_CACHE.set(normalizedType, glyph);
    }
    const unit = size / 100;

    ctx.save();
    ctx.scale(unit, unit);
    ctx.translate(-50, -50);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.fillStyle = rgba(color, muted ? 0.14 : 0.72);
    ctx.strokeStyle = rgba(color, muted ? 0.3 : 0.98);
    ctx.lineWidth = Math.max(2.2, 4.2 - rank * 0.18);
    ctx.shadowColor = rgba(color, muted ? 0.06 : 0.48);
    ctx.shadowBlur = muted ? 0 : 11;
    ctx.fill(glyph);
    ctx.stroke(glyph);

    ctx.restore();
  }

  function drawThreat(ctx, size, color, time, critical) {
    const pulse = 0.92 + Math.sin(time * 0.0032) * 0.08;
    ctx.beginPath();
    ctx.arc(0, 0, size * (critical ? 1.25 : 1.05) * pulse, 0, Math.PI * 2);
    ctx.strokeStyle = rgba(critical ? '#ff3f52' : color, critical ? 0.56 : 0.24);
    ctx.lineWidth = critical ? 1.2 : 0.8;
    ctx.setLineDash([2, 7]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawSelection(ctx, size, color, time, radarState) {
    ctx.save();
    ctx.rotate(time * 0.00045);
    ctx.strokeStyle = rgba(color, 0.82);
    ctx.lineWidth = radarState ? 1.5 : 1.1;
    const radius = size * (radarState ? 0.92 : 0.78);
    for (let i = 0; i < 4; i += 1) {
      ctx.rotate(Math.PI / 2);
      ctx.beginPath();
      ctx.arc(0, 0, radius, -0.38, 0.38);
      ctx.stroke();
    }
    ctx.restore();
  }

  function captureDomStates() {
    state.domStates.clear();
    state.world.querySelectorAll('.unit[data-id]').forEach(element => {
      state.domStates.set(element.dataset.id, {
        selected: element.classList.contains('is-selected'),
        previewed: element.classList.contains('is-previewed'),
        radar: element.classList.contains('is-radar-target'),
        muted: element.classList.contains('is-radar-muted'),
        overdue: element.classList.contains('radar-overdue'),
      });
    });
  }

  function hitTest(clientX, clientY) {
    const game = gameState();
    if (!game || !state.stageRect || !state.worldRect) return null;
    const localX = clientX - state.stageRect.left;
    const localY = clientY - state.stageRect.top;
    const scale = currentScale();
    let best = null;
    let bestDistance = Infinity;
    const candidates = [
      ...game.units.filter(unit => unit.status !== 'destroyed').map(unit => ({
        unit,
        neutral: false,
        ...tacticalUnitPosition(unit),
        size: SHIP_SIZES[normalizeClass(unit.shipClass)] || SHIP_SIZES.destroyer,
      })),
      ...game.neutrals.map(unit => ({
        unit,
        neutral: true,
        x: unit.x,
        y: unit.y,
        size: Math.min(unit.size || 30, 34),
      })),
    ];

    candidates.forEach(candidate => {
      const point = worldPoint(candidate.x, candidate.y);
      if (!visible(point, 80)) return;
      const distance = Math.hypot(localX - point.x, localY - point.y);
      const radius = Math.max(22, candidate.size * Math.max(0.48, scale) * 0.82);
      const score = distance / radius;
      if (score < bestDistance) {
        bestDistance = score;
        best = { ...candidate, point, radius };
      }
    });
    return best && bestDistance <= 1.6 ? best : null;
  }

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  function showTooltip(hit) {
    if (!state.tooltip || !hit) return;
    const unit = hit.unit;
    const color = hit.neutral ? (unit.color || '#8399ad') : (FACTION_COLORS[unit.faction] || '#4da3ff');
    const faction = hit.neutral ? (unit.label || '中立单位') : (unit.id || '');
    state.tooltip.style.setProperty('--tooltip-color', color);
    state.tooltip.style.left = `${Math.round(hit.point.x)}px`;
    state.tooltip.style.top = `${Math.round(hit.point.y)}px`;
    state.tooltip.innerHTML = `<span>${escapeHtml(faction)}</span><strong>${escapeHtml(unit.name || unit.id)}</strong>`;
    state.tooltip.classList.add('is-visible');
  }

  function clearHover() {
    if (state.tooltip) state.tooltip.classList.remove('is-visible');
    if (!state.hoverId) return;
    state.hoverId = null;
    state.hoverHit = null;
    window.__game?.clearUnitPreview?.();
  }

  function handlePointerMove(event) {
    if (event.target.closest?.('.map-controls, .unit-detail, .command-panel, .radar-toggle, .sci-fi-hud')) {
      clearHover();
      return;
    }
    const hit = hitTest(event.clientX, event.clientY);
    const id = hit?.unit?.id || null;
    state.hoverHit = hit;
    state.hoverAt = performance.now();
    if (id !== state.hoverId) {
      state.hoverId = id;
      if (hit && !hit.neutral) window.__game?.previewUnit?.(id);
      else if (!hit) window.__game?.clearUnitPreview?.();
    }
    if (hit) showTooltip(hit);
    else if (state.tooltip) state.tooltip.classList.remove('is-visible');
  }

  function handleCanvasClick(event) {
    const liveHit = hitTest(event.clientX, event.clientY);
    const capturedHit = performance.now() - state.hoverAt <= 420 ? state.hoverHit : null;
    const capturedClientX = capturedHit ? state.stageRect.left + capturedHit.point.x : 0;
    const capturedClientY = capturedHit ? state.stageRect.top + capturedHit.point.y : 0;
    const capturedDistance = capturedHit
      ? Math.hypot(event.clientX - capturedClientX, event.clientY - capturedClientY)
      : Infinity;
    const captureEligible = capturedHit && capturedDistance <= Math.max(34, capturedHit.radius * 1.8);
    const inStage = event.clientX >= state.stageRect.left && event.clientX <= state.stageRect.right &&
      event.clientY >= state.stageRect.top && event.clientY <= state.stageRect.bottom;
    if (!inStage) return;
    if (event.target.closest?.('.map-controls, .radar-toggle, .sci-fi-hud, button')) return;
    if (event.target.closest?.('.unit-detail, .command-panel') && !captureEligible) return;
    const hit = liveHit || (captureEligible ? capturedHit : null);
    state.stage.dataset.tacticalClick = `${Math.round(event.clientX)},${Math.round(event.clientY)}`;
    state.stage.dataset.tacticalHit = hit?.unit?.id || '';
    if (!hit) return;
    event.__tacticalHandled = true;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (hit.neutral) {
      const escaped = window.CSS?.escape ? CSS.escape(hit.unit.id) : hit.unit.id;
      state.world.querySelector(`#neutralLayer .unit[data-id="${escaped}"]`)?.click();
    } else {
      window.__game?.selectUnit?.(hit.unit.id);
    }
  }

  function acquireEffect() {
    return state.effects.find(effect => !effect.active) || state.effects.reduce((oldest, effect) => {
      return effect.startedAt < oldest.startedAt ? effect : oldest;
    }, state.effects[0]);
  }

  function playEffect(type, options = {}) {
    if (!state.running || !state.unitCtx) return false;
    const effect = acquireEffect();
    Object.assign(effect, {
      active: true,
      type,
      startedAt: performance.now(),
      duration: options.duration || 900,
      unitId: options.unitId || null,
      x: options.x,
      y: options.y,
      stageX: options.stageX,
      stageY: options.stageY,
      color: options.color || '#4da3ff',
    });
    state.stage.dataset.tacticalEffects = String(state.effects.filter(item => item.active).length);
    return true;
  }

  function drawUnit(ctx, unit, time, neutral) {
    const tacticalPosition = neutral ? { x: unit.x, y: unit.y } : tacticalUnitPosition(unit);
    const x = tacticalPosition.x;
    const y = tacticalPosition.y;
    const point = worldPoint(x, y);
    const type = neutral ? 'frigate' : normalizeClass(unit.shipClass);
    const worldScale = Math.min(state.worldRect.width / WORLD_WIDTH, state.worldRect.height / WORLD_HEIGHT);
    const baseSize = neutral ? Math.min(unit.size || 30, 34) : (SHIP_SIZES[type] || SHIP_SIZES.destroyer);
    const size = baseSize * Math.max(0.24, Math.min(worldScale, 0.95));
    if (!visible(point, size * 3)) {
      state.culled += 1;
      return;
    }
    state.metrics.drawn += 1;

    const color = neutral ? (unit.color || '#8399ad') : (FACTION_COLORS[unit.faction] || '#9cb4c8');
    const domState = state.domStates.get(unit.id) || {
      selected: false,
      previewed: false,
      radar: false,
      muted: false,
      overdue: false,
    };
    const selected = domState.selected || domState.previewed;
    const critical = !neutral && unit.faction !== 'vanguard' && unit.advanceDist < 15;
    const heading = neutral ? 90 : (unit._headingDeg ?? 0);

    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(heading * Math.PI / 180);

    if (!neutral && !domState.muted && unit.faction !== 'vanguard') {
      drawThreat(ctx, size, color, time, critical || domState.overdue);
    }
    if (!neutral && !domState.muted) {
      drawPlume(ctx, size, color, unit.status === 'advancing');
    }
    drawGlyph(ctx, type, size, color, domState.muted);
    if (selected || domState.radar) drawSelection(ctx, size, domState.overdue ? '#ff3f52' : color, time, domState.radar);
    ctx.restore();
  }

  function effectPoint(effect) {
    if (effect.unitId) {
      const game = gameState();
      const unit = game?.units.find(item => item.id === effect.unitId);
      if (unit) {
        return worldPoint(
          tacticalUnitPosition(unit).x,
          tacticalUnitPosition(unit).y
        );
      }
    }
    if (Number.isFinite(effect.stageX) && Number.isFinite(effect.stageY)) {
      return { x: effect.stageX, y: effect.stageY };
    }
    return worldPoint(effect.x || 0, effect.y || 0);
  }

  function drawEffects(ctx, time) {
    state.effects.forEach(effect => {
      if (!effect.active) return;
      const progress = (time - effect.startedAt) / effect.duration;
      if (progress >= 1) {
        effect.active = false;
        return;
      }
      const point = effectPoint(effect);
      if (!point || !visible(point, 120)) return;
      const color = effect.color || '#4da3ff';
      ctx.save();
      ctx.translate(point.x, point.y);
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, progress - 0.72) / 0.28);

      if (effect.type === 'lock') {
        const acquire = Math.min(1, progress / 0.22);
        const radius = 42 - acquire * 19;
        ctx.strokeStyle = rgba(color, 0.88);
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 6]);
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        const corner = 13;
        const arm = 7;
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
          ctx.beginPath();
          ctx.moveTo(sx * corner, sy * (corner - arm));
          ctx.lineTo(sx * corner, sy * corner);
          ctx.lineTo(sx * (corner - arm), sy * corner);
          ctx.stroke();
        });
        ctx.globalAlpha *= 0.55;
        ctx.beginPath();
        ctx.moveTo(-radius - 9, 0);
        ctx.lineTo(radius + 9, 0);
        ctx.moveTo(0, -radius - 9);
        ctx.lineTo(0, radius + 9);
        ctx.stroke();
      } else if (effect.type === 'warp') {
        const radius = 8 + progress * 58;
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
        gradient.addColorStop(0, rgba('#ffffff', 0.9 * (1 - progress)));
        gradient.addColorStop(0.24, rgba(color, 0.72 * (1 - progress)));
        gradient.addColorStop(1, rgba(color, 0));
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = rgba(color, 0.72 * (1 - progress));
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.72, 0, Math.PI * 2);
        ctx.stroke();
      } else if (effect.type === 'strike') {
        const radius = 10 + progress * 46;
        ctx.strokeStyle = rgba(color, 0.9 * (1 - progress));
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-radius - 12, 0);
        ctx.lineTo(radius + 12, 0);
        ctx.moveTo(0, -radius - 12);
        ctx.lineTo(0, radius + 12);
        ctx.stroke();
        ctx.fillStyle = rgba('#ffffff', Math.max(0, 0.8 - progress * 2));
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(1, 7 * (1 - progress)), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  }

  function drawUnitLayer(time) {
    const ctx = state.unitCtx;
    ctx.clearRect(0, 0, state.stageRect.width, state.stageRect.height);
    const game = gameState();
    if (!game) return;
    state.domStateTick += 1;
    if (state.domStateTick % 3 === 1 || state.domStates.size === 0) captureDomStates();
    state.culled = 0;
    state.metrics.drawn = 0;
    const scale = currentScale();
    state.metrics.lod = scale < 0.19 ? 'compact-ships' : scale < 0.42 ? 'unit' : 'detail';
    buildTacticalLayout(game);
    game.units.forEach(unit => {
      if (unit.status !== 'destroyed') drawUnit(ctx, unit, time, false);
    });
    if (scale >= 0.28) game.neutrals.forEach(unit => drawUnit(ctx, unit, time, true));
    drawEffects(ctx, time);
  }

  function frame(time) {
    if (!state.running) return;
    const quality = document.body.dataset.quality || 'high';
    const targetInterval = quality === 'low' ? 33 : quality === 'medium' ? 22 : 0;
    const frameDue = !targetInterval || time - state.lastFrame >= targetInterval;
    if (!document.hidden && state.visible && frameDue && state.stageRect && state.worldRect) {
      const frameStarted = performance.now();
      if (state.staticDirty || time - state.lastFrame > 1000) {
        drawStaticLayer();
        state.staticDirty = false;
      }
      drawUnitLayer(time);
      state.lastFrame = time;
      state.frames += 1;
      const frameMs = performance.now() - frameStarted;
      const samples = state.metrics.samples;
      samples.push(frameMs);
      if (samples.length > 90) samples.shift();
      state.metrics.frameMs = frameMs;
      state.metrics.averageFrameMs = samples.reduce((sum, value) => sum + value, 0) / samples.length;
      state.metrics.fps = time > 0 && state.lastMetricTime
        ? Math.min(60, 1000 / Math.max(1, time - state.lastMetricTime))
        : 60;
      state.lastMetricTime = time;
      if (state.frames % 30 === 0) {
        state.stage.dataset.tacticalLod = state.metrics.lod;
        state.stage.dataset.tacticalFps = state.metrics.fps.toFixed(1);
        state.stage.dataset.tacticalFrameMs = state.metrics.averageFrameMs.toFixed(2);
        state.stage.dataset.tacticalDrawn = String(state.metrics.drawn);
        state.stage.dataset.tacticalCulled = String(state.culled);
        state.stage.dataset.tacticalEffects = String(state.effects.filter(effect => effect.active).length);
      }
    }
    state.frameId = requestAnimationFrame(frame);
  }

  function start() {
    if (state.running) return;
    state.running = true;
    document.documentElement.classList.add('canvas-tactical-rendering');
    measure();
    state.frameId = requestAnimationFrame(frame);
  }

  function stop() {
    state.running = false;
    cancelAnimationFrame(state.frameId);
    document.documentElement.classList.remove('canvas-tactical-rendering');
  }

  function setup() {
    state.stage = document.querySelector('#mapStage');
    state.world = document.querySelector('#mapWorld');
    state.staticCanvas = document.querySelector('#tacticalStaticCanvas');
    state.unitCanvas = document.querySelector('#tacticalUnitCanvas');
    state.tooltip = document.querySelector('#tacticalTooltip');
    if (!state.stage || !state.world || !state.staticCanvas || !state.unitCanvas) return false;
    state.staticCtx = state.staticCanvas.getContext('2d', { alpha: true, desynchronized: true });
    state.unitCtx = state.unitCanvas.getContext('2d', { alpha: true, desynchronized: true });

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(state.stage);
    const intersectionObserver = new IntersectionObserver(entries => {
      state.visible = entries[0]?.isIntersecting !== false;
      if (state.visible) measure();
    }, { rootMargin: '120px' });
    intersectionObserver.observe(state.stage);
    const transformObserver = new MutationObserver(() => {
      measure();
    });
    transformObserver.observe(state.world, { attributes: true, attributeFilter: ['style', 'class'] });
    window.addEventListener('resize', measure, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) measure();
    });
    state.stage.addEventListener('pointermove', handlePointerMove);
    state.stage.addEventListener('pointerleave', clearHover);
    document.addEventListener('click', handleCanvasClick, { capture: true });
    start();
    return true;
  }

  function waitForMap() {
    if (setup()) return;
    window.setTimeout(waitForMap, 80);
  }

  window.TacticalRenderer = {
    start,
    stop,
    invalidate: measure,
    hitTest,
    playEffect,
    getStats() {
      return {
        running: state.running,
        frames: state.frames,
        culledLastFrame: state.culled,
        drawnLastFrame: state.metrics.drawn,
        lod: state.metrics.lod,
        frameMs: Number(state.metrics.frameMs.toFixed(2)),
        averageFrameMs: Number(state.metrics.averageFrameMs.toFixed(2)),
        fps: Number(state.metrics.fps.toFixed(1)),
        activeEffects: state.effects.filter(effect => effect.active).length,
        staticRenders: state.metrics.staticRenders,
        dpr: state.dpr,
        canvas: state.unitCanvas ? [state.unitCanvas.width, state.unitCanvas.height] : null,
      };
    },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForMap, { once: true });
  } else {
    waitForMap();
  }
})();
