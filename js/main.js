/* ============================================================
   Projecter · Diagnóstico interactivo
   Vanilla JS – máquina de estados + canvas orgánico + Web Audio
   ============================================================ */

/* ===== DATOS ===== */

const QUESTIONS = [
  '¿Qué parte de tu negocio sientes que todavía depende demasiado de estar "persiguiendo" a la gente?',
  'Si hoy tuvieras un asistente, ¿qué tarea repetitiva le delegarías?',
  '¿Has pensado que algunos colaboradores hacen cosas que no debieran hacer y que serían más útiles haciendo otra cosa? Platica un ejemplo.',
  '¿Cuál es la actividad que cada vez que la haces, te dices "esto no lo tendría que hacer yo"?',
  'Si pudieras escuchar a tu negocio, ¿qué proceso le duele en este momento?',
  '¿Tienes identificado dónde se rompe el proceso? Has intentado mil acciones, pero no mejora — menciona en qué tarea o proceso pensaste.',
  'Si hoy tuvieras un asistente que monitorea todos los flujos de tu negocio y lo consultaras para tomar decisiones, ¿cuánto pagarías por él?',
  'Si mañana duplicaras tus clientes, ¿qué parte de tu operación se rompería primero?',
  '¿Qué proceso te da más miedo delegar porque "si no lo haces tú, sale mal"?',
  '¿Dónde sientes que se te pueden estar escapando oportunidades sin darte cuenta?',
];

const PROJECTS = [
  {
    id: '01', name: 'Flujo de pedidos automatizado', tag: 'Operaciones', kind: 'SISTEMA WEB', url: 'pedidos.projecter.mx',
    desc: 'Sistema que centraliza la captura, asignación y seguimiento de pedidos en tiempo real. Elimina el rastreo manual por WhatsApp o Excel y notifica automáticamente a cada área.',
    features: ['Captura de pedidos en segundos', 'Seguimiento de estatus en tiempo real', 'Notificaciones automáticas al equipo', 'Historial completo por cliente'],
  },
  {
    id: '02', name: 'Seguimiento de clientes', tag: 'CRM', kind: 'PLATAFORMA', url: 'crm.projecter.mx',
    desc: 'Plataforma CRM que ordena tu pipeline de ventas y registra cada interacción con el cliente. Deja de perseguir prospectos: el sistema te dice cuándo actuar y qué decir.',
    features: ['Pipeline visual de ventas', 'Historial de interacciones', 'Tareas y recordatorios automáticos', 'Reportes de conversión'],
  },
  {
    id: '03', name: 'Cotizador en línea', tag: 'Ventas', kind: 'WEB APP', url: 'cotiza.projecter.mx',
    desc: 'Genera cotizaciones profesionales en menos de dos minutos desde cualquier dispositivo. Calcula automáticamente precios, impuestos y descuentos, y envía el PDF al cliente de inmediato.',
    features: ['Cotizaciones en 2 minutos', 'Catálogo de productos integrado', 'PDF profesional automático', 'Historial y seguimiento de cotizaciones'],
  },
  {
    id: '04', name: 'Panel de control operativo', tag: 'Datos', kind: 'DASHBOARD', url: 'panel.projecter.mx',
    desc: 'Dashboard ejecutivo que consolida los KPIs clave del negocio en una sola pantalla. Sin exportar Excel ni esperar reportes: toda la información disponible al instante.',
    features: ['KPIs actualizados en tiempo real', 'Gráficas de tendencia mensuales', 'Alertas automáticas por umbral', 'Acceso desde cualquier dispositivo'],
  },
  {
    id: '05', name: 'Agenda y reservas', tag: 'Atención', kind: 'SISTEMA WEB', url: 'agenda.projecter.mx',
    desc: 'Sistema de citas que reemplaza la agenda en papel. Tus clientes reservan en línea 24/7 y reciben confirmación y recordatorio automático, sin intervención de tu equipo.',
    features: ['Reservas en línea 24/7', 'Confirmaciones y recordatorios automáticos', 'Vista de calendario por día o semana', 'Gestión de disponibilidad por servicio'],
  },
  {
    id: '06', name: 'Inventario inteligente', tag: 'Inventario', kind: 'PLATAFORMA', url: 'stock.projecter.mx',
    desc: 'Control de inventario que te avisa antes de que se agote el stock. Registra entradas, salidas y mermas, con reportes automáticos de rotación y valor en almacén.',
    features: ['Alertas de stock mínimo', 'Entradas y salidas en tiempo real', 'Reportes de rotación automáticos', 'Soporte de múltiples almacenes'],
  },
];

const SERVICES = [
  { n: '01', title: 'Automatización de procesos',   desc: 'Quitamos las tareas repetitivas y dejamos que el sistema haga el seguimiento por ti.' },
  { n: '02', title: 'Sistemas y plataformas web',   desc: 'Pedidos, inventario y operación en un solo lugar, accesibles desde cualquier parte.' },
  { n: '03', title: 'CRM y seguimiento',            desc: 'Deja de perseguir clientes: tu flujo de ventas ordenado y automático.' },
  { n: '04', title: 'Dashboards y reportes',        desc: 'Mira cómo va tu negocio en tiempo real, sin armar Excel a mano.' },
];

/* ===== VERCEL BLOB ===== */

const BLOB_TOKEN = 'vercel_blob_rw_CD2NLvi9AEhzHB71_lvQgxsz4EQPeVJPf6RTXX7vCrMYqNU';

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

let micStream     = null;
let audioCtx      = null;
let analyser      = null;
let timeData      = null;
let freqData      = null;
let mediaRecorder = null;
let audioChunks   = [];

let sessionId    = null;
let savedUrls    = [];

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

function getSupportedMimeType() {
  if (typeof MediaRecorder === 'undefined') return '';
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return '';
}

function blobExt(mimeType) {
  if (mimeType.includes('ogg'))  return 'ogg';
  if (mimeType.includes('mp4'))  return 'mp4';
  return 'webm';
}

async function uploadResponse(qIdx, audioBlob) {
  if (!audioBlob || audioBlob.size === 0 || !sessionId) return null;
  try {
    const ext  = blobExt(audioBlob.type || 'audio/webm');
    const path = `diagnostico/${sessionId}/q${pad(qIdx + 1)}.${ext}`;
    const res  = await fetch(`https://blob.vercel-storage.com/${path}?access=public`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${BLOB_TOKEN}`,
        'content-type': audioBlob.type || 'audio/webm',
      },
      body: audioBlob,
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.url || null;
  } catch {
    return null;
  }
}

async function saveSessionMetadata() {
  if (!sessionId) return;
  try {
    const meta = {
      sessionId,
      timestamp: new Date().toISOString(),
      responses: savedUrls.map((url, i) => ({ question: i + 1, url: url || null })),
    };
    const path = `diagnostico/${sessionId}/metadata.json`;
    await fetch(`https://blob.vercel-storage.com/${path}?access=public`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${BLOB_TOKEN}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(meta, null, 2),
    });
  } catch {
    // silent — no bloquear la UX
  }
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
      // Al entrar a landing desde otra fase, reiniciar a la primera sección
      if (prevPhase !== 'landing') {
        currentSectionIdx = 0;
        initSectionDisplay();
      }
      setBlobForSection(currentSectionIdx);
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
  sessionId       = (typeof crypto.randomUUID === 'function')
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).substring(2);
  savedUrls       = new Array(QUESTIONS.length).fill(null);
  state.phase     = 'question';
  state.qIndex    = 0;
  state.recording = false;
  state.micError  = null;
  render();
}

function gotoIntro() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  mediaRecorder = null;
  audioChunks   = [];
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

    // Visualización
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

    // Grabación real
    audioChunks   = [];
    const mimeType = getSupportedMimeType();
    mediaRecorder  = new MediaRecorder(stream, mimeType ? { mimeType } : {});
    mediaRecorder.addEventListener('dataavailable', e => {
      if (e.data && e.data.size > 0) audioChunks.push(e.data);
    });
    mediaRecorder.start();

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

  const qIdx   = state.qIndex;
  const isLast = qIdx >= QUESTIONS.length - 1;

  // Finalizar MediaRecorder y subir audio de forma asíncrona
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    const mr     = mediaRecorder;
    mediaRecorder = null;
    mr.addEventListener('stop', () => {
      const mimeType = mr.mimeType || 'audio/webm';
      const blob = new Blob(audioChunks, { type: mimeType });
      audioChunks = [];
      if (blob.size > 0) {
        uploadResponse(qIdx, blob).then(url => {
          if (url) savedUrls[qIdx] = url;
        });
      }
    }, { once: true });
    mr.stop();
  }

  stopMic();

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
      state.qIndex = qIdx + 1;
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

  div.addEventListener('click', () => openProjectModal(p));

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

  // Esperar a que el último upload termine (~2 s) y luego guardar metadata
  setTimeout(saveSessionMetadata, 2000);
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
  setBlobForSection(currentSectionIdx);
}

/* ===== FULLPAGE SECTION NAV ===== */

const LANDING_SECTION_IDS = [
  'section-hero',
  'section-que',
  'section-porque',
  'section-como',
  'pj-proyectos',
  'section-cta',
];

let currentSectionIdx   = 0;
let sectionTransitioning = false;
const SECTION_ANIM_MS   = 520;

function setBlobForSection(idx) {
  const id    = LANDING_SECTION_IDS[idx];
  const entry = SECTION_BLOB_MAP.find(s => s.id === id);
  if (entry) setBlobClass(entry.cls);
}

function initSectionDisplay() {
  LANDING_SECTION_IDS.forEach((id, i) => {
    const el = $(id);
    if (!el) return;
    el.style.display = i === 0 ? 'flex' : 'none';
    const allCls = ['section-exit-up', 'section-exit-down', 'section-enter-up', 'section-enter-down'];
    allCls.forEach(c => el.classList.remove(c));
  });
  setBlobForSection(0);
}

function navigateSection(direction) {
  if (sectionTransitioning) return;
  if (state.phase !== 'landing') return;

  const nextIdx = currentSectionIdx + direction;
  if (nextIdx < 0 || nextIdx >= LANDING_SECTION_IDS.length) return;

  sectionTransitioning = true;

  const currentEl = $(LANDING_SECTION_IDS[currentSectionIdx]);
  const nextEl    = $(LANDING_SECTION_IDS[nextIdx]);
  if (!currentEl || !nextEl) { sectionTransitioning = false; return; }

  const allCls = ['section-exit-up', 'section-exit-down', 'section-enter-up', 'section-enter-down'];

  // Mostrar la siguiente (empieza invisible vía animación)
  nextEl.style.display = 'flex';

  // Limpiar clases anteriores y forzar reflow
  [currentEl, nextEl].forEach(el => allCls.forEach(c => el.classList.remove(c)));
  void currentEl.offsetWidth;
  void nextEl.offsetWidth;

  // Aplicar animaciones
  if (direction > 0) {
    currentEl.classList.add('section-exit-up');
    nextEl.classList.add('section-enter-up');
  } else {
    currentEl.classList.add('section-exit-down');
    nextEl.classList.add('section-enter-down');
  }

  setBlobForSection(nextIdx);
  currentSectionIdx = nextIdx;

  setTimeout(() => {
    currentEl.style.display = 'none';
    allCls.forEach(c => { currentEl.classList.remove(c); nextEl.classList.remove(c); });
    sectionTransitioning = false;
  }, SECTION_ANIM_MS);
}

/* ===== GALLERY MOCKUPS ===== */

const PROJECT_GALLERY = {
  '01': [
    `<div class="mock-win">
      <div class="mock-bar"><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-url">pedidos.projecter.mx</span></div>
      <div class="mock-body">
        <p class="mock-section-title">PEDIDOS RECIENTES</p>
        <table class="mock-table">
          <thead><tr><th>#</th><th>Cliente</th><th>Producto</th><th>Estatus</th></tr></thead>
          <tbody>
            <tr><td class="mock-mono">#0041</td><td>García Muebles</td><td class="mock-mono" style="color:#bbb">Mesa centro x4</td><td><span class="mock-badge mock-badge-done">Completado</span></td></tr>
            <tr><td class="mock-mono">#0040</td><td>Torres & Asoc.</td><td class="mock-mono" style="color:#bbb">Silla x10</td><td><span class="mock-badge mock-badge-proc">En proceso</span></td></tr>
            <tr><td class="mock-mono">#0039</td><td>Distribuidora P</td><td class="mock-mono" style="color:#bbb">Repisa x2</td><td><span class="mock-badge mock-badge-pend">Pendiente</span></td></tr>
            <tr><td class="mock-mono">#0038</td><td>Rivas Interiores</td><td class="mock-mono" style="color:#bbb">Cajonera x6</td><td><span class="mock-badge mock-badge-done">Completado</span></td></tr>
          </tbody>
        </table>
      </div>
    </div>`,
    `<div class="mock-win">
      <div class="mock-bar"><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-url">pedidos.projecter.mx / #0040</span></div>
      <div class="mock-body">
        <p class="mock-section-title">DETALLE · PEDIDO #0040</p>
        <div class="mock-kpi-row">
          <div class="mock-kpi"><span class="mock-kpi-val">Torres</span><span class="mock-kpi-lbl">Cliente</span></div>
          <div class="mock-kpi"><span class="mock-kpi-val mock-badge-proc" style="font-size:11px;padding:3px 0">En proceso</span><span class="mock-kpi-lbl">Estatus</span></div>
        </div>
        <div style="display:flex;flex-direction:column;gap:5px;margin-top:4px">
          ${['Captura recibida','Asignado a producción','En proceso ←','Calidad','Entrega'].map((s,i)=>`<div style="display:flex;align-items:center;gap:8px"><div style="width:8px;height:8px;border-radius:50%;background:${i<3?'#111':'#e0e0de'}"></div><span style="font-size:11px;color:${i<3?'#111':'#bbb'}">${s}</span></div>`).join('')}
        </div>
      </div>
    </div>`,
    `<div class="mock-win">
      <div class="mock-bar"><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-url">pedidos.projecter.mx / resumen</span></div>
      <div class="mock-body">
        <p class="mock-section-title">RESUMEN DEL MES</p>
        <div class="mock-kpi-row">
          <div class="mock-kpi"><span class="mock-kpi-val">142</span><span class="mock-kpi-lbl">Total pedidos</span></div>
          <div class="mock-kpi"><span class="mock-kpi-val">38</span><span class="mock-kpi-lbl">En proceso</span></div>
          <div class="mock-kpi"><span class="mock-kpi-val">96%</span><span class="mock-kpi-lbl">A tiempo</span></div>
        </div>
        <div class="mock-bar-chart" style="margin-top:6px">
          ${[55,70,48,82,65,91].map((v,i)=>`<div class="mock-bar-col"><div class="mock-bar-fill" style="height:${v}%"></div><span class="mock-bar-lbl">${['E','F','M','A','M','J'][i]}</span></div>`).join('')}
        </div>
      </div>
    </div>`,
  ],
  '02': [
    `<div class="mock-win">
      <div class="mock-bar"><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-url">crm.projecter.mx</span></div>
      <div class="mock-body">
        <p class="mock-section-title">PIPELINE DE VENTAS</p>
        <div class="mock-pipe">
          <div class="mock-pipe-col"><div class="mock-pipe-head">PROSPECTO</div><div class="mock-pipe-card">Almacenes Durán<span class="mock-mono">Contacto inicial</span></div><div class="mock-pipe-card">Textiles Monroy<span class="mock-mono">Demo agendada</span></div></div>
          <div class="mock-pipe-col"><div class="mock-pipe-head">NEGOCIACIÓN</div><div class="mock-pipe-card">Grupo Vidal<span class="mock-mono">Cotización enviada</span></div></div>
          <div class="mock-pipe-col"><div class="mock-pipe-head">CERRADO</div><div class="mock-pipe-card" style="background:#d1fae5;border-color:#a7f3d0">Constructora PE<span class="mock-mono" style="color:#065f46">Firmado ✓</span></div></div>
        </div>
      </div>
    </div>`,
    `<div class="mock-win">
      <div class="mock-bar"><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-url">crm.projecter.mx / clientes</span></div>
      <div class="mock-body">
        <p class="mock-section-title">CONTACTO · GRUPO VIDAL</p>
        <div class="mock-kpi-row">
          <div class="mock-kpi"><span class="mock-kpi-val" style="font-size:13px">Grupo Vidal SA</span><span class="mock-kpi-lbl">Empresa</span></div>
          <div class="mock-kpi"><span class="mock-kpi-val mock-badge-new" style="font-size:10px;padding:3px 0">Negociación</span><span class="mock-kpi-lbl">Etapa</span></div>
        </div>
        <div style="display:flex;flex-direction:column;gap:5px;margin-top:4px">
          ${['Llamada inicial — 10 jun','Demo enviada — 14 jun','Cotización enviada — 17 jun'].map(n=>`<div style="padding:6px 8px;background:#f7f7f6;border-radius:5px;font-size:10px;color:#555">${n}</div>`).join('')}
        </div>
      </div>
    </div>`,
    `<div class="mock-win">
      <div class="mock-bar"><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-url">crm.projecter.mx / reportes</span></div>
      <div class="mock-body">
        <p class="mock-section-title">CONVERSIÓN</p>
        <div class="mock-kpi-row">
          <div class="mock-kpi"><span class="mock-kpi-val">68%</span><span class="mock-kpi-lbl">Tasa de cierre</span></div>
          <div class="mock-kpi"><span class="mock-kpi-val">24</span><span class="mock-kpi-lbl">Prospectos activos</span></div>
        </div>
        <div class="mock-bar-chart" style="margin-top:6px">
          ${[40,55,60,48,72,68].map((v,i)=>`<div class="mock-bar-col"><div class="mock-bar-fill" style="height:${v}%"></div><span class="mock-bar-lbl">${['E','F','M','A','M','J'][i]}</span></div>`).join('')}
        </div>
      </div>
    </div>`,
  ],
  '03': [
    `<div class="mock-win">
      <div class="mock-bar"><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-url">cotiza.projecter.mx</span></div>
      <div class="mock-body">
        <p class="mock-section-title">NUEVA COTIZACIÓN</p>
        <table class="mock-table">
          <thead><tr><th>Producto</th><th>Cant.</th><th>P. Unit.</th><th>Subtotal</th></tr></thead>
          <tbody>
            <tr><td>Mesa ejecutiva</td><td class="mock-mono">2</td><td class="mock-mono">$4,500</td><td class="mock-mono">$9,000</td></tr>
            <tr><td>Silla ergonómica</td><td class="mock-mono">6</td><td class="mock-mono">$2,800</td><td class="mock-mono">$16,800</td></tr>
            <tr><td>Librero modular</td><td class="mock-mono">1</td><td class="mock-mono">$6,200</td><td class="mock-mono">$6,200</td></tr>
          </tbody>
        </table>
        <div style="text-align:right;font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:500;padding-top:8px;border-top:1px solid #f0f0ee">TOTAL: $37,236 <span style="font-size:10px;color:#aaa">(IVA inc.)</span></div>
      </div>
    </div>`,
    `<div class="mock-win">
      <div class="mock-bar"><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-url">cotiza.projecter.mx / pdf</span></div>
      <div class="mock-body">
        <div style="border:1px solid #f0f0ee;border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:8px">
          <div style="display:flex;justify-content:space-between;align-items:center"><span style="font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:500">P R O J E C T E R</span><span style="font-size:10px;color:#aaa">COT-2026-0134</span></div>
          <div style="height:1px;background:#f0f0ee"></div>
          <div style="font-size:11px;color:#555">Cliente: <strong>Torres & Asociados</strong></div>
          <div style="font-size:11px;color:#555">Válida hasta: <span style="font-family:'JetBrains Mono',monospace">2026-07-15</span></div>
          <div style="background:#f7f7f6;border-radius:6px;padding:8px;font-size:10px;color:#888;text-align:center">[ Vista previa del PDF generado ]</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:500;text-align:right">$37,236.00 MXN</div>
        </div>
      </div>
    </div>`,
    `<div class="mock-win">
      <div class="mock-bar"><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-url">cotiza.projecter.mx / historial</span></div>
      <div class="mock-body">
        <p class="mock-section-title">COTIZACIONES RECIENTES</p>
        <table class="mock-table">
          <thead><tr><th>COT-#</th><th>Cliente</th><th>Total</th><th>Estado</th></tr></thead>
          <tbody>
            <tr><td class="mock-mono">0134</td><td>Torres &amp; Asoc.</td><td class="mock-mono">$37,236</td><td><span class="mock-badge mock-badge-pend">Enviada</span></td></tr>
            <tr><td class="mock-mono">0133</td><td>García Muebles</td><td class="mock-mono">$12,450</td><td><span class="mock-badge mock-badge-done">Aceptada</span></td></tr>
            <tr><td class="mock-mono">0132</td><td>Rivas Interior</td><td class="mock-mono">$8,900</td><td><span class="mock-badge mock-badge-done">Aceptada</span></td></tr>
          </tbody>
        </table>
      </div>
    </div>`,
  ],
  '04': [
    `<div class="mock-win">
      <div class="mock-bar"><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-url">panel.projecter.mx</span></div>
      <div class="mock-body">
        <p class="mock-section-title">INDICADORES · HOY</p>
        <div class="mock-kpi-row">
          <div class="mock-kpi"><span class="mock-kpi-val">$347k</span><span class="mock-kpi-lbl">Ventas del mes</span></div>
          <div class="mock-kpi"><span class="mock-kpi-val">23</span><span class="mock-kpi-lbl">Pedidos activos</span></div>
        </div>
        <div class="mock-kpi-row" style="margin-top:6px">
          <div class="mock-kpi"><span class="mock-kpi-val">14</span><span class="mock-kpi-lbl">Clientes nuevos</span></div>
          <div class="mock-kpi"><span class="mock-kpi-val">68%</span><span class="mock-kpi-lbl">Conversión</span></div>
        </div>
      </div>
    </div>`,
    `<div class="mock-win">
      <div class="mock-bar"><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-url">panel.projecter.mx / ventas</span></div>
      <div class="mock-body">
        <p class="mock-section-title">VENTAS ÚLTIMOS 6 MESES</p>
        <div class="mock-bar-chart" style="height:70px">
          ${[210,285,190,310,250,347].map((v,i)=>`<div class="mock-bar-col"><div class="mock-bar-fill" style="height:${Math.round(v/347*100)}%"></div><span class="mock-bar-lbl">${['E','F','M','A','M','J'][i]}</span></div>`).join('')}
        </div>
        <div style="display:flex;justify-content:space-between;font-family:'JetBrains Mono',monospace;font-size:10px;color:#aaa;margin-top:6px"><span>vs mes anterior</span><span style="color:#065f46">↑ +38.8%</span></div>
      </div>
    </div>`,
    `<div class="mock-win">
      <div class="mock-bar"><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-url">panel.projecter.mx / alertas</span></div>
      <div class="mock-body">
        <p class="mock-section-title">ACTIVIDAD RECIENTE</p>
        ${[['Pedido #0041 completado','hace 12 min'],['Stock bajo: Tornillo M8','hace 35 min'],['Nueva cotización enviada','hace 1h'],['Cliente Grupo Vidal — cierre','hace 2h']].map(([msg,t])=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #f7f7f6"><span style="font-size:11px;color:#333">${msg}</span><span style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#bbb">${t}</span></div>`).join('')}
      </div>
    </div>`,
  ],
  '05': [
    `<div class="mock-win">
      <div class="mock-bar"><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-url">agenda.projecter.mx</span></div>
      <div class="mock-body">
        <p class="mock-section-title">SEMANA DEL 23 AL 27 JUN</p>
        <div class="mock-cal">
          ${['Lun','Mar','Mié','Jue','Vie'].map(d=>`<div class="mock-cal-head">${d}</div>`).join('')}
          ${['','García 10h','','Rivas 10h',''].map(v=>v?`<div class="mock-cal-slot booked">${v}</div>`:`<div class="mock-cal-slot free">libre</div>`).join('')}
          ${['Torres 11h','','Monroy 11h','','libre'].map(v=>v==='libre'?`<div class="mock-cal-slot free">libre</div>`:`<div class="mock-cal-slot booked">${v}</div>`).join('')}
          ${['','libre','','Vidal 12h','Torres 12h'].map(v=>v==='libre'?`<div class="mock-cal-slot free">libre</div>`:`<div class="mock-cal-slot booked">${v}</div>`).join('')}
        </div>
      </div>
    </div>`,
    `<div class="mock-win">
      <div class="mock-bar"><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-url">agenda.projecter.mx / nueva</span></div>
      <div class="mock-body">
        <p class="mock-section-title">NUEVA CITA</p>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${[['Nombre del cliente','María González'],['Servicio','Consultoría de procesos'],['Fecha','Lunes 30 Jun — 10:00 am']].map(([l,v])=>`<div><div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#aaa;margin-bottom:3px">${l}</div><div style="border:1px solid #e8e8e6;border-radius:5px;padding:6px 9px;font-size:11px;color:#333">${v}</div></div>`).join('')}
          <div style="background:#111;color:#fff;border-radius:99px;padding:7px 16px;font-size:11px;text-align:center;margin-top:4px">Confirmar cita</div>
        </div>
      </div>
    </div>`,
    `<div class="mock-win">
      <div class="mock-bar"><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-url">agenda.projecter.mx / hoy</span></div>
      <div class="mock-body">
        <p class="mock-section-title">HOY — MIÉRCOLES 25 JUN</p>
        ${[['10:00','Monroy & Hijos','Asesoría operativa','proc'],['12:00','Constructora PE','Revisión de propuesta','done'],['15:00','Almacenes Durán','Demo del sistema','pend']].map(([h,n,s,b])=>`<div style="display:flex;gap:10px;padding:7px 0;border-bottom:1px solid #f7f7f6;align-items:center"><span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#aaa;flex-shrink:0">${h}</span><div style="flex:1"><div style="font-size:11px;font-weight:600">${n}</div><div style="font-size:10px;color:#888">${s}</div></div><span class="mock-badge mock-badge-${b}">${{proc:'Confirmada',done:'Completada',pend:'Pendiente'}[b]}</span></div>`).join('')}
      </div>
    </div>`,
  ],
  '06': [
    `<div class="mock-win">
      <div class="mock-bar"><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-url">stock.projecter.mx</span></div>
      <div class="mock-body">
        <p class="mock-section-title">INVENTARIO ACTUAL</p>
        <table class="mock-table">
          <thead><tr><th>Producto</th><th>Stock</th><th>Mín.</th><th>Estado</th></tr></thead>
          <tbody>
            <tr><td>Tornillo M8</td><td class="mock-mono">12</td><td class="mock-mono">50</td><td><span class="mock-badge mock-badge-crit">Crítico</span></td></tr>
            <tr><td>Plancha 3mm</td><td class="mock-mono">80</td><td class="mock-mono">40</td><td><span class="mock-badge mock-badge-ok">OK</span></td></tr>
            <tr><td>Pintura base</td><td class="mock-mono">28</td><td class="mock-mono">30</td><td><span class="mock-badge mock-badge-low">Bajo</span></td></tr>
            <tr><td>Remache pop</td><td class="mock-mono">340</td><td class="mock-mono">100</td><td><span class="mock-badge mock-badge-ok">OK</span></td></tr>
          </tbody>
        </table>
      </div>
    </div>`,
    `<div class="mock-win">
      <div class="mock-bar"><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-url">stock.projecter.mx / tornillo-m8</span></div>
      <div class="mock-body">
        <p class="mock-section-title">DETALLE · TORNILLO M8</p>
        <div class="mock-kpi-row">
          <div class="mock-kpi"><span class="mock-kpi-val" style="color:#991b1b">12</span><span class="mock-kpi-lbl">Stock actual</span></div>
          <div class="mock-kpi"><span class="mock-kpi-val">50</span><span class="mock-kpi-lbl">Stock mínimo</span></div>
          <div class="mock-kpi"><span class="mock-kpi-val">200</span><span class="mock-kpi-lbl">Punto de reorden</span></div>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;margin-top:6px">
          ${[['25 jun','Salida -35 uds','pend'],['20 jun','Entrada +100 uds','done'],['18 jun','Salida -50 uds','pend']].map(([f,m,b])=>`<div style="display:flex;justify-content:space-between;font-size:10px;padding:5px 0;border-bottom:1px solid #f7f7f6"><span style="color:#555">${m}</span><span style="color:#aaa;font-family:'JetBrains Mono',monospace">${f}</span></div>`).join('')}
        </div>
      </div>
    </div>`,
    `<div class="mock-win">
      <div class="mock-bar"><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-url">stock.projecter.mx / alertas</span></div>
      <div class="mock-body">
        <p class="mock-section-title">ALERTAS DE REPOSICIÓN</p>
        ${[['Tornillo M8','Crítico — 12 uds restantes','crit'],['Pintura base','Bajo — 28 uds (mín. 30)','low'],['Sellador PU','Crítico — 5 uds restantes','crit']].map(([p,m,b])=>`<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:${b==='crit'?'#fff1f1':'#fffbeb'};border-radius:7px;border:1px solid ${b==='crit'?'#fee2e2':'#fef3c7'};margin-bottom:5px"><div style="flex:1"><div style="font-size:11px;font-weight:600;color:#111">${p}</div><div style="font-size:10px;color:#888">${m}</div></div><span class="mock-badge mock-badge-${b}">${b==='crit'?'Crítico':'Bajo'}</span></div>`).join('')}
      </div>
    </div>`,
  ],
};

/* ===== DEMO SIMULADO ===== */

function buildDemo(id) {
  if (id === '01') return buildDemoPedidos();
  if (id === '02') return buildDemoCRM();
  if (id === '03') return buildDemoCotizador();
  if (id === '04') return buildDemoDashboard();
  if (id === '05') return buildDemoAgenda();
  if (id === '06') return buildDemoInventario();
  return '<p style="color:#aaa;font-size:13px">Demo no disponible.</p>';
}

function buildDemoPedidos() {
  const orders = [
    { id: '#0042', client: 'Almacenes Durán', product: 'Estante industrial x3', status: 0 },
    { id: '#0043', client: 'Torres & Asoc.',  product: 'Mesa de trabajo x2',    status: 0 },
    { id: '#0044', client: 'Rivas Interiores',product: 'Silla ergonómica x8',   status: 1 },
    { id: '#0045', client: 'Constructora PE', product: 'Locker doble x5',       status: 0 },
  ];
  const labels = ['Pendiente','En proceso','Completado'];
  const cls    = ['pend','proc','done'];

  function render() {
    return `<div class="demo-wrap">
      <p class="demo-title">DEMO · AVANZA EL ESTADO DE CADA PEDIDO</p>
      <table class="demo-table">
        <thead><tr><th>#</th><th>Cliente</th><th>Producto</th><th>Estatus</th><th></th></tr></thead>
        <tbody>
          ${orders.map((o,i) => `<tr>
            <td class="mock-mono">${o.id}</td>
            <td>${o.client}</td>
            <td style="color:#999;font-size:11px">${o.product}</td>
            <td><span class="demo-badge ${cls[o.status]}" id="dbadge-${i}">${labels[o.status]}</span></td>
            <td><button class="demo-btn-sm" id="dadv-${i}" ${o.status>=2?'disabled':''} onclick="demoAdvance(${i})">${o.status>=2?'✓':'Avanzar →'}</button></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
  }

  window.demoAdvance = function(i) {
    if (orders[i].status < 2) {
      orders[i].status++;
      const area = document.getElementById('pj-modal-demo');
      if (area) area.innerHTML = render();
    }
  };

  return render();
}

function buildDemoCRM() {
  const contacts = [
    { name: 'Carlos Durán',   company: 'Almacenes Durán',  stage: 'Prospecto' },
    { name: 'Laura Torres',   company: 'Torres & Asoc.',   stage: 'Negociación' },
    { name: 'Marco Rivas',    company: 'Rivas Interiores', stage: 'Cerrado' },
  ];
  let activeIdx = 0;
  const notes   = [['Primer contacto por teléfono.','10:15 AM'], ['Envío de propuesta comercial.','11:42 AM']];

  function render() {
    return `<div class="demo-wrap">
      <p class="demo-title">DEMO · SELECCIONA UN CLIENTE Y REGISTRA UNA NOTA</p>
      <div class="demo-contacts">
        ${contacts.map((c,i) => `<div class="demo-contact${i===activeIdx?' active':''}" onclick="demoSelectContact(${i})">
          <div class="demo-contact-av">${c.name[0]}</div>
          <div class="demo-contact-info">
            <div class="demo-contact-name">${c.name}</div>
            <div class="demo-contact-sub">${c.company} · ${c.stage}</div>
          </div>
        </div>`).join('')}
      </div>
      <div class="demo-form" style="margin-top:4px">
        <div class="demo-note-log" id="demo-note-log">
          ${notes.map(([t,h])=>`<div class="demo-note-item">${t}<div class="demo-note-time">${h}</div></div>`).join('')}
        </div>
        <div class="demo-row">
          <div class="demo-field"><input class="demo-input" id="demo-note-input" placeholder="Escribe una nota de seguimiento…"></div>
          <button class="demo-btn-sm" onclick="demoAddNote()" style="flex-shrink:0">Guardar</button>
        </div>
      </div>
    </div>`;
  }

  window.demoSelectContact = function(i) {
    activeIdx = i;
    const area = document.getElementById('pj-modal-demo');
    if (area) area.innerHTML = render();
  };

  window.demoAddNote = function() {
    const inp = document.getElementById('demo-note-input');
    if (!inp || !inp.value.trim()) return;
    const now = new Date();
    notes.unshift([inp.value.trim(), now.getHours()+':'+String(now.getMinutes()).padStart(2,'0')]);
    const area = document.getElementById('pj-modal-demo');
    if (area) area.innerHTML = render();
  };

  return render();
}

function buildDemoCotizador() {
  const items = [
    { name: 'Mesa ejecutiva', qty: 2, price: 4500 },
  ];

  function total() {
    const sub = items.reduce((s,it)=>s+it.qty*it.price,0);
    return { sub, iva: sub*0.16, total: sub*1.16 };
  }

  function fmt(n) { return '$'+n.toLocaleString('es-MX',{minimumFractionDigits:2}); }

  function render() {
    const t = total();
    return `<div class="demo-wrap">
      <p class="demo-title">DEMO · CONSTRUYE UNA COTIZACIÓN EN TIEMPO REAL</p>
      <div class="demo-form">
        <div class="demo-row">
          <div class="demo-field" style="flex:2"><div class="demo-label">PRODUCTO</div><input class="demo-input" id="demo-pname" placeholder="Nombre del producto"></div>
          <div class="demo-field" style="flex:.7"><div class="demo-label">CANT.</div><input class="demo-input" id="demo-pqty" type="number" min="1" value="1" placeholder="1"></div>
          <div class="demo-field" style="flex:1"><div class="demo-label">PRECIO UNIT.</div><input class="demo-input" id="demo-pprice" type="number" min="0" placeholder="0.00"></div>
        </div>
        <button class="demo-btn-sm" onclick="demoAddItem()" style="align-self:flex-start">+ Agregar partida</button>
      </div>
      <table class="demo-table" style="margin-top:6px">
        <thead><tr><th>Producto</th><th>Cant.</th><th>P. Unit.</th><th>Subtotal</th></tr></thead>
        <tbody>
          ${items.map((it,i)=>`<tr>
            <td>${it.name}</td>
            <td class="mock-mono">${it.qty}</td>
            <td class="mock-mono">${fmt(it.price)}</td>
            <td class="mock-mono">${fmt(it.qty*it.price)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div class="demo-total-row"><span class="demo-total-lbl">SUBTOTAL</span><span class="demo-total-val">${fmt(t.sub)}</span></div>
      <div class="demo-total-row" style="padding-top:4px;border-top:none"><span class="demo-total-lbl">IVA 16%</span><span class="demo-total-val" style="font-size:13px">${fmt(t.iva)}</span></div>
      <div class="demo-total-row" style="border-top:2px solid #111"><span class="demo-total-lbl" style="color:#111;font-weight:600">TOTAL</span><span class="demo-total-val" style="font-size:20px">${fmt(t.total)}</span></div>
      <button class="btn-primary" style="margin-top:8px;font-size:13px;padding:11px 20px" onclick="demoGenPDF(this)">Generar PDF</button>
    </div>`;
  }

  window.demoAddItem = function() {
    const n = document.getElementById('demo-pname').value.trim();
    const q = parseInt(document.getElementById('demo-pqty').value)||1;
    const p = parseFloat(document.getElementById('demo-pprice').value)||0;
    if (!n || p<=0) return;
    items.push({name:n,qty:q,price:p});
    const area = document.getElementById('pj-modal-demo');
    if (area) area.innerHTML = render();
  };

  window.demoGenPDF = function(btn) {
    btn.textContent = '✓ PDF generado';
    btn.disabled = true;
    setTimeout(()=>{ btn.textContent='Generar PDF'; btn.disabled=false; }, 2000);
  };

  return render();
}

function buildDemoDashboard() {
  const baseKPIs = [
    { val: 347200, label: 'Ventas del mes', fmt: n=>'$'+Math.round(n/1000)+'k', id:'kv' },
    { val: 23,     label: 'Pedidos activos', fmt: n=>n, id:'kp' },
    { val: 14,     label: 'Clientes nuevos', fmt: n=>n, id:'kc' },
    { val: 68,     label: 'Conversión (%)',  fmt: n=>n+'%', id:'kt' },
  ];
  let kpis = baseKPIs.map(k=>({...k}));

  function animCount(id, target, fmtFn) {
    const el = document.getElementById(id);
    if (!el) return;
    let start = 0;
    const step = target/20;
    const iv = setInterval(()=>{
      start = Math.min(start+step, target);
      el.textContent = fmtFn(Math.round(start));
      if (start >= target) clearInterval(iv);
    }, 40);
  }

  function render() {
    return `<div class="demo-wrap">
      <p class="demo-title">DEMO · PANEL EN TIEMPO REAL</p>
      <div class="demo-kpis">
        ${kpis.map(k=>`<div class="demo-kpi">
          <div class="demo-kpi-val" id="${k.id}">${k.fmt(k.val)}</div>
          <div class="demo-kpi-lbl">${k.label}</div>
        </div>`).join('')}
      </div>
      <div class="mock-bar-chart" style="margin-top:12px;height:60px;background:#fff;border-radius:8px;border:1px solid #ececeb;padding:10px 12px;box-sizing:border-box">
        ${[210,285,190,310,250,347].map((v,i)=>`<div class="mock-bar-col"><div class="mock-bar-fill" style="height:${Math.round(v/347*100)}%"></div><span class="mock-bar-lbl">${['E','F','M','A','M','J'][i]}</span></div>`).join('')}
      </div>
      <button class="demo-btn-sm" style="margin-top:10px" onclick="demoRefreshKPIs()">↻ Actualizar datos</button>
    </div>`;
  }

  window.demoRefreshKPIs = function() {
    kpis.forEach(k=>{
      const variance = 0.8 + Math.random()*0.4;
      k.val = Math.round(baseKPIs.find(b=>b.id===k.id).val * variance);
    });
    const area = document.getElementById('pj-modal-demo');
    if (area) {
      area.innerHTML = render();
      kpis.forEach(k=>animCount(k.id, k.val, k.fmt));
    }
  };

  const html = render();
  setTimeout(()=>kpis.forEach(k=>animCount(k.id, k.val, k.fmt)), 100);
  return html;
}

function buildDemoAgenda() {
  const days  = ['Lun','Mar','Mié','Jue','Vie'];
  const hours = ['09:00','10:00','11:00','12:00','15:00'];
  const slots = {};
  slots['1-2'] = 'García';
  slots['3-1'] = 'Rivas';
  slots['0-3'] = 'Torres';

  function key(d,h){ return d+'-'+h; }

  function render() {
    return `<div class="demo-wrap">
      <p class="demo-title">DEMO · HAZ CLIC EN UN ESPACIO LIBRE PARA RESERVAR</p>
      <div class="demo-cal-grid">
        ${days.map(d=>`<div class="demo-cal-head">${d}</div>`).join('')}
        ${hours.flatMap((h,hi)=>days.map((_,di)=>{
          const k=key(di,hi);
          const bk=slots[k];
          return bk
            ? `<div class="demo-cal-slot booked">${bk}<br>${h}</div>`
            : `<div class="demo-cal-slot free" onclick="demoBookSlot(${di},${hi})">${h}</div>`;
        })).join('')}
      </div>
    </div>`;
  }

  window.demoBookSlot = function(di, hi) {
    const name = prompt('Nombre del cliente:');
    if (!name || !name.trim()) return;
    slots[key(di,hi)] = name.trim();
    const area = document.getElementById('pj-modal-demo');
    if (area) area.innerHTML = render();
  };

  return render();
}

function buildDemoInventario() {
  const products = [
    { name: 'Tornillo M8',    cat: 'Fijación',    stock: 12,  min: 50  },
    { name: 'Plancha 3mm',   cat: 'Acero',        stock: 80,  min: 40  },
    { name: 'Pintura base',  cat: 'Acabados',     stock: 28,  min: 30  },
    { name: 'Remache pop',   cat: 'Fijación',     stock: 340, min: 100 },
    { name: 'Sellador PU',   cat: 'Acabados',     stock: 5,   min: 20  },
  ];

  function stClass(p){ return p.stock<=0?'crit':p.stock<p.min?(p.stock<p.min*0.3?'crit':'low'):'ok'; }
  function stLabel(p){ return p.stock<=0?'Sin stock':p.stock<p.min?(p.stock<p.min*0.3?'Crítico':'Bajo'):'OK'; }

  function render(filter='') {
    const list = products.filter(p=>!filter||p.name.toLowerCase().includes(filter.toLowerCase()));
    return `<div class="demo-wrap">
      <p class="demo-title">DEMO · BUSCA Y REGISTRA ENTRADAS DE STOCK</p>
      <input class="demo-input" id="demo-stock-search" placeholder="Buscar producto…" oninput="demoFilterStock(this.value)" value="${filter}">
      <table class="demo-stock-table">
        <thead><tr><th>Producto</th><th>Stock</th><th>Mín.</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          ${list.map((p,i)=>`<tr>
            <td>${p.name}<div style="font-size:9px;color:#bbb;font-family:'JetBrains Mono',monospace">${p.cat}</div></td>
            <td class="mock-mono">${p.stock}</td>
            <td class="mock-mono">${p.min}</td>
            <td><span class="demo-badge ${stClass(p)}">${stLabel(p)}</span></td>
            <td><button class="demo-btn-sm" onclick="demoAddStock(${products.indexOf(p)})">+ Entrada</button></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
  }

  window.demoFilterStock = function(v) {
    const area = document.getElementById('pj-modal-demo');
    if (area) area.innerHTML = render(v);
  };

  window.demoAddStock = function(i) {
    const qty = parseInt(prompt('¿Cuántas unidades ingresan?'));
    if (!qty || qty<=0) return;
    products[i].stock += qty;
    const area = document.getElementById('pj-modal-demo');
    if (area) area.innerHTML = render(document.getElementById('demo-stock-search')?.value||'');
  };

  return render();
}

/* ===== MODAL ===== */

let modalCurrentSlide = 0;
let modalSlides       = [];

function openProjectModal(p) {
  const modal   = document.getElementById('pj-modal');
  const track   = document.getElementById('pj-gallery-track');
  const dots    = document.getElementById('pj-gallery-dots');
  const gallery = document.getElementById('pj-modal-gallery');
  const demo    = document.getElementById('pj-modal-demo');
  const demoBtn = document.getElementById('pj-demo-btn');
  const backBtn = document.getElementById('pj-gallery-back');

  // Fill right panel
  document.getElementById('pj-modal-mid').textContent  = p.id;
  document.getElementById('pj-modal-mtag').textContent = p.tag;
  document.getElementById('pj-modal-mname').textContent = p.name;
  document.getElementById('pj-modal-mdesc').textContent = p.desc;
  const featList = document.getElementById('pj-modal-mfeats');
  featList.innerHTML = (p.features||[]).map(f=>`<li>${f}</li>`).join('');

  // Gallery slides
  modalSlides = PROJECT_GALLERY[p.id] || [];
  track.innerHTML = modalSlides.map(html=>`<div class="pj-gallery-slide">${html}</div>`).join('');
  dots.innerHTML  = modalSlides.map((_,i)=>`<span class="pj-gallery-dot${i===0?' active':''}" onclick="goToSlide(${i})"></span>`).join('');
  modalCurrentSlide = 0;
  track.style.transform = 'translateX(0)';

  // Reset demo/gallery state
  gallery.classList.remove('hidden');
  demo.classList.add('hidden');
  demo.innerHTML = '';
  demoBtn.classList.remove('hidden');
  backBtn.classList.add('hidden');

  // Wire demo button
  demoBtn.onclick = () => {
    gallery.classList.add('hidden');
    demo.classList.remove('hidden');
    demo.innerHTML = buildDemo(p.id);
    demoBtn.classList.add('hidden');
    backBtn.classList.remove('hidden');
  };

  backBtn.onclick = () => {
    demo.classList.add('hidden');
    demo.innerHTML = '';
    gallery.classList.remove('hidden');
    demoBtn.classList.remove('hidden');
    backBtn.classList.add('hidden');
  };

  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeProjectModal() {
  const modal = document.getElementById('pj-modal');
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

window.goToSlide = function(idx) {
  const track = document.getElementById('pj-gallery-track');
  const dots  = document.querySelectorAll('.pj-gallery-dot');
  if (!track || idx < 0 || idx >= modalSlides.length) return;
  modalCurrentSlide = idx;
  track.style.transform = `translateX(-${idx * 100}%)`;
  dots.forEach((d,i)=>d.classList.toggle('active', i===idx));
};

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

  // Inicializar secciones: solo la primera visible
  initSectionDisplay();

  // Navegación fullpage: wheel
  const landingContainer = $('screen-landing');
  if (landingContainer) {
    landingContainer.addEventListener('wheel', e => {
      if (state.phase !== 'landing') return;
      if (document.getElementById('pj-modal').classList.contains('is-open')) return;
      e.preventDefault();
      navigateSection(e.deltaY > 0 ? 1 : -1);
    }, { passive: false });

    // Touch
    let touchStartY = 0;
    landingContainer.addEventListener('touchstart', e => {
      touchStartY = e.touches[0].clientY;
    }, { passive: true });
    landingContainer.addEventListener('touchend', e => {
      if (state.phase !== 'landing') return;
      const dy = touchStartY - e.changedTouches[0].clientY;
      if (Math.abs(dy) > 50) navigateSection(dy > 0 ? 1 : -1);
    }, { passive: true });
  }

  // Teclado
  document.addEventListener('keydown', e => {
    if (state.phase !== 'landing') return;
    if (document.getElementById('pj-modal').classList.contains('is-open')) return;
    if (e.key === 'ArrowDown' || e.key === 'PageDown') {
      e.preventDefault();
      navigateSection(1);
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      navigateSection(-1);
    }
  });

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

  // Modal: cerrar con X, backdrop y ESC
  $('pj-modal-x').addEventListener('click', closeProjectModal);
  $('pj-modal-bd').addEventListener('click', closeProjectModal);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeProjectModal();
  });

  // Modal: navegación galería
  $('pj-gallery-prev').addEventListener('click', () => goToSlide(modalCurrentSlide - 1));
  $('pj-gallery-next').addEventListener('click', () => goToSlide(modalCurrentSlide + 1));
});
