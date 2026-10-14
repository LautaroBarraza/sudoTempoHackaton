/* TTW · Error 503 — Piedra Movediza en ASCII con parallax, Movediza Farm y kernel panic (JS vanilla) */
(function () {
  'use strict';

  var reduced = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var fmt = function (v) { return Math.floor(v).toLocaleString('es-AR'); };

  // Intervalos que se pausan con la pestaña oculta y se retoman al volver
  var loops = [];
  function loop(fn, ms) {
    var l = { fn: fn, ms: ms, id: null };
    loops.push(l);
    if (!document.hidden) l.id = setInterval(fn, ms);
  }
  document.addEventListener('visibilitychange', function () {
    loops.forEach(function (l) {
      clearInterval(l.id);
      l.id = document.hidden ? null : setInterval(l.fn, l.ms);
    });
  });

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

  /* ---------- Ciudad de fondo + parallax con el mouse ---------- */

  var scene = document.getElementById('scene');
  var plxClouds = document.getElementById('plx-clouds');
  var plxStars = document.getElementById('plx-stars');
  var plxCity = document.getElementById('plx-city');
  var plxFront = document.getElementById('plx-front');
  var sceneAngle = document.getElementById('scene-angle');
  var plxPend = null;
  var plxRaf = 0;

  function px(v) { return v.toFixed(1) + 'px'; }
  function clamp1(v) { return Math.max(-1, Math.min(1, v)); }
  // Cada capa es opcional: si falta una (HTML viejo en caché), las demás siguen
  function setTransform(el, v) { if (el) el.style.transform = v; }

  // Cada capa a su velocidad: lo lejano se mueve más y la piedra va en sentido contrario.
  // La ciudad repite el translate(-50%, 0) del CSS y suma el desplazamiento aparte (sin calc()),
  // así la transición interpola función por función en todos los navegadores
  function setParallax(mx, my) {
    setTransform(plxClouds, 'translate(' + px(-mx * 60) + ', ' + px(-my * 14) + ')');
    setTransform(plxCity, 'translate(-50%, 0) translate(' + px(-mx * 36) + ', ' + px(-my * 10) + ') rotate(' + (mx * 1.2).toFixed(2) + 'deg)');
    setTransform(plxStars, 'translate(' + px(-mx * 18) + ', ' + px(-my * 8) + ')');
    setTransform(plxFront, 'translate(' + px(mx * 8) + ', ' + px(my * 4) + ')');
    var ang = mx === 0 && my === 0 ? 0 : Math.round((Math.atan2(-my, mx) * 180 / Math.PI + 360) % 360) % 360;
    setText(sceneAngle, String(ang));
  }

  // Sin transform inline cada capa vuelve a su posición de CSS (la ciudad, centrada)
  function resetParallax() {
    if (plxRaf) cancelAnimationFrame(plxRaf);
    plxRaf = 0;
    plxPend = null;
    [plxClouds, plxStars, plxCity, plxFront].forEach(function (el) { setTransform(el, ''); });
    setText(sceneAngle, '0');
  }

  if (scene && (plxClouds || plxStars || plxCity || plxFront)) {
    // Pointer events para distinguir el mouse: en touch y lápiz la escena queda quieta
    scene.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse' || reduced.matches) return;
      var r = scene.getBoundingClientRect();
      plxPend = [
        clamp1(((e.clientX - r.left) / r.width) * 2 - 1),
        clamp1(((e.clientY - r.top) / r.height) * 2 - 1)
      ];
      // Como máximo una actualización por frame
      if (!plxRaf) {
        plxRaf = requestAnimationFrame(function () {
          plxRaf = 0;
          if (plxPend) setParallax(plxPend[0], plxPend[1]);
        });
      }
    });
    scene.addEventListener('pointerleave', resetParallax);
    if (reduced.addEventListener) reduced.addEventListener('change', resetParallax);
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

  // Explosión / prestigio: la piedra aguanta thresh(replicas) tokens desde la última réplica.
  // El umbral crece geométrico y el multiplicador lineal: cada ciclo tarda un poco más
  var THRESH_BASE = 25000;
  var THRESH_GROWTH = 3;
  var PHASES = ['ok', 'boom', 'rubble'];
  var BOOM_MS = 1900;
  var BOOM_MS_REDUCED = 1000;
  var CRACK = ['/', '\\', 'x', '%', '/', '#', '\\'];
  var FRAG_COLORS = 5;

  var stage = document.getElementById('farm-stage');
  var rockBtn = document.getElementById('farm-rock');
  var stone = document.getElementById('farm-stone');
  var countEl = document.getElementById('farm-count');
  var perSecEl = document.getElementById('farm-persec');
  var perClickEl = document.getElementById('farm-perclick');
  var milestoneEl = document.getElementById('farm-milestone');
  var upgradeBtns = document.querySelectorAll('.upgrade[data-id]');
  var farmMain = document.querySelector('.farm-main');
  var sway = document.querySelector('.farm-sway');
  var integPct = document.getElementById('farm-integ-pct');
  var integBar = document.getElementById('farm-integ-bar');
  var integWarn = document.getElementById('farm-integ-warn');
  var boomEl = document.getElementById('farm-boom');
  var boomFrags = document.getElementById('boom-frags');
  var rubbleEl = document.getElementById('farm-rubble');
  var rebuildBtn = document.getElementById('farm-rebuild');
  var nextEl = document.getElementById('farm-next');
  var nextHintEl = document.getElementById('farm-next-hint');
  // Sin estos tres (HTML viejo) la piedra no explota: el clicker básico sigue andando igual
  var canBoom = !!(boomEl && rubbleEl && rebuildBtn);

  var state = {
    tokens: 0,
    total: 0,
    owned: { cafe: 0, prompt: 0, agente: 0, cluster: 0, server: 0 },
    phase: 'ok',
    since: 0,
    replicas: 0
  };
  var clicks = 0;
  var boomTimer = null;
  var stoneTemplate = stone ? stone.textContent : '';
  var stoneRows = stoneTemplate.split('\n');
  var stoneTick = 0;
  var stoneCracks = -1;

  // Huecos que se pueden agrietar: '.', ':' y espacios del interior de cada línea,
  // con 2 de margen a la izquierda y 3 a la derecha
  var CRACK_SPOTS = [];
  stoneRows.forEach(function (l, y) {
    var a = l.search(/\S/) + 2;
    var b = l.replace(/\s+$/, '').length - 3;
    for (var x = a; x < b; x++) {
      if (l[x] === '.' || l[x] === ':' || l[x] === ' ') CRACK_SPOTS.push([y, x]);
    }
  });
  // Orden pseudoaleatorio pero fijo: las grietas crecen siempre igual, no parpadean
  CRACK_SPOTS.sort(function (p, q) {
    return ((p[0] * 7 + p[1] * 13) % 17) - ((q[0] * 7 + q[1] * 13) % 17);
  });

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
      // Los guardados viejos no tienen phase/since/replicas: arrancan sanos
      state.phase = PHASES.indexOf(data.phase) !== -1 ? data.phase : 'ok';
      state.replicas = Math.floor(num(data.replicas));
      state.since = Math.min(num(data.since), thresh(state.replicas));
      // Recarga en medio de la explosión: el bonus ya se cobró al explotar, quedan los escombros
      if (state.phase === 'boom') state.phase = 'rubble';
      if (state.phase === 'rubble') state.since = thresh(state.replicas);
      // Escombros guardados pero sin botón para reconstruir: se reconstruye sola
      if (state.phase !== 'ok' && !canBoom) {
        state.phase = 'ok';
        state.since = 0;
        state.replicas += 1;
      }
    } catch (e) { /* sin persistencia: arranca de cero */ }
  }

  function save() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* storage lleno o bloqueado: seguimos sin guardar */ }
  }

  function mult() { return 1 + state.replicas; }
  function thresh(r) { return THRESH_BASE * Math.pow(THRESH_GROWTH, r); }
  // Indemnización: un décimo del umbral de esa réplica
  function bonus(r) { return thresh(r) / 10; }
  function perSec() {
    return mult() * UPS.reduce(function (s, u) { return s + u.ps * state.owned[u.id]; }, 0);
  }
  function perClick() {
    return mult() * (1 + UPS.reduce(function (s, u) { return s + u.pc * state.owned[u.id]; }, 0));
  }
  function cost(u) {
    return Math.ceil(u.base * Math.pow(1.15, state.owned[u.id]));
  }
  function findUp(id) {
    for (var i = 0; i < UPS.length; i++) if (UPS[i].id === id) return UPS[i];
    return null;
  }
  function integ() { return Math.max(0, 1 - state.since / thresh(state.replicas)); }
  // Un decimal redondeado hacia abajo: el primer token ya baja a 99,9%.
  // 100% solo sin daño y 0% solo con la piedra explotada (el 1e-9 absorbe errores de coma flotante)
  function pctText(i) {
    if (state.phase !== 'ok') return '0%';
    if (state.since <= 0) return '100%';
    var v = Math.floor(i * 1000 + 1e-9) / 10;
    return v.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
  }
  function milestone(i) {
    if (state.phase === 'boom') return '¡BOOM! la Movediza explotó.';
    if (state.phase === 'rubble') return 'explotó (otra vez). el municipio te indemnizó con ' + fmt(bonus(state.replicas)) + ' tokens.';
    if (state.replicas > 0 && i > 0.3) return 'réplica #' + state.replicas + ' en pie · x' + mult() + '. a romperla de nuevo.';
    var msg = MILES[0][1];
    MILES.forEach(function (m) { if (state.total >= m[0]) msg = m[1]; });
    return msg;
  }
  function warnText(i) {
    if (state.phase === 'boom') return '[BOOM] integridad: 0%';
    if (state.phase === 'rubble') return '[DEAD] piedra no encontrada';
    if (i <= 0.1) return '[CRIT] va a explotar. seguí clickeando.';
    if (i <= 0.3) return '[WARN] grietas detectadas en la piedra';
    return '';
  }
  // Celdas llenas hacia arriba: la barra pierde la primera celda al bajar de 13/14
  // y la última recién al explotar
  function bar(i) {
    var n = Math.max(0, Math.min(14, Math.ceil(i * 14 - 1e-9)));
    return new Array(n + 1).join('█') + new Array(14 - n + 1).join('░');
  }

  function setText(el, txt) {
    if (el && el.textContent !== txt) el.textContent = txt;
  }
  function toggle(el, cls, on) {
    if (el) el.classList.toggle(cls, on);
  }

  // Todo ingreso (click o tick) pasa por acá; solo con la piedra en pie suma integridad perdida
  function gain(n) {
    state.tokens += n;
    state.total += n;
    if (state.phase !== 'ok') return;
    state.since += n;
    if (canBoom && state.since >= thresh(state.replicas)) explode();
  }

  function render() {
    var i = integ();
    var ok = state.phase === 'ok';
    setText(countEl, fmt(state.tokens));
    setText(perSecEl, fmt(perSec()));
    setText(perClickEl, String(perClick()));
    // El hito vive en una región aria-live: solo se toca cuando cambia
    setText(milestoneEl, milestone(i));
    upgradeBtns.forEach(function (btn) {
      var u = findUp(btn.getAttribute('data-id'));
      if (!u) return;
      var c = cost(u);
      setText(btn.querySelector('.upgrade-owned'), '×' + state.owned[u.id]);
      setText(btn.querySelector('.upgrade-cost'), fmt(c));
      var locked = state.tokens < c;
      if (btn.disabled !== locked) btn.disabled = locked;
    });

    // Integridad: porcentaje, barra, aviso, color y temblor
    setText(integPct, pctText(i));
    setText(integBar, bar(i));
    setText(integWarn, warnText(i));
    var low = !ok || i <= 0.2;
    toggle(farmMain, 'integ-mid', !low && i <= 0.5);
    toggle(farmMain, 'integ-low', low);
    toggle(sway, 'shake-2', ok && i <= 0.12);
    toggle(sway, 'shake-1', ok && i <= 0.3 && i > 0.12);
    setText(nextEl, 'réplica #' + (state.replicas + 1) + ' · multiplicador x' + (state.replicas + 2));
    setText(nextHintEl, 'la próxima aguanta hasta ' + fmt(thresh(state.replicas + 1)) + ' tokens.');

    // Las grietas solo se redibujan cuando cambia su cantidad
    var cracks = ok && i < 0.6 ? Math.floor(((0.6 - i) / 0.6) * CRACK_SPOTS.length) : 0;
    if (cracks !== stoneCracks) {
      stoneCracks = cracks;
      paintStone();
    }
  }

  function removeOnEnd(el) {
    el.addEventListener('animationend', function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
  }

  // Píldora ◆ tok que sale del centro de la piedra hacia (cos·110, sin·95 − 25)
  function token(ang, dist, cls) {
    var tok = document.createElement('span');
    tok.className = cls ? 'token ' + cls : 'token';
    tok.setAttribute('aria-hidden', 'true');
    tok.textContent = '◆ tok';
    tok.style.setProperty('--dx', Math.round(Math.cos(ang) * 110 * dist) + 'px');
    tok.style.setProperty('--dy', Math.round(Math.sin(ang) * 95 * dist - 25) + 'px');
    removeOnEnd(tok);
    stage.appendChild(tok);
  }

  // Cada click crea su propia ráfaga de 8 tokens en abanico
  function burst() {
    var live = stage.querySelectorAll('.token');
    for (var i = 0; i < live.length && live.length - i + 8 > MAX_TOKENS; i++) {
      stage.removeChild(live[i]);
    }
    for (var k = 0; k < 8; k++) {
      token((-90 + k * 45 + 12 + (Math.random() * 20 - 10)) * Math.PI / 180, 0.85 + Math.random() * 0.3);
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

  // Textura (rota con el tick) y encima las grietas, en posiciones fijas
  function paintStone() {
    var n = 0;
    var txt = !stoneTick ? stoneTemplate : stoneTemplate.replace(/(^|[ ])[.:](?=[ ]|$)/gm, function (m, pre) {
      n += 1;
      return pre + STONE_TEX[(n * 3 + stoneTick) % STONE_TEX.length];
    });
    if (stoneCracks > 0) {
      var rows = txt.split('\n').map(function (l) { return l.split(''); });
      for (var i = 0; i < stoneCracks; i++) {
        rows[CRACK_SPOTS[i][0]][CRACK_SPOTS[i][1]] = CRACK[i % CRACK.length];
      }
      txt = rows.map(function (r) { return r.join(''); }).join('\n');
    }
    setText(stone, txt);
  }

  function renderStone(t) {
    stoneTick = t;
    paintStone();
  }

  // Muestra el botón, la explosión o los escombros según la fase
  function showPhase() {
    var ph = state.phase;
    rockBtn.hidden = ph !== 'ok';
    if (boomEl) boomEl.hidden = ph !== 'boom';
    if (rubbleEl) rubbleEl.hidden = ph !== 'rubble';
    stage.classList.toggle('is-boom', ph === 'boom');
  }

  // Cada carácter de la mini piedra (48) pasa a ser un fragmento que sale volando
  function buildFrags() {
    if (!boomFrags) return;
    var frag = document.createDocumentFragment();
    stoneRows.forEach(function (l, y) {
      for (var x = 0; x < l.length; x++) {
        if (l[x] === ' ') continue;
        // Ángulo desde el centro de la piedra (col 10, fila 2.5), con la fila ×2 por el aspecto
        var deg = (Math.atan2(-(y - 2.5) * 2, x - 10) * 180 / Math.PI + 360) % 360;
        var k = Math.round(deg / 45) % 8;
        var d = (x * 7 + y * 3) % 3;
        var s = document.createElement('span');
        s.className = 'frag frag-c' + ((x + y) % FRAG_COLORS);
        s.textContent = l[x];
        s.style.left = x + 'ch';
        s.style.top = (y * 1.12).toFixed(2) + 'em';
        s.style.setProperty('--anim', 'e' + k + d);
        s.style.setProperty('--dur', (1.1 + d * 0.25).toFixed(2) + 's');
        s.style.setProperty('--delay', (((x + y) % 5) * 0.03).toFixed(2) + 's');
        frag.appendChild(s);
      }
    });
    boomFrags.textContent = '';
    boomFrags.appendChild(frag);
  }

  // Lluvia de la explosión: 3 anillos de 8 (los delays y duraciones van por clase)
  function boomRain() {
    for (var r = 0; r < 3; r++) {
      for (var k = 0; k < 8; k++) token((-90 + k * 45 + 12) * Math.PI / 180, 1, 'ring-' + r);
    }
  }

  // Al pasar a escombros no queda ningún nodo de la explosión colgado
  function clearBoom() {
    if (boomFrags) boomFrags.textContent = '';
    stage.querySelectorAll('.token, .plus').forEach(function (el) { stage.removeChild(el); });
  }

  function explode() {
    var hadFocus = document.activeElement === rockBtn;
    state.phase = 'boom';
    state.since = thresh(state.replicas);
    // Indemnización del municipio (replicas sube recién al reconstruir)
    state.tokens += bonus(state.replicas);
    state.total += bonus(state.replicas);
    buildFrags();
    showPhase();
    boomRain();
    render();
    save();
    clearTimeout(boomTimer);
    boomTimer = setTimeout(function () {
      state.phase = 'rubble';
      clearBoom();
      showPhase();
      render();
      save();
      // Si se estaba usando con teclado, el foco sigue en el único control de la zona
      if (hadFocus) rebuildBtn.focus({ preventScroll: true });
    }, reduced.matches ? BOOM_MS_REDUCED : BOOM_MS);
  }

  // Lo único imprescindible es la piedra: integridad, explosión y escombros son opcionales
  if (stage && rockBtn && stone) {
    load();

    rockBtn.addEventListener('click', function () {
      if (state.phase !== 'ok') return;
      var pc = perClick();
      clicks += 1;
      stone.classList.remove('bonk-a', 'bonk-b');
      stone.classList.add(clicks % 2 ? 'bonk-a' : 'bonk-b');
      burst();
      gain(pc);
      render();
    });

    if (rebuildBtn) rebuildBtn.addEventListener('click', function () {
      if (state.phase !== 'rubble') return;
      state.phase = 'ok';
      state.since = 0;
      state.replicas += 1;
      showPhase();
      render();
      save();
      rockBtn.focus({ preventScroll: true });
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

    loop(function () {
      var ps = perSec();
      if (ps > 0) gain(ps / 10);
      render();
    }, 100);

    loop(save, 2000);
    document.addEventListener('visibilitychange', save);
    showPhase();
    render();
  }

  /* ---------- Textura viva (450ms), apagada con movimiento reducido ---------- */

  var tick = 0;
  loop(function () {
    if (reduced.matches) return;
    tick += 1;
    if (rockPre) renderRock(tick);
    if (stone) renderStone(tick);
  }, 450);

  /* ---------- sudo rm -rf: kernel panic (puro teatro, no borra nada) ---------- */

  // Colores por clase: pl-white, pl-w, pl-y, pl-r, pl-d, pl-g
  var PANIC = [
    ['$ sudo rm -rf /* --no-preserve-root', 'white'],
    ['[    3.141592] rm: borrando /home/tandiltechweek ...', 'w'],
    ['[    3.271828] rm: borrando /var/www/agenda ...', 'w'],
    ['[    3.300014] rm: borrando /etc/sponsors ...', 'w'],
    ['[    3.315000] rm: borrando /srv/movediza_farm/tokens ...', 'w'],
    ['[    3.333333] rm: borrando /usr/share/mate ...', 'w'],
    ['[    3.999999] rm: borrando /boot ... (¿en serio?)', 'w'],
    ['[    4.000001] EXT4-fs error (device sda1): ext4_lookup: la piedra se movió de más', 'y'],
    ['[    4.100000] systemd[1]: Failed to start servers-de-la-hackaton.service (otra vez)', 'y'],
    ['[    4.200000] Kernel panic - not syncing: VFS: Unable to mount root fs on unknown-block(0,0)', 'r'],
    ['[    4.200001] CPU: 0 PID: 1415 Comm: hackaton Not tainted 6.14.15-tandil #1415', 'w'],
    ['[    4.200002] Hardware name: Tandil Tech Week / UNICEN Campus, BIOS 14.10.2026', 'w'],
    ['[    4.200003] Call Trace:', 'w'],
    ['[    4.200004]  <TASK>', 'd'],
    ['[    4.200005]  dump_stack_lvl+0x14/0x15', 'd'],
    ['[    4.200006]  servers_de_la_hackaton+0x0/0x0 [nunca levantaron]', 'd'],
    ['[    4.200007]  panic+0x1912/0x2007', 'd'],
    ['[    4.200008]  </TASK>', 'd'],
    ['[    4.200009] ---[ end Kernel panic - not syncing: VFS: Unable to mount root fs ]---', 'r'],
    [' ', 'w'],
    ['BusyBox v1.36.1 (Tandil) built-in shell (ash)', 'w'],
    ["Enter 'help' for a list of built-in commands.", 'w'],
    [' ', 'w'],
    ['Borraste todo. No hay backup ni rollback. Para volver escribí: inscribirme ↵', 'g']
  ];
  var OK_CMDS = ['inscribirme', 'sudo inscribirme', 'inscribirse', 'sudo inscribirse'];
  var RESTORE = [
    ['[  OK  ] Restaurando /home/tandiltechweek', 'g'],
    ['[  OK  ] Montando agenda, speakers y sponsors', 'g'],
    ['[  OK  ] Recuperando tokens farmeados (casi todos)', 'g'],
    ['[  OK  ] Cebando mate', 'g'],
    ['Sistema restaurado. Volviendo a la Tech Week...', 'white']
  ];
  var LIVE_MSG = 'Kernel panic. Escribí inscribirme para restaurar.';
  var RESTORED_MSG = 'sistema restaurado ✓ — ahora sí, inscribite.';

  var rmBtn = document.getElementById('rm-btn');
  var rmMicro = document.getElementById('rm-micro');
  var panic = document.getElementById('panic');
  var panicLog = document.getElementById('panic-log');
  var panicPrompt = document.getElementById('panic-prompt');
  var panicHint = document.getElementById('panic-hint');
  var panicInput = document.getElementById('initramfs');
  var panicLive = document.getElementById('panic-live');
  var page = document.querySelector('.page');
  var signup = document.getElementById('inscripcion');
  var cta = document.querySelector('.signup .cta');
  var panicTimers = [];
  var panicOpen = false;

  function later(fn, ms) { panicTimers.push(setTimeout(fn, ms)); }
  function clearPanicTimers() {
    panicTimers.forEach(clearTimeout);
    panicTimers = [];
  }

  // Todo el texto va con textContent: lo que escribe el usuario nunca se interpreta como HTML
  function panicLine(text, color) {
    var div = document.createElement('div');
    div.className = 'panic-line pl-' + color;
    div.textContent = text;
    panicLog.appendChild(div);
    panic.scrollTop = panic.scrollHeight;
  }

  function showPrompt() {
    panicPrompt.hidden = false;
    panicHint.hidden = false;
    panicInput.focus();
    panic.scrollTop = panic.scrollHeight;
  }

  function startCrash() {
    // Cada apertura arranca de cero: sin timers ni líneas de la vez anterior
    clearPanicTimers();
    panicLog.textContent = '';
    panicInput.value = '';
    panicPrompt.hidden = true;
    panicHint.hidden = true;

    panicOpen = true;
    document.body.classList.add('is-panic');
    if (page) page.inert = true;
    panic.hidden = false;
    // Reiniciar el parpadeo CRT aunque la clase ya estuviera puesta
    panic.classList.remove('is-crt');
    void panic.offsetWidth;
    panic.classList.add('is-crt');
    panic.focus();

    // Vaciar y volver a escribir hace que se anuncie también en la segunda apertura
    panicLive.textContent = '';
    later(function () { panicLive.textContent = LIVE_MSG; }, 100);

    if (reduced.matches) {
      PANIC.forEach(function (l) { panicLine(l[0], l[1]); });
      showPrompt();
      return;
    }
    PANIC.forEach(function (l, i) {
      later(function () {
        panicLine(l[0], l[1]);
        if (i === PANIC.length - 1) showPrompt();
      }, 110 * (i + 1));
    });
  }

  function closeCrash() {
    clearPanicTimers();
    panicOpen = false;
    panic.hidden = true;
    panic.classList.remove('is-crt');
    panicLive.textContent = '';
    document.body.classList.remove('is-panic');
    if (page) page.inert = false;
    if (rmMicro) rmMicro.textContent = RESTORED_MSG;
    rmBtn.focus({ preventScroll: true });
    if (signup) signup.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'start' });
    if (cta) {
      cta.classList.remove('is-pulse');
      void cta.offsetWidth;
      cta.classList.add('is-pulse');
    }
  }

  function restore() {
    // El foco pasa al overlay antes de ocultar el input, para no caer en <body>
    panic.focus();
    panicPrompt.hidden = true;
    RESTORE.forEach(function (l, i) {
      later(function () { panicLine(l[0], l[1]); }, 250 * (i + 1));
    });
    later(closeCrash, 250 * RESTORE.length + 500);
  }

  function runCmd() {
    var raw = panicInput.value;
    var c = raw.trim().toLowerCase().replace(/\s+/g, ' ');
    if (c === '') return;
    panicInput.value = '';
    panicLine('(initramfs) ' + raw, 'white');
    if (OK_CMDS.indexOf(c) !== -1) { restore(); return; }
    if (c === 'help') panicLine('comandos disponibles: inscribirme', 'g');
    else if (c === 'reboot' || c === 'sudo reboot') panicLine('reboot: no queda nada para bootear. probá otro.', 'y');
    else if (c === 'ls' || c === 'ls -la') panicLine('(vacío. lo borraste todo, crack.)', 'd');
    else if (c.indexOf('rm ') === 0) panicLine('rm: ya no queda nada para borrar.', 'y');
    else if (c === 'exit') panicLine('exit: no hay salida. solo inscripción.', 'y');
    else panicLine('sh: ' + c.split(' ')[0] + ': not found. el único que anda es: inscribirme', 'r');
  }

  if (rmBtn && panic && panicLog && panicPrompt && panicHint && panicInput && panicLive) {
    rmBtn.addEventListener('click', startCrash);

    panicInput.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      runCmd();
    });

    panic.addEventListener('keydown', function (e) {
      // Esc no cierra: es parte del chiste
      if (e.key === 'Escape') { e.preventDefault(); return; }
      // Focus trap: el único destino de Tab es el input (o el overlay mientras carga)
      if (e.key === 'Tab') {
        e.preventDefault();
        if (!panicPrompt.hidden) panicInput.focus();
        else panic.focus();
      }
    });

    // Respaldo del focus trap para navegadores sin inert
    document.addEventListener('focusin', function (e) {
      if (!panicOpen || panic.contains(e.target)) return;
      if (!panicPrompt.hidden) panicInput.focus();
      else panic.focus();
    });
  }
})();
