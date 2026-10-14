/* TTW · Error 503 — Piedra Movediza en ASCII, Movediza Farm y kernel panic (JS vanilla) */
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

    loop(function () {
      var ps = perSec();
      if (ps > 0) {
        state.tokens += ps / 10;
        state.total += ps / 10;
      }
      render();
    }, 100);

    loop(save, 2000);
    document.addEventListener('visibilitychange', save);
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
