/* ============================================================
   Projecter · Diagnóstico interactivo
   Vanilla JS – máquina de estados + canvas orgánico + Web Audio
   ============================================================ */

/* ===== DATOS ===== */

const QUESTIONS = [
  '¿Qué parte de tu negocio sientes que todavía depende demasiado de estar "persiguiendo" a la gente?',
  'Si pudieras quitarte una tarea repetitiva de encima esta semana, ¿cuál sería?',
  '¿Dónde se te escapa más tiempo: vendiendo, atendiendo clientes, organizando pedidos o dando seguimiento?',
  '¿Qué proceso de tu negocio funciona… pero solo porque tú estás encima todo el tiempo?',
  '¿Qué actividad haces todos los días que piensas: "esto ya debería estar automatizado"?',
  'Si tu negocio pudiera hablar, ¿qué te diría que le urge ordenar primero?',
  '¿En qué momento sientes que tu negocio empieza a depender demasiado de WhatsApp, Excel o notas sueltas?',
  'Si mañana duplicaras tus clientes, ¿qué parte de tu operación se rompería primero?',
  '¿Qué proceso te da más miedo delegar porque "si no lo haces tú, sale mal"?',
  '¿Dónde sientes que se te pueden estar escapando oportunidades sin darte cuenta?',
];

const PROJECTS = [
  { id: '01', name: 'Flujo de pedidos automatizado',  tag: 'Operaciones', kind: 'SISTEMA WEB', url: 'pedidos.projecter.mx' },
  { id: '02', name: 'Seguimiento de clientes',        tag: 'CRM',         kind: 'PLATAFORMA',  url: 'crm.projecter.mx'     },
  { id: '03', name: 'Cotizador en línea',              tag: 'Ventas',      kind: 'WEB APP',     url: 'cotiza.projecter.mx'  },
  { id: '04', name: 'Panel de control operativo',     tag: 'Datos',       kind: 'DASHBOARD',   url: 'panel.projecter.mx'   },
  { id: '05', name: 'Agenda y reservas',               tag: 'Atención',    kind: 'SISTEMA WEB', url: 'agenda.projecter.mx'  },
  { id: '06', name: 'Inventario inteligente',          tag: 'Inventario',  kind: 'PLATAFORMA',  url: 'stock.projecter.mx'   },
];

const SERVICES = [
  { n: '01', title: 'Automatización de procesos',   desc: 'Quitamos las tareas repetitivas y dejamos que el sistema haga el seguimiento por ti.' },
  { n: '02', title: 'Sistemas y plataformas web',   desc: 'Pedidos, inventario y operación en un solo lugar, accesibles desde cualquier parte.' },
  { n: '03', title: 'CRM y seguimiento',            desc: 'Deja de perseguir clientes: tu flujo de ventas ordenado y automático.' },
  { n: '04', title: 'Dashboards y reportes',        desc: 'Mira cómo va tu negocio en tiempo real, sin armar Excel a mano.' },
];

/* ===== ESTADO ===== */

const state = {
  phase: 'loading',   // loading | intro | landing | question | transition | final
  qIndex: 0,
  recording: false,
  micError: null,
};

let prevPhase = 'loading';

/* ===== CANVAS / AUDIO ===== */

let canvas        = null;
let ctx2d         = null;
let canvasHero    = null;
let ctx2dHero     = null;
let canvasLanding = null;
let ctx2dLanding  = null;
let t0            = performance.now();
let level         = 0.12;
let transStart    = 0;
let transP        = 0;

let micStream  = null;
let audioCtx   = null;
let analyser   = null;
let timeData   = null;
let freqData   = null;

let advanceTimer = null;

/* ===== UTILIDADES ===== */

function pad(n) {
  return n < 10 ? '0' + n : '' + n;
}

function hexToRgba(hex, a) {
  let c = (hex || '#111111').replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const n = parseInt(c, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/* ===== DOM ===== */

const $ = id => document.getElementById(id);

const SCREENS = {
  intro:    $('screen-intro'),
  voice:    $('screen-voice'),
  final:    $('screen-final'),
  landing:  $('screen-landing'),
};

/* ===== RENDER ===== */

function render() {
  const { phase, qIndex, recording, micError } = state;

  // Mostrar / ocultar pantallas
  const voiceActive = phase === 'question' || phase === 'transition';
  const voiceWasHidden = SCREENS.voice.classList.contains('hidden');

  SCREENS.intro.classList.toggle('hidden', phase !== 'intro');
  SCREENS.voice.classList.toggle('hidden', !voiceActive);
  SCREENS.final.classList.toggle('hidden', phase !== 'final');
  SCREENS.landing.classList.toggle('hidden', phase !== 'landing');

  // Reiniciar animaciones de entrada al mostrar la pantalla de voz por primera vez
  if (voiceWasHidden && voiceActive) {
    const blobWrap  = document.querySelector('.blob-wrap');
    const voicePanel = document.querySelector('.voice-panel');
    [blobWrap, voicePanel].forEach(el => {
      if (!el) return;
      el.style.animation = 'none';
      void el.offsetWidth;
      el.style.animation = '';
    });
  }

  prevPhase = phase;

  // Blob decorativo landing: ocultar cuando no estamos en landing
  if (canvasLanding) {
    if (phase !== 'landing') {
      canvasLanding.classList.remove('blob-br', 'blob-tl', 'blob-r', 'blob-hidden');
    } else {
      // Forzar actualización al volver a landing
      updateLandingBlobClass();
    }
  }

  // Barra de progreso
  $('progress-bar').classList.toggle('hidden', !voiceActive);

  // Footer fijo: solo en la pantalla intro
  $('footer').classList.toggle('hidden', phase !== 'intro');

  // Pantalla de voz
  if (voiceActive) {
    const isQ = phase === 'question';
    $('panel-question').classList.toggle('hidden', !isQ);
    $('panel-transition').classList.toggle('hidden', isQ);

    if (isQ) {
      // Animación de entrada al texto de la pregunta
      const wrap = $('question-wrap');
      wrap.style.animation = 'none';
      void wrap.offsetWidth;
      wrap.style.animation = '';
      $('question-p').textContent = QUESTIONS[qIndex];

      $('state-idle').classList.toggle('hidden', recording);
      $('state-recording').classList.toggle('hidden', !recording);

      const errEl = $('mic-error');
      if (micError) {
        errEl.textContent = micError;
        errEl.classList.remove('hidden');
      } else {
        errEl.classList.add('hidden');
      }
    }

    // Progreso
    const total    = QUESTIONS.length;
    const answered = phase === 'transition' ? qIndex + 1 : qIndex;
    const cur      = Math.min(qIndex + 1, total);
    $('progress-label').textContent = `PREGUNTA ${pad(cur)} / ${pad(total)}`;
    $('progress-fill').style.width  = (answered / total * 100) + '%';
  }
}

/* ===== ACCIONES ===== */

function start() {
  state.phase     = 'question';
  state.qIndex    = 0;
  state.recording = false;
  state.micError  = null;
  render();
}

function gotoIntro() {
  stopMic();
  if (advanceTimer) { clearTimeout(advanceTimer); advanceTimer = null; }
  state.phase     = 'intro';
  state.recording = false;
  render();
}

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    micStream = stream;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    const src = audioCtx.createMediaStreamSource(stream);
    analyser  = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.75;
    timeData  = new Uint8Array(analyser.fftSize);
    freqData  = new Uint8Array(analyser.frequencyBinCount);
    src.connect(analyser);
    state.recording = true;
    state.micError  = null;
  } catch (_) {
    analyser        = null;
    state.recording = true;
    state.micError  = 'No pudimos acceder al micrófono — puedes continuar igual.';
  }
  render();
}

function stopMic() {
  if (micStream) {
    micStream.getTracks().forEach(t => t.stop());
    micStream = null;
  }
  analyser = null;
}

function stopAndAdvance() {
  if (state.phase !== 'question') return;
  stopMic();
  const isLast = state.qIndex >= QUESTIONS.length - 1;
  transStart      = performance.now();
  transP          = 0;
  state.recording = false;
  state.phase     = 'transition';
  render();

  if (advanceTimer) clearTimeout(advanceTimer);
  advanceTimer = setTimeout(() => {
    if (isLast) {
      state.phase = 'final';
      renderFinal();
    } else {
      state.phase  = 'question';
      state.qIndex = state.qIndex + 1;
    }
    render();
    advanceTimer = null;
  }, 3000);
}

/* ===== ANIMACIONES TEMÁTICAS DE CARDS ===== */

function drawFlow(ctx, w, h, t, dpr) {
  const nodes = [
    { x: .18, y: .5 }, { x: .38, y: .3 }, { x: .38, y: .7 },
    { x: .62, y: .3 }, { x: .62, y: .7 }, { x: .82, y: .5 },
  ];
  const edges = [[0,1],[0,2],[1,3],[2,4],[3,5],[4,5]];
  ctx.strokeStyle = 'rgba(17,17,17,0.18)';
  ctx.lineWidth   = 1 * dpr;
  edges.forEach(([a, b]) => {
    const ax = nodes[a].x * w, ay = nodes[a].y * h;
    const bx = nodes[b].x * w, by = nodes[b].y * h;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    const p = (t * 0.6 + a * 0.17) % 1;
    const px = ax + (bx - ax) * p, py = ay + (by - ay) * p;
    ctx.beginPath(); ctx.arc(px, py, 2.5 * dpr, 0, Math.PI * 2);
    ctx.fillStyle = '#111'; ctx.fill();
  });
  nodes.forEach((n, i) => {
    const pulse = 0.5 + 0.5 * Math.sin(t * 2 + i * 1.1);
    ctx.beginPath(); ctx.arc(n.x * w, n.y * h, (4 + pulse * 2) * dpr, 0, Math.PI * 2);
    ctx.fillStyle = i === 0 || i === 5 ? '#111' : 'rgba(17,17,17,0.25)';
    ctx.fill();
  });
}

function drawCRM(ctx, w, h, t, dpr) {
  const bars = [0.4, 0.7, 0.55, 0.85, 0.5, 0.65];
  const bw   = w / (bars.length * 2 + 1);
  bars.forEach((v, i) => {
    const animated = v * (0.5 + 0.5 * Math.min(1, t * 1.2));
    const bh = h * 0.6 * animated;
    const x  = bw + i * bw * 2;
    const y  = h * 0.8 - bh;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(17,17,17,0.7)' : 'rgba(17,17,17,0.2)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, bw * 1.2, bh, 2 * dpr);
    else ctx.rect(x, y, bw * 1.2, bh);
    ctx.fill();
  });
  ctx.beginPath();
  bars.forEach((v, i) => {
    const x = bw + i * bw * 2 + bw * 0.6;
    const y = h * 0.8 - h * 0.6 * v * (0.5 + 0.5 * Math.min(1, t * 1.2));
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5 * dpr; ctx.stroke();
}

function drawVentas(ctx, w, h, t, dpr) {
  const cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.32;
  const progress = Math.min(1, t * 0.5) * 0.78;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(17,17,17,0.1)'; ctx.lineWidth = 8 * dpr; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
  ctx.strokeStyle = '#111'; ctx.lineWidth = 8 * dpr; ctx.lineCap = 'round'; ctx.stroke(); ctx.lineCap = 'butt';
  ctx.fillStyle = '#111';
  ctx.font = `${Math.round(14 * dpr)}px JetBrains Mono, monospace`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(Math.round(progress / 0.78 * 100) + '%', cx, cy);
}

function drawDatos(ctx, w, h, t, dpr) {
  const cols = 8, rows = 5;
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const x  = (c + 1) * w / (cols + 1);
      const y  = (r + 1) * h / (rows + 1);
      const v  = 0.3 + 0.7 * Math.abs(Math.sin(t * 1.5 + c * 0.7 + r * 1.1));
      const sz = (1.5 + v * 3) * dpr;
      ctx.beginPath(); ctx.arc(x, y, sz, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(17,17,17,${0.1 + v * 0.55})`; ctx.fill();
    }
  }
}

function drawAtencion(ctx, w, h, t, dpr) {
  const events = [.15, .35, .55, .75, .9];
  const y0 = h * 0.5;
  ctx.strokeStyle = 'rgba(17,17,17,0.15)'; ctx.lineWidth = 1.5 * dpr;
  ctx.beginPath(); ctx.moveTo(w * 0.08, y0); ctx.lineTo(w * 0.92, y0); ctx.stroke();
  events.forEach((ex, i) => {
    const revealed = Math.min(1, t * 1.2 - i * 0.2);
    if (revealed <= 0) return;
    const x   = w * ex;
    const sz  = (5 + 2 * Math.sin(t * 2 + i)) * dpr * revealed;
    const alt = i % 2 === 0 ? -1 : 1;
    ctx.beginPath(); ctx.moveTo(x, y0 - sz * alt * 0.4); ctx.lineTo(x, y0 + sz * alt * 0.4);
    ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5 * dpr; ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y0, sz * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = i === events.length - 1 ? '#111' : 'rgba(17,17,17,0.3)'; ctx.fill();
  });
}

function drawInventario(ctx, w, h, t, dpr) {
  const items = [0.9, 0.4, 0.75, 0.2, 0.6, 0.85, 0.35];
  const iw    = w / (items.length + 1);
  items.forEach((v, i) => {
    const fill    = v * Math.min(1, t * 0.8 + i * 0.1);
    const totalH  = h * 0.55;
    const filledH = totalH * fill;
    const x = iw * (i + 0.75);
    ctx.strokeStyle = 'rgba(17,17,17,0.15)'; ctx.lineWidth = 1 * dpr;
    ctx.strokeRect(x, h * 0.22, iw * 0.5, totalH);
    ctx.fillStyle = v < 0.35 ? 'rgba(17,17,17,0.6)' : 'rgba(17,17,17,0.25)';
    ctx.fillRect(x, h * 0.22 + totalH - filledH, iw * 0.5, filledH);
  });
}

/* ===== RENDER DE TARJETAS ===== */

function createProjectCard(p, ratio) {
  const div = document.createElement('div');
  div.className = 'pj-card';
  div.innerHTML = `
    <div class="card-bar">
      <span class="card-dot"></span>
      <span class="card-dot"></span>
      <span class="card-dot"></span>
      <span class="card-url">${p.url}</span>
    </div>
    <div class="card-preview card-preview-canvas" style="aspect-ratio:${ratio}">
      <canvas class="card-canvas" aria-hidden="true"></canvas>
      <span class="card-kind">${p.kind}</span>
    </div>
    <div class="card-body">
      <div class="card-meta">
        <span class="card-id">${p.id}</span>
        <span class="card-tag">${p.tag}</span>
      </div>
      <h3 class="card-name">${p.name}</h3>
    </div>
  `;

  const preview = div.querySelector('.card-preview-canvas');
  const cvs     = div.querySelector('.card-canvas');
  let   rafId   = null;
  let   cctx    = null;
  let   tStart  = null;

  const animMap = {
    'Operaciones': drawFlow,
    'CRM':         drawCRM,
    'Ventas':      drawVentas,
    'Datos':       drawDatos,
    'Atención':    drawAtencion,
    'Inventario':  drawInventario,
  };
  const drawFn = animMap[p.tag] || drawFlow;

  div.addEventListener('mouseenter', () => {
    if (!cctx) cctx = cvs.getContext('2d');
    tStart = performance.now();
    const loop = (now) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = preview.clientWidth;
      const h = preview.clientHeight;
      if (cvs.width !== Math.round(w * dpr) || cvs.height !== Math.round(h * dpr)) {
        cvs.width  = Math.round(w * dpr);
        cvs.height = Math.round(h * dpr);
      }
      cctx.setTransform(1, 0, 0, 1, 0, 0);
      cctx.clearRect(0, 0, cvs.width, cvs.height);
      drawFn(cctx, cvs.width, cvs.height, (now - tStart) / 1000, dpr);
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
  });

  div.addEventListener('mouseleave', () => {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    if (cctx)  cctx.clearRect(0, 0, cvs.width, cvs.height);
  });

  return div;
}

function renderFinal() {
  const container = $('final-projects');
  container.innerHTML = '';
  $('final-project-count').textContent = `[ ${PROJECTS.length} ]`;
  PROJECTS.forEach(p => container.appendChild(createProjectCard(p, '16/9')));
}

function renderLanding() {

  // ── QUÉ HACEMOS ──────────────────────────────────────────────────
  const que = $('landing-que');
  que.innerHTML = '';
  const queBlock = document.createElement('div');
  queBlock.className = 'prose-block';
  queBlock.innerHTML = `
    <span class="prose-n">01</span>
    <h3 class="prose-title">Automatización de procesos</h3>
    <p class="prose-text">
      Toda tarea realizada dentro de un negocio se considera parte de un proceso. El problema empieza cuando se realizan tareas fuera del proceso: lo que hoy parece una tarea inofensiva, mañana se convertirá en sobrecosto, errores y pérdida de control empresarial.
    </p>
    <p class="prose-text">
      PROJECTER es un taller de automatización de procesos de negocio. Si actualmente trabajas de forma manual, semi automática o usas tecnología obsoleta, mejora la forma de trabajar de tu empresa en tan solo 30 días, sin inversiones excesivas y sin software genérico.
    </p>
  `;
  que.appendChild(queBlock);

  // ── POR QUÉ LO HACEMOS ───────────────────────────────────────────
  const porque = $('landing-porque');
  porque.innerHTML = '';

  const porqueData = [
    {
      figure: '70% · 22%',
      label:  null,
      text:   '70% de las empresas fracasan antes de cumplir 5 años. 22% de las empresas en México no utilizan tecnología.',
      source: 'INEGI · CCE',
    },
    {
      figure: null,
      label:  'NUESTRA RAZÓN',
      text:   'Todo negocio trabaja sobre procesos propios. En PROJECTER automatizamos esos procesos para que las empresas crezcan: sin software genérico, precio justo, tiempos de entrega en solo 30 días, soporte continuo y sin plazos forzosos.',
      source: null,
    },
  ];

  porqueData.forEach((d, i) => {
    const card = document.createElement('div');
    card.className = 'stat-card';
    card.style.animationDelay = (0.08 + i * 0.12) + 's';
    card.innerHTML = `
      ${d.figure ? `<span class="stat-figure">${d.figure}</span>` : ''}
      ${d.label  ? `<span class="stat-label">${d.label}</span>`   : ''}
      <p class="stat-text">${d.text}</p>
      ${d.source ? `<span class="stat-source">${d.source}</span>` : ''}
    `;
    porque.appendChild(card);
  });

  // ── CÓMO LO HACEMOS ──────────────────────────────────────────────
  const como = $('landing-como');
  como.innerHTML = '';

  const comoData = [
    {
      label: 'EXPERIENCIA',
      text:  'Tenemos 20 años de experiencia que nos permiten dominar desde tecnología sólida hasta lo último en inteligencia artificial, lo que nos permite acelerar tiempos de entrega y mantenimiento en nuestros sistemas.',
    },
    {
      label: 'SIMPLICIDAD',
      text:  'Olvídate de todo. Solo necesitas conexión a internet. Sin costos ocultos, soporte y actualizaciones constantes sin costo extra, sin plazos forzosos — tecnología diseñada para crecer tu negocio.',
    },
  ];

  comoData.forEach((d, i) => {
    const card = document.createElement('div');
    card.className = 'stat-card';
    card.style.animationDelay = (0.08 + i * 0.12) + 's';
    card.innerHTML = `
      <span class="stat-label">${d.label}</span>
      <p class="stat-text">${d.text}</p>
    `;
    como.appendChild(card);
  });

  // ── PROYECTOS ─────────────────────────────────────────────────────
  const projectsSection = $('pj-proyectos');
  if (!projectsSection.querySelector('.projects-intro')) {
    const introP = document.createElement('p');
    introP.className = 'projects-intro';
    introP.textContent = 'Internamente utilizamos lo último en tecnología, lo que nos permite hacer casi cualquier cosa: administración de campañas de prospectos, sistemas de localización para entrega de última milla, control de tiempos en manufactura, control de pendientes internos, asistentes de dirección, entre muchos otros temas. Inicia el proceso de diagnóstico para conocer más.';
    projectsSection.insertBefore(introP, projectsSection.querySelector('.section-divider'));
  }

  const proj = $('landing-projects');
  proj.innerHTML = '';
  $('landing-project-count').textContent = `[ ${PROJECTS.length} ]`;
  PROJECTS.forEach(p => proj.appendChild(createProjectCard(p, '16/7')));
}

/* ===== CANVAS · LOOP PRINCIPAL ===== */

function rafLoop() {
  requestAnimationFrame(rafLoop);

  const now     = performance.now();
  const elapsed = now - t0;
  const phase   = state.phase;
  const dpr     = Math.min(window.devicePixelRatio || 1, 2);

  // ── Voice blob (solo cuando la pantalla de voz está activa) ──────
  if (canvas) {
    if (!ctx2d) ctx2d = canvas.getContext('2d');
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    if (cw && ch) {
      if (canvas.width  !== Math.round(cw * dpr) ||
          canvas.height !== Math.round(ch * dpr)) {
        canvas.width  = Math.round(cw * dpr);
        canvas.height = Math.round(ch * dpr);
      }
      const w = canvas.width;
      const h = canvas.height;
      ctx2d.setTransform(1, 0, 0, 1, 0, 0);
      ctx2d.clearRect(0, 0, w, h);

      let target;
      if (phase === 'transition') {
        transP = Math.min(1, (now - transStart) / 3000);
        target = 0.18 + 0.7 * Math.sin(transP * Math.PI);
      } else if (state.recording && analyser) {
        analyser.getByteTimeDomainData(timeData);
        analyser.getByteFrequencyData(freqData);
        let sum = 0;
        for (let i = 0; i < timeData.length; i++) {
          const x = (timeData[i] - 128) / 128;
          sum += x * x;
        }
        target = Math.min(1, Math.sqrt(sum / timeData.length) * 3.4);
      } else if (state.recording) {
        target = 0.2 + 0.18 * Math.sin(elapsed * 0.006);
      } else {
        target = 0.12 + 0.05 * Math.sin(elapsed * 0.0018);
      }
      level += (target - level) * 0.18;

      const accent = '#111111';
      const cx = w / 2;
      const cy = h / 2;
      const R  = Math.min(w, h) * 0.3;

      drawRing(cx, cy, R * 1.45, elapsed, accent, dpr);
      drawOrganic(cx, cy, R, level, elapsed, accent);

      if (phase === 'transition') {
        ctx2d.beginPath();
        ctx2d.arc(cx, cy, R * 0.6 + transP * Math.min(w, h) * 0.95, 0, Math.PI * 2);
        ctx2d.strokeStyle = hexToRgba(accent, 0.28 * (1 - transP));
        ctx2d.lineWidth   = 2 * dpr;
        ctx2d.stroke();
      }
    }
  }

  // ── Blob decorativo en hero de landing ───────────────────────────
  if (canvasHero) {
    if (!ctx2dHero) ctx2dHero = canvasHero.getContext('2d');
    const dprH = Math.min(window.devicePixelRatio || 1, 2);
    const cwH  = canvasHero.clientWidth;
    const chH  = canvasHero.clientHeight;
    if (cwH && chH) {
      if (canvasHero.width  !== Math.round(cwH * dprH) ||
          canvasHero.height !== Math.round(chH * dprH)) {
        canvasHero.width  = Math.round(cwH * dprH);
        canvasHero.height = Math.round(chH * dprH);
      }
      ctx2dHero.setTransform(1, 0, 0, 1, 0, 0);
      ctx2dHero.clearRect(0, 0, canvasHero.width, canvasHero.height);
      if (state.phase === 'landing') {
        const wH      = canvasHero.width;
        const hH      = canvasHero.height;
        const lvHero  = 0.07 + 0.03 * Math.sin(elapsed * 0.0009);
        const savedCtx = ctx2d;
        ctx2d = ctx2dHero;
        drawRing(wH / 2, hH / 2, Math.min(wH, hH) * 0.44, elapsed, '#111111', dprH);
        drawOrganic(wH / 2, hH / 2, Math.min(wH, hH) * 0.3, lvHero, elapsed, '#111111');
        ctx2d = savedCtx;
      }
    }
  }

  // ── Blob decorativo fijo (cambia posición por sección) ───────────
  if (canvasLanding && state.phase === 'landing') {
    if (!ctx2dLanding) ctx2dLanding = canvasLanding.getContext('2d');
    const dprL = Math.min(window.devicePixelRatio || 1, 2);
    const cwL  = canvasLanding.clientWidth;
    const chL  = canvasLanding.clientHeight;
    if (cwL && chL) {
      if (canvasLanding.width  !== Math.round(cwL * dprL) ||
          canvasLanding.height !== Math.round(chL * dprL)) {
        canvasLanding.width  = Math.round(cwL * dprL);
        canvasLanding.height = Math.round(chL * dprL);
      }
      ctx2dLanding.setTransform(1, 0, 0, 1, 0, 0);
      ctx2dLanding.clearRect(0, 0, canvasLanding.width, canvasLanding.height);
      const wL  = canvasLanding.width;
      const hL  = canvasLanding.height;
      const lvL = 0.1 + 0.04 * Math.sin(elapsed * 0.0014);
      const savedCtx = ctx2d;
      ctx2d = ctx2dLanding;
      drawRing(wL / 2, hL / 2, Math.min(wL, hL) * 0.44, elapsed, '#111111', dprL);
      drawOrganic(wL / 2, hL / 2, Math.min(wL, hL) * 0.32, lvL, elapsed, '#111111');
      ctx2d = savedCtx;
    }
  }
}

function drawRing(cx, cy, r, t, accent, dpr) {
  ctx2d.save();
  ctx2d.translate(cx, cy);
  ctx2d.rotate(t * 0.0002);
  ctx2d.beginPath();
  ctx2d.arc(0, 0, r, 0, Math.PI * 2);
  ctx2d.setLineDash([2, 11]);
  ctx2d.lineWidth    = 1.4 * (dpr || 1);
  ctx2d.strokeStyle  = hexToRgba(accent, 0.18);
  ctx2d.stroke();
  ctx2d.setLineDash([]);
  ctx2d.restore();
}

function drawOrganic(cx, cy, R, lv, t, accent) {
  const wob  = 0.08 + lv * 0.6;
  const N    = 120;

  const tracePath = (scale, rot, ph) => {
    ctx2d.beginPath();
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      const r = R * scale * (
        1 + wob * (
          0.5 * Math.sin(a * 3 + t * 0.0011 + ph) +
          0.3 * Math.sin(a * 5 - t * 0.0017) +
          0.2 * Math.sin(a * 2 + t * 0.0009 + rot)
        )
      );
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      i === 0 ? ctx2d.moveTo(x, y) : ctx2d.lineTo(x, y);
    }
    ctx2d.closePath();
  };

  // Sombra suave
  tracePath(1.08, 0.6, 1.2);
  ctx2d.fillStyle = hexToRgba(accent, 0.1);
  ctx2d.fill();

  // Blob principal
  tracePath(1, 0, 0);
  ctx2d.fillStyle = accent;
  ctx2d.fill();

  // Brillo interior
  ctx2d.beginPath();
  ctx2d.arc(cx - R * 0.24, cy - R * 0.24, R * 0.2, 0, Math.PI * 2);
  ctx2d.fillStyle = 'rgba(255,255,255,0.16)';
  ctx2d.fill();
}

/* ===== BLOB LANDING: POSICIÓN POR SECCIÓN ===== */

const SECTION_BLOB_MAP = [
  { id: 'section-hero',    cls: 'blob-br' },
  { id: 'section-que',     cls: 'blob-br' },
  { id: 'section-porque',  cls: 'blob-tl' },
  { id: 'section-como',    cls: 'blob-tl' },
  { id: 'pj-proyectos',    cls: 'blob-hidden' },
  { id: 'section-cta',     cls: 'blob-r' },
];

const BLOB_CLASSES = ['blob-br', 'blob-tl', 'blob-r', 'blob-hidden'];

function setBlobClass(cls) {
  if (!canvasLanding) return;
  BLOB_CLASSES.forEach(c => canvasLanding.classList.remove(c));
  if (cls) canvasLanding.classList.add(cls);
}

function updateLandingBlobClass() {
  if (state.phase !== 'landing') return;
  const container = $('screen-landing');
  if (!container) return;
  const scrollY  = container.scrollTop;
  const viewMid  = scrollY + container.clientHeight * 0.5;

  for (const { id, cls } of SECTION_BLOB_MAP) {
    const el = $(id);
    if (!el) continue;
    const elTop = el.offsetTop;
    const elBot = elTop + el.offsetHeight;
    if (viewMid >= elTop && viewMid < elBot) {
      setBlobClass(cls);
      return;
    }
  }
}

/* ===== INICIALIZACIÓN ===== */

document.addEventListener('DOMContentLoaded', () => {
  canvas        = $('blob-canvas');
  canvasHero    = $('blob-hero');
  canvasLanding = $('blob-landing');

  // Siempre ir a landing en la primera carga
  const target = 'landing';

  // Pre-renderizar contenido estático
  renderLanding();

  // Iniciar loop de canvas
  rafLoop();

  // Render inicial (la pantalla de carga cubre todo)
  state.phase = 'loading';
  // Mostrar landing debajo del overlay de carga
  SCREENS.intro.classList.add('hidden');
  SCREENS.landing.classList.remove('hidden');
  $('footer').classList.add('hidden');
  $('progress-bar').classList.add('hidden');

  // Scroll listener: actualiza posición del blob decorativo
  const landingContainer = $('screen-landing');
  if (landingContainer) {
    landingContainer.addEventListener('scroll', updateLandingBlobClass, { passive: true });
  }

  // Transición tras la carga (2.8s = duración de pjLoaderOut)
  setTimeout(() => {
    state.phase = target;
    render();
  }, 2800);

  // ===== EVENT LISTENERS =====

  // Intro: botón + clic en el área completa
  $('btn-start').addEventListener('click', start);
  $('intro-area').addEventListener('click', e => {
    if (e.target.closest('#btn-start')) return; // evitar doble disparo
    start();
  });

  // Landing: "Iniciar diagnóstico" va directo al cuestionario
  document.querySelectorAll('.btn-goto-intro').forEach(btn => {
    btn.addEventListener('click', start);
  });

  // Logo: vuelve a landing desde cualquier pantalla
  $('logo-home').addEventListener('click', e => {
    e.preventDefault();
    stopMic();
    if (advanceTimer) { clearTimeout(advanceTimer); advanceTimer = null; }
    state.phase     = 'landing';
    state.recording = false;
    render();
  });

  // Efecto mercurio en hero-p
  (function initMercury() {
    const heroP   = document.querySelector('.hero-p');
    const inner   = document.querySelector('.hero-p-inner');
    if (!heroP || !inner) return;

    let mercuryActive = false;
    let riseTimer     = null;

    function drip() {
      if (mercuryActive) return;
      mercuryActive = true;
      inner.classList.remove('mercury-in');
      void inner.offsetWidth; // reflow forzado
      inner.classList.add('mercury-out');
    }

    function rise() {
      if (riseTimer) clearTimeout(riseTimer);
      riseTimer = setTimeout(() => {
        inner.classList.remove('mercury-out');
        void inner.offsetWidth;
        inner.classList.add('mercury-in');
        inner.addEventListener('animationend', () => {
          inner.classList.remove('mercury-in');
          mercuryActive = false;
        }, { once: true });
      }, 80);
    }

    heroP.addEventListener('mouseenter', drip);
    heroP.addEventListener('mouseleave', rise);
  })();

  // Voz
  $('btn-record').addEventListener('click', startRecording);
  $('btn-stop').addEventListener('click', stopAndAdvance);
});
