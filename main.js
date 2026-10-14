/* TTW · Error 503 — Piedra Movediza en ASCII y Movediza Farm (JS vanilla) */
(function () {
  'use strict';

  var reduced = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var fmt = function (v) { return Math.floor(v).toLocaleString('es-AR'); };

  /* ---------- Piedra Movediza en ASCII ---------- */

  var ROCK = [
    "          _.--~~~--._",
    "       .-'  x   x    '~--.._",
    "     /    x   x   x   x     '~--.._",
    "    |   x   x   x   x   x   x      '~-._",
    "    |  x    x   x   x   x   x   x      '.",
    "    |    x   x   x   x   x   x   x  _.-'",
    "     \\  x   x   x   x   x   x   _.-'",
    "      \\    x   x   x   x    _.-'",
    "       \\  x   x   x    _.-'",
    "        '.  x   x  _.-'",
    "          '-.._.-'"
  ];
  var TEX = ['.', ':', "'", '·', '`', ' ', '.', ':'];
  var ESTADOS = [
    'oscilando (como siempre)',
    'se movió. no se cae.',
    'tranqui, es la réplica de 2007',
    'ni así levantan los servers',
    'la piedra aguanta. vos inscribite.'
  ];

  var rockPre = document.getElementById('rock-ascii');
  var rockEstado = document.getElementById('rock-estado');
  var rockPushes = document.getElementById('rock-pushes');
  var rockPush = document.getElementById('rock-push');
  var pushes = 0;

  // Las 'x' del sprite rotan entre caracteres de textura según el tick
  function renderRock(t) {
    var n = 0;
    rockPre.textContent = ROCK.map(function (line) {
      return line.replace(/x/g, function () {
        n += 1;
        return TEX[(n * 7 + t * 3 + ((n * t) % 5)) % TEX.length];
      });
    }).join('\n');
  }

  if (rockPush && rockPre) {
    rockPush.addEventListener('click', function () {
      pushes += 1;
      // Alternar entre dos keyframes idénticos reinicia la animación en cada click
      rockPre.classList.remove('push-a', 'push-b');
      rockPre.classList.add(pushes % 2 ? 'push-a' : 'push-b');
      if (rockPushes) rockPushes.textContent = pushes;
      if (rockEstado) rockEstado.textContent = ESTADOS[Math.min(pushes, ESTADOS.length - 1)];
    });
  }

  /* ---------- Movediza Farm ---------- */

  var UPS = [
    { id: 'cafe', base: 15, ps: 1, pc: 0 },
    { id: 'prompt', base: 40, ps: 0, pc: 1 },
    { id: 'agente', base: 120, ps: 8, pc: 0 },
    { id: 'cluster', base: 900, ps: 40, pc: 0 },
    { id: 'server', base: 5000, ps: 0, pc: 0 }
  ];
  var MILES = [
    [0, 'la piedra te mira. clickeala.'],
    [50, 'tembló un poquito. sigue firme.'],
    [500, 'ya farmeaste más que los servers.'],
    [5000, 'context window: llenándose.'],
    [50000, '1912 vibes. cuidado.'],
    [500000, 'la Movediza ganó la hackatón.']
  ];
  var STONE_TEX = ['.', ':', "'", '·', '`'];
  var STORAGE_KEY = 'ttw-movediza-farm-v1';
  var MAX_TOKENS = 60;
  var MAX_PLUS = 12;

  var stage = document.getElementById('farm-stage');
  var rockBtn = document.getElementById('farm-rock');
  var stone = document.getElementById('farm-stone');
  var countEl = document.getElementById('farm-count');
  var perSecEl = document.getElementById('farm-persec');
  var perClickEl = document.getElementById('farm-perclick');
  var milestoneEl = document.getElementById('farm-milestone');
  var upgradeBtns = document.querySelectorAll('.upgrade[data-id]');

  var state = { tokens: 0, total: 0, owned: { cafe: 0, prompt: 0, agente: 0, cluster: 0, server: 0 } };
  var clicks = 0;
  var stoneTemplate = stone ? stone.textContent : '';

  function num(v) { return typeof v === 'number' && isFinite(v) && v >= 0 ? v : 0; }

  function load() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var data = JSON.parse(raw);
      state.tokens = num(data.tokens);
      state.total = num(data.total);
      UPS.forEach(function (u) {
        state.owned[u.id] = Math.floor(num(data.owned && data.owned[u.id]));
      });
    } catch (e) { /* sin persistencia: arranca de cero */ }
  }

  function save() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* storage lleno o bloqueado: seguimos sin guardar */ }
  }

  function perSec() {
    return UPS.reduce(function (s, u) { return s + u.ps * state.owned[u.id]; }, 0);
  }
  function perClick() {
    return 1 + UPS.reduce(function (s, u) { return s + u.pc * state.owned[u.id]; }, 0);
  }
  function cost(u) {
    return Math.ceil(u.base * Math.pow(1.15, state.owned[u.id]));
  }
  function findUp(id) {
    for (var i = 0; i < UPS.length; i++) if (UPS[i].id === id) return UPS[i];
    return null;
  }
  function milestone() {
    var msg = MILES[0][1];
    MILES.forEach(function (m) { if (state.total >= m[0]) msg = m[1]; });
    return msg;
  }

  function setText(el, txt) {
    if (el && el.textContent !== txt) el.textContent = txt;
  }

  function render() {
    setText(countEl, fmt(state.tokens));
    setText(perSecEl, fmt(perSec()));
    setText(perClickEl, String(perClick()));
    // El hito vive en una región aria-live: solo se toca cuando cambia
    setText(milestoneEl, milestone());
    upgradeBtns.forEach(function (btn) {
      var u = findUp(btn.getAttribute('data-id'));
      if (!u) return;
      var c = cost(u);
      setText(btn.querySelector('.upgrade-owned'), '×' + state.owned[u.id]);
      setText(btn.querySelector('.upgrade-cost'), fmt(c));
      var locked = state.tokens < c;
      if (btn.disabled !== locked) btn.disabled = locked;
    });
  }

  function removeOnEnd(el) {
    el.addEventListener('animationend', function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
  }

  // Cada click crea su propia ráfaga de 8 tokens en abanico
  function burst() {
    var live = stage.querySelectorAll('.token');
    for (var i = 0; i < live.length && live.length - i + 8 > MAX_TOKENS; i++) {
      stage.removeChild(live[i]);
    }
    for (var k = 0; k < 8; k++) {
      var ang = (-90 + k * 45 + 12 + (Math.random() * 20 - 10)) * Math.PI / 180;
      var dist = 0.85 + Math.random() * 0.3;
      var tok = document.createElement('span');
      tok.className = 'token';
      tok.setAttribute('aria-hidden', 'true');
      tok.textContent = '◆ tok';
      tok.style.setProperty('--dx', Math.round(Math.cos(ang) * 110 * dist) + 'px');
      tok.style.setProperty('--dy', Math.round(Math.sin(ang) * 95 * dist - 25) + 'px');
      removeOnEnd(tok);
      stage.appendChild(tok);
    }
    var plusLive = stage.querySelectorAll('.plus');
    if (plusLive.length >= MAX_PLUS) stage.removeChild(plusLive[0]);
    var plus = document.createElement('span');
    plus.className = 'plus';
    plus.setAttribute('aria-hidden', 'true');
    plus.textContent = '+' + perClick();
    removeOnEnd(plus);
    stage.appendChild(plus);
  }

  function renderStone(t) {
    var n = 0;
    // Solo rotan los '.' y ':' sueltos (textura); los del contorno quedan
    stone.textContent = stoneTemplate.replace(/(^|[ ])[.:](?=[ ]|$)/gm, function (m, pre) {
      n += 1;
      return pre + STONE_TEX[(n * 3 + t) % STONE_TEX.length];
    });
  }

  if (stage && rockBtn && stone) {
    load();

    rockBtn.addEventListener('click', function () {
      var pc = perClick();
      state.tokens += pc;
      state.total += pc;
      clicks += 1;
      stone.classList.remove('bonk-a', 'bonk-b');
      stone.classList.add(clicks % 2 ? 'bonk-a' : 'bonk-b');
      burst();
      render();
    });

    upgradeBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var u = findUp(btn.getAttribute('data-id'));
        if (!u) return;
        var c = cost(u);
        if (state.tokens < c) return;
        state.tokens -= c;
        state.owned[u.id] += 1;
        render();
        save();
      });
    });

    setInterval(function () {
      var ps = perSec();
      if (ps > 0) {
        state.tokens += ps / 10;
        state.total += ps / 10;
      }
      render();
    }, 100);

    setInterval(save, 2000);
    document.addEventListener('visibilitychange', save);
    render();
  }

  /* ---------- Textura viva (450ms), apagada con movimiento reducido ---------- */

  var tick = 0;
  setInterval(function () {
    if (reduced.matches) return;
    tick += 1;
    if (rockPre) renderRock(tick);
    if (stone) renderStone(tick);
  }, 450);
})();
