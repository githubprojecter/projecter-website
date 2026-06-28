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
    id: '01', name: 'Centauro — ERP para industria del acero', tag: 'Manufactura', kind: 'PLATAFORMA WEB', url: 'cotiza.projecter.mx',
    desc: 'Sistema de gestión integral para una empresa de lámina y teja metálica. Centraliza cotizaciones, pedidos, inventario por rollo/kg, maquila externa y operación multi-usuario en una sola plataforma.',
    features: ['Cotizador de lámina y teja en tiempo real', 'Pipeline de producción y maquila', 'Inventario por rollo con alertas de stock', 'Panel ejecutivo multi-usuario'],
  },
  {
    id: '02', name: 'OnOffice — Punto de venta multi-sucursal', tag: 'Retail', kind: 'PLATAFORMA WEB', url: 'onoffice.projecter.mx',
    desc: 'Sistema de punto de venta y gestión integral para negocios con múltiples sucursales. Centraliza ventas, inventario, clientes y reportes en tiempo real desde cualquier dispositivo.',
    features: ['Punto de venta rápido desde cualquier dispositivo', 'Inventario sincronizado por sucursal', 'Dashboard de ventas, ganancias y productos top', 'Gestión de clientes, proveedores y gastos'],
  },
  {
    id: '03', name: 'Tailorp — CRM para inmobiliaria', tag: 'Inmobiliaria', kind: 'PLATAFORMA WEB', url: 'tailorp.projecter.mx',
    desc: 'Plataforma CRM diseñada para agencias inmobiliarias. Centraliza prospectos, propiedades, tareas pendientes y seguimiento de operaciones de compra, renta y venta en un solo lugar.',
    features: ['Cartera de prospectos con estatus y filtros', 'Vinculación de prospectos a inmuebles de interés', 'Agenda de pendientes por prospecto', 'Dashboard de conversiones y portafolio activo'],
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
      <div class="mock-bar"><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-url">cotiza.projecter.mx / cotizaciones</span></div>
      <div class="mock-body">
        <p class="mock-section-title">COTIZADOR — CENTAURO ERP</p>
        <div class="mock-kpi-row">
          <div class="mock-kpi"><span class="mock-kpi-val" style="font-size:13px">COT-0447</span><span class="mock-kpi-lbl">Folio</span></div>
          <div class="mock-kpi"><span class="mock-kpi-val" style="font-size:11px">Aceros del Norte</span><span class="mock-kpi-lbl">Cliente</span></div>
        </div>
        <table class="mock-table" style="margin-top:8px">
          <thead><tr><th>Producto</th><th>Kg</th><th>$/kg</th><th>Total</th></tr></thead>
          <tbody>
            <tr><td style="font-size:10px">Galv. cal.26 1.22m</td><td class="mock-mono">500</td><td class="mock-mono">$95.50</td><td class="mock-mono" style="color:#111;font-weight:600">$47,750</td></tr>
            <tr><td style="font-size:10px">Teja R101 cal.26</td><td class="mock-mono">280</td><td class="mock-mono">$88.00</td><td class="mock-mono" style="color:#111;font-weight:600">$24,640</td></tr>
          </tbody>
        </table>
        <div style="display:flex;justify-content:flex-end;margin-top:8px;padding-top:6px;border-top:1px solid #e8e8e6">
          <div style="text-align:right"><div style="font-size:10px;color:#aaa;font-family:'JetBrains Mono',monospace">TOTAL + IVA</div><div style="font-size:16px;font-weight:700;font-family:'JetBrains Mono',monospace">$83,688.80</div></div>
        </div>
      </div>
    </div>`,
    `<div class="mock-win">
      <div class="mock-bar"><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-url">cotiza.projecter.mx / pedidos</span></div>
      <div class="mock-body">
        <p class="mock-section-title">PIPELINE DE PEDIDOS</p>
        <table class="mock-table">
          <thead><tr><th>Folio</th><th>Cliente</th><th>Estatus</th><th>Total</th></tr></thead>
          <tbody>
            <tr><td class="mock-mono">#VTA-0314</td><td style="font-size:10px">Aceros del Norte</td><td><span class="mock-badge mock-badge-proc">Producción</span></td><td class="mock-mono" style="font-size:10px">$47,800</td></tr>
            <tr><td class="mock-mono">#VTA-0315</td><td style="font-size:10px">Ferretera Mty</td><td><span class="mock-badge mock-badge-pend">Nuevo</span></td><td class="mock-mono" style="font-size:10px">$23,400</td></tr>
            <tr><td class="mock-mono">#VTA-0316</td><td style="font-size:10px">Construcciones Río</td><td><span class="mock-badge" style="background:#e0f2fe;color:#0369a1">Listo</span></td><td class="mock-mono" style="font-size:10px">$12,960</td></tr>
            <tr><td class="mock-mono">#VTA-0317</td><td style="font-size:10px">Materiales Oax.</td><td><span class="mock-badge mock-badge-done">Entregado</span></td><td class="mock-mono" style="font-size:10px">$38,720</td></tr>
          </tbody>
        </table>
      </div>
    </div>`,
    `<div class="mock-win">
      <div class="mock-bar"><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-url">cotiza.projecter.mx / inventario</span></div>
      <div class="mock-body">
        <p class="mock-section-title">INVENTARIO POR ROLLO</p>
        <div class="mock-kpi-row" style="margin-bottom:8px">
          <div class="mock-kpi"><span class="mock-kpi-val">2,910</span><span class="mock-kpi-lbl">kg en planta</span></div>
          <div class="mock-kpi"><span class="mock-kpi-val" style="color:#dc2626">2</span><span class="mock-kpi-lbl">Alertas críticas</span></div>
        </div>
        ${[['R00045','Galv. cal.26','2,450 kg','ok'],['R00046','Galv. cal.24','180 kg','low'],['R00047','Acero Pintro','0 kg','crit']].map(([c,p,s,b])=>`<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid #f2f2f0"><span class="mock-mono" style="font-size:9px;color:#888;min-width:44px">${c}</span><span style="flex:1;font-size:10px">${p}</span><span class="mock-mono" style="font-size:10px">${s}</span><span class="mock-badge ${b==='ok'?'mock-badge-done':b==='low'?'mock-badge-proc':'mock-badge-crit'}" style="${b==='crit'?'background:#fee2e2;color:#991b1b':''}">${b==='ok'?'OK':b==='low'?'Bajo':'Crítico'}</span></div>`).join('')}
      </div>
    </div>`,
  ],
  '02': [
    `<div class="mock-win">
      <div class="mock-bar"><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-url">onoffice.projecter.mx / venta</span></div>
      <div class="mock-body">
        <p class="mock-section-title">PUNTO DE VENTA</p>
        <div style="display:flex;gap:8px">
          <div style="flex:1;display:grid;grid-template-columns:1fr 1fr;gap:5px">
            ${['Café Americano $45','Café Latte $55','Agua 600ml $18','Refresco $25','Sándwich $85','Galletas $32'].map((p,i)=>`<div style="padding:6px 8px;border:1px solid ${i===0||i===2?'#111':'#e8e8e6'};border-radius:6px;font-size:9px;line-height:1.3">${p}</div>`).join('')}
          </div>
          <div style="width:90px;border-left:1px solid #e8e8e6;padding-left:8px;display:flex;flex-direction:column;gap:4px">
            <div style="font-family:'JetBrains Mono',monospace;font-size:8px;color:#aaa">CARRITO</div>
            <div style="font-size:9px">Café Americano <strong>×2</strong></div>
            <div style="font-size:9px">Agua 600ml <strong>×1</strong></div>
            <div style="margin-top:auto;padding-top:6px;border-top:1px solid #e8e8e6;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700">$108.00</div>
            <div style="padding:4px 8px;background:#111;color:#fff;border-radius:5px;font-size:9px;text-align:center">Cobrar</div>
          </div>
        </div>
      </div>
    </div>`,
    `<div class="mock-win">
      <div class="mock-bar"><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-url">onoffice.projecter.mx / dashboard</span></div>
      <div class="mock-body">
        <p class="mock-section-title">DASHBOARD HOY</p>
        <div class="mock-kpi-row">
          <div class="mock-kpi"><span class="mock-kpi-val" style="font-size:13px">$3,840</span><span class="mock-kpi-lbl">Ventas</span></div>
          <div class="mock-kpi"><span class="mock-kpi-val" style="font-size:13px">$1,152</span><span class="mock-kpi-lbl">Ganancia</span></div>
          <div class="mock-kpi"><span class="mock-kpi-val" style="font-size:13px">24</span><span class="mock-kpi-lbl">Tickets</span></div>
        </div>
        <div class="mock-bar-chart" style="margin-top:6px">
          ${[2100,3400,2850,4200,3180,3840,800].map((v,i)=>`<div class="mock-bar-col"><div class="mock-bar-fill" style="height:${Math.round(v/42)}%;background:${i===6?'#111':'#d4d4d4'}"></div><span class="mock-bar-lbl">${['L','M','X','J','V','S','H'][i]}</span></div>`).join('')}
        </div>
      </div>
    </div>`,
    `<div class="mock-win">
      <div class="mock-bar"><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-url">onoffice.projecter.mx / inventario</span></div>
      <div class="mock-body">
        <p class="mock-section-title">INVENTARIO · SUCURSAL PRINCIPAL</p>
        <table class="mock-table">
          <thead><tr><th>Producto</th><th>Stock</th><th>Estado</th></tr></thead>
          <tbody>
            <tr><td>Café Americano</td><td class="mock-mono">50</td><td><span class="mock-badge mock-badge-done">OK</span></td></tr>
            <tr><td>Sándwich Club</td><td class="mock-mono">8</td><td><span class="mock-badge mock-badge-pend">Bajo</span></td></tr>
            <tr><td>Galletas surtidas</td><td class="mock-mono">0</td><td><span class="mock-badge" style="background:#fee2e2;color:#991b1b">Crítico</span></td></tr>
          </tbody>
        </table>
      </div>
    </div>`,
  ],
  '03': [
    `<div class="mock-win">
      <div class="mock-bar"><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-url">tailorp.projecter.mx / prospectos</span></div>
      <div class="mock-body">
        <p class="mock-section-title">PROSPECTOS CRM</p>
        <table class="mock-table">
          <thead><tr><th>Nombre</th><th>Operación</th><th>Estatus</th><th>Pend.</th></tr></thead>
          <tbody>
            <tr><td>Carlos Méndez</td><td class="mock-mono" style="font-size:9px">Compra</td><td><span class="mock-badge mock-badge-new">Calificado</span></td><td class="mock-mono">2</td></tr>
            <tr><td>Ana García</td><td class="mock-mono" style="font-size:9px">Renta</td><td><span class="mock-badge mock-badge-pend">Nuevo</span></td><td class="mock-mono">1</td></tr>
            <tr><td>Roberto Silva</td><td class="mock-mono" style="font-size:9px">Venta</td><td><span class="mock-badge mock-badge-pend">Seguimiento</span></td><td class="mock-mono">0</td></tr>
            <tr><td>Laura Torres</td><td class="mock-mono" style="font-size:9px">Compra</td><td><span class="mock-badge mock-badge-done">Cerrado</span></td><td class="mock-mono">0</td></tr>
          </tbody>
        </table>
      </div>
    </div>`,
    `<div class="mock-win">
      <div class="mock-bar"><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-url">tailorp.projecter.mx / prospectos / detalle</span></div>
      <div class="mock-body">
        <p class="mock-section-title">CARLOS MÉNDEZ · COMPRA</p>
        <div class="mock-kpi-row" style="margin-bottom:8px">
          <div class="mock-kpi"><span class="mock-kpi-val" style="font-size:12px">$2,400,000</span><span class="mock-kpi-lbl">Presupuesto</span></div>
          <div class="mock-kpi"><span class="mock-kpi-val mock-badge-new" style="font-size:10px;padding:3px 0">Calificado</span><span class="mock-kpi-lbl">Estatus</span></div>
        </div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:8px;color:#aaa;margin-bottom:5px">PENDIENTES</div>
        ${['Confirmar visita a INM-001','Enviar fichas técnicas'].map(t=>`<div style="display:flex;gap:6px;align-items:center;padding:5px 0;border-bottom:1px solid #f0f0ee;font-size:10px"><span style="width:12px;height:12px;border:1px solid #ccc;border-radius:3px;display:inline-block;flex-shrink:0"></span>${t}</div>`).join('')}
      </div>
    </div>`,
    `<div class="mock-win">
      <div class="mock-bar"><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-dot"></span><span class="mock-url">tailorp.projecter.mx / inmuebles</span></div>
      <div class="mock-body">
        <p class="mock-section-title">CARTERA DE INMUEBLES</p>
        <table class="mock-table">
          <thead><tr><th>ID</th><th>Tipo</th><th>Zona</th><th>Precio</th><th></th></tr></thead>
          <tbody>
            <tr><td class="mock-mono">INM-001</td><td>Casa</td><td style="font-size:9px">Las Palmas</td><td class="mock-mono" style="font-size:9px">$2.4M</td><td><span class="mock-badge mock-badge-done">Disp.</span></td></tr>
            <tr><td class="mock-mono">INM-002</td><td>Depto</td><td style="font-size:9px">Centro</td><td class="mock-mono" style="font-size:9px">$8,500/m</td><td><span class="mock-badge mock-badge-done">Disp.</span></td></tr>
            <tr><td class="mock-mono">INM-003</td><td>Casa</td><td style="font-size:9px">Res. Norte</td><td class="mock-mono" style="font-size:9px">$3.8M</td><td><span class="mock-badge" style="background:#e5e5e5;color:#555">Vendido</span></td></tr>
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
  if (id === '01') return buildDemoCentauro();
  if (id === '02') return buildDemoOnoffice();
  if (id === '03') return buildDemoTailorp();
  if (id === '04') return buildDemoDashboard();
  if (id === '05') return buildDemoAgenda();
  if (id === '06') return buildDemoInventario();
  return '<p style="color:#aaa;font-size:13px">Demo no disponible.</p>';
}

function buildDemoCentauro() {
  /* ---- estado compartido del demo ---- */
  var activeTab = 'cotizador';

  /* -------- COTIZADOR -------- */
  var cot_partidas = [
    { tipo: 'Lamina', material: 'Galvanizada', calibre: '26', ancho: '1.22m', kg: 500, pxkg: 95.50 }
  ];
  var cot_tipo = 'Lamina';
  var cot_pdf  = false;

  function precioKg(calibre) {
    if (calibre === '22') return 102.00;
    if (calibre === '24') return 98.50;
    return 95.50;
  }

  function fmtMXN(n) {
    var s = n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return '$' + s;
  }

  function renderCotizadorTab() {
    var subtotal = 0;
    cot_partidas.forEach(function(p) { subtotal += p.kg * p.pxkg; });
    var iva   = subtotal * 0.16;
    var total = subtotal + iva;

    if (cot_pdf) {
      return '<div class="demo-wrap">' +
        '<button class="demo-back-btn" onclick="dcCotBack()">← Cotización</button>' +
        '<div style="border:1px solid #e8e8e6;border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:10px">' +
          '<div style="display:flex;justify-content:space-between;align-items:flex-start">' +
            '<div><div style="font-family:\'JetBrains Mono\',monospace;font-size:9px;color:#aaa;letter-spacing:.15em">CENTAURO ERP</div><div style="font-size:16px;font-weight:700;margin-top:2px">COT-0447</div></div>' +
            '<div style="text-align:right"><div style="font-size:10px;color:#888">Aceros del Norte</div><div style="font-family:\'JetBrains Mono\',monospace;font-size:9px;color:#aaa">28 Jun 2026</div></div>' +
          '</div>' +
          '<table class="demo-table" style="margin-top:4px">' +
            '<thead><tr><th>Producto</th><th>Kg</th><th>$/kg</th><th>Importe</th></tr></thead>' +
            '<tbody>' +
              cot_partidas.map(function(p) {
                return '<tr>' +
                  '<td style="font-size:11px">' + p.material + ' cal.' + p.calibre + ' ' + p.ancho + '</td>' +
                  '<td class="mock-mono">' + p.kg + '</td>' +
                  '<td class="mock-mono">' + fmtMXN(p.pxkg) + '</td>' +
                  '<td class="mock-mono" style="font-weight:600">' + fmtMXN(p.kg * p.pxkg) + '</td>' +
                '</tr>';
              }).join('') +
            '</tbody>' +
          '</table>' +
          '<div style="display:flex;flex-direction:column;gap:4px;padding-top:8px;border-top:1px solid #e8e8e6">' +
            '<div style="display:flex;justify-content:space-between;font-size:11px"><span style="color:#888">Subtotal</span><span class="mock-mono">' + fmtMXN(subtotal) + '</span></div>' +
            '<div style="display:flex;justify-content:space-between;font-size:11px"><span style="color:#888">IVA 16%</span><span class="mock-mono">' + fmtMXN(iva) + '</span></div>' +
            '<div style="display:flex;justify-content:space-between;font-size:14px;font-weight:700;margin-top:4px"><span>TOTAL</span><span class="mock-mono">' + fmtMXN(total) + '</span></div>' +
          '</div>' +
          '<div style="margin-top:4px;padding:8px 12px;background:#d1fae5;border-radius:7px;font-size:11px;color:#065f46;font-weight:600">Cotizacion generada correctamente</div>' +
        '</div>' +
      '</div>';
    }

    return '<div class="demo-wrap">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px">' +
        '<div><div style="font-family:\'JetBrains Mono\',monospace;font-size:9px;color:#aaa">COT-0447 · Aceros del Norte</div></div>' +
        '<button class="demo-btn-sm" onclick="dcCotPDF()">Generar PDF</button>' +
      '</div>' +
      '<div style="display:flex;gap:6px;margin-bottom:10px">' +
        '<select class="demo-input" id="dc-cot-tipo" style="flex:1;padding:5px 8px;font-size:11px" onchange="dcCotTipo(this.value)">' +
          '<option value="Lamina"' + (cot_tipo === 'Lamina' ? ' selected' : '') + '>Lamina</option>' +
          '<option value="Teja"' + (cot_tipo === 'Teja' ? ' selected' : '') + '>Teja</option>' +
          '<option value="Servicio"' + (cot_tipo === 'Servicio' ? ' selected' : '') + '>Servicio</option>' +
        '</select>' +
      '</div>' +
      (cot_tipo !== 'Servicio' ? (
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px">' +
          '<div class="demo-field">' +
            '<div class="demo-label">MATERIAL</div>' +
            '<select class="demo-input" id="dc-cot-mat" style="padding:5px 8px;font-size:11px">' +
              '<option>Galvanizada</option><option>Pintro</option><option>Acero Negro</option>' +
            '</select>' +
          '</div>' +
          '<div class="demo-field">' +
            '<div class="demo-label">CALIBRE</div>' +
            '<select class="demo-input" id="dc-cot-cal" style="padding:5px 8px;font-size:11px" onchange="dcCotPrecio(this.value)">' +
              '<option value="26">Cal. 26</option><option value="24">Cal. 24</option><option value="22">Cal. 22</option>' +
            '</select>' +
          '</div>' +
          '<div class="demo-field">' +
            '<div class="demo-label">ANCHO</div>' +
            '<select class="demo-input" id="dc-cot-ancho" style="padding:5px 8px;font-size:11px">' +
              '<option>1.00m</option><option selected>1.22m</option>' +
            '</select>' +
          '</div>' +
          '<div class="demo-field">' +
            '<div class="demo-label">KILOS</div>' +
            '<input class="demo-input" id="dc-cot-kg" type="number" min="1" placeholder="kg" style="padding:5px 8px;font-size:11px">' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">' +
          '<div style="font-family:\'JetBrains Mono\',monospace;font-size:10px;color:#888">$/kg: <span id="dc-cot-precio">$95.50</span></div>' +
          '<button class="demo-btn-sm" style="margin-left:auto" onclick="dcCotAgregar()">+ Agregar partida</button>' +
        '</div>'
      ) : (
        '<div class="demo-field" style="margin-bottom:10px"><div class="demo-label">DESCRIPCION DEL SERVICIO</div><input class="demo-input" id="dc-cot-serv" placeholder="Ej: Maquila de corte cal.26"></div>' +
        '<div class="demo-field" style="margin-bottom:10px"><div class="demo-label">IMPORTE</div><input class="demo-input" id="dc-cot-imp" type="number" placeholder="0.00"></div>' +
        '<button class="demo-btn-sm" style="align-self:flex-start;margin-bottom:10px" onclick="dcCotAgregarServ()">+ Agregar</button>'
      )) +
      '<table class="demo-table">' +
        '<thead><tr><th>Producto</th><th>Kg</th><th>$/kg</th><th>Importe</th><th></th></tr></thead>' +
        '<tbody>' +
          cot_partidas.map(function(p, i) {
            return '<tr>' +
              '<td style="font-size:10px">' + p.material + ' cal.' + p.calibre + ' ' + p.ancho + '</td>' +
              '<td class="mock-mono">' + p.kg + '</td>' +
              '<td class="mock-mono">' + fmtMXN(p.pxkg) + '</td>' +
              '<td class="mock-mono" style="font-weight:600">' + fmtMXN(p.kg * p.pxkg) + '</td>' +
              '<td><button class="demo-btn-sm" onclick="dcCotEliminar(' + i + ')" style="padding:2px 7px;font-size:9px">x</button></td>' +
            '</tr>';
          }).join('') +
        '</tbody>' +
      '</table>' +
      '<div style="display:flex;flex-direction:column;gap:3px;padding-top:6px;border-top:1px solid #e8e8e6;margin-top:4px">' +
        '<div class="demo-total-row" style="padding:4px 0"><span class="demo-total-lbl">SUBTOTAL</span><span class="demo-total-val" style="font-size:14px">' + fmtMXN(subtotal) + '</span></div>' +
        '<div class="demo-total-row" style="padding:4px 0;border-top:none"><span class="demo-total-lbl">IVA 16%</span><span style="font-family:\'JetBrains Mono\',monospace;font-size:12px;color:#888">' + fmtMXN(iva) + '</span></div>' +
        '<div class="demo-total-row" style="padding:6px 0;border-top:2px solid #111"><span class="demo-total-lbl" style="font-weight:700;color:#111;font-size:11px">TOTAL</span><span class="demo-total-val">' + fmtMXN(total) + '</span></div>' +
      '</div>' +
    '</div>';
  }

  /* -------- PEDIDOS -------- */
  var PED_STAGES  = ['Nuevo','Confirmado','Produccion','Maquila','Listo','Entregado'];
  var PED_SC      = ['pend','pend','proc','proc','proc','done'];
  var ped_orders  = [
    { folio:'#VTA-0314', client:'Aceros del Norte',   total:47800, stage:2 },
    { folio:'#VTA-0315', client:'Ferretera Monterrey', total:23400, stage:0 },
    { folio:'#VTA-0316', client:'Construcciones Rio',  total:12960, stage:4 },
    { folio:'#VTA-0317', client:'Materiales Oaxaca',   total:38720, stage:5 },
  ];
  var ped_view    = 'list';
  var ped_active  = -1;

  function pedBadge(s) {
    return '<span class="demo-badge ' + PED_SC[s] + '">' + PED_STAGES[s] + '</span>';
  }

  function renderPedidosTab() {
    if (ped_view === 'detail') {
      var o = ped_orders[ped_active];
      return '<div class="demo-wrap">' +
        '<button class="demo-back-btn" onclick="dcPedBack()">← Pedidos</button>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
          '<div>' +
            '<div style="font-family:\'JetBrains Mono\',monospace;font-size:9px;color:#aaa">PEDIDO</div>' +
            '<div style="font-size:18px;font-weight:700;font-family:\'JetBrains Mono\',monospace">' + o.folio + '</div>' +
          '</div>' +
          pedBadge(o.stage) +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">' +
          '<div class="demo-kpi"><div class="demo-kpi-val" style="font-size:11px;line-height:1.3">' + o.client + '</div><div class="demo-kpi-lbl">Cliente</div></div>' +
          '<div class="demo-kpi"><div class="demo-kpi-val" style="font-size:15px">' + fmtMXN(o.total) + '</div><div class="demo-kpi-lbl">Total</div></div>' +
        '</div>' +
        '<div class="dc-pipeline-h">' +
          PED_STAGES.map(function(s, si) {
            var active  = si === o.stage;
            var past    = si < o.stage;
            var dotBg   = (past || active) ? '#111' : '#e0e0de';
            var lblColor= past ? '#aaa' : (active ? '#111' : '#ccc');
            var lblW    = active ? '600' : '400';
            return '<div class="dc-pipeline-step">' +
              (si > 0 ? '<div class="dc-pipeline-line" style="background:' + (past ? '#111' : '#e0e0de') + '"></div>' : '') +
              '<div class="dc-pipeline-dot" style="background:' + dotBg + ';border:2px solid ' + dotBg + '"></div>' +
              '<div class="dc-pipeline-lbl" style="color:' + lblColor + ';font-weight:' + lblW + '">' + s + '</div>' +
            '</div>';
          }).join('') +
        '</div>' +
        (o.stage < PED_STAGES.length - 1
          ? '<button class="demo-btn-sm" style="margin-top:14px" onclick="dcPedAvanzar(' + ped_active + ')">Avanzar a ' + PED_STAGES[o.stage + 1] + ' →</button>'
          : '<div style="margin-top:14px;padding:10px 14px;background:#d1fae5;border-radius:7px;font-size:12px;color:#065f46;font-weight:600">Pedido entregado</div>') +
      '</div>';
    }

    return '<div class="demo-wrap">' +
      '<p class="demo-title" style="margin:0 0 8px">PEDIDOS</p>' +
      '<table class="demo-table">' +
        '<thead><tr><th>Folio</th><th>Cliente</th><th>Estatus</th><th>Total</th><th></th></tr></thead>' +
        '<tbody>' +
          ped_orders.map(function(o, i) {
            return '<tr>' +
              '<td class="mock-mono" style="font-size:10px">' + o.folio + '</td>' +
              '<td style="font-size:11px;font-weight:600">' + o.client + '</td>' +
              '<td>' + pedBadge(o.stage) + '</td>' +
              '<td class="mock-mono" style="font-size:10px">' + fmtMXN(o.total) + '</td>' +
              '<td><button class="demo-btn-sm" onclick="dcPedDetalle(' + i + ')">Ver →</button></td>' +
            '</tr>';
          }).join('') +
        '</tbody>' +
      '</table>' +
    '</div>';
  }

  /* -------- INVENTARIO -------- */
  var inv_items = [
    { cod:'R00045', prod:'Galvanizada cal.26', alm:'Planta 1',  kg:2450, status:'ok'   },
    { cod:'R00046', prod:'Galvanizada cal.24', alm:'Planta 2',  kg:180,  status:'bajo' },
    { cod:'T00012', prod:'Teja R101',          alm:'Externo',   kg:280,  status:'ok'   },
    { cod:'R00047', prod:'Acero Pintro',       alm:'Planta 1',  kg:0,    status:'crit' },
  ];
  var inv_open = -1;

  function invBadge(s) {
    if (s === 'ok')   return '<span class="demo-badge done">OK</span>';
    if (s === 'bajo') return '<span class="demo-badge proc">Bajo</span>';
    return '<span class="demo-badge" style="background:#fee2e2;color:#991b1b">Critico</span>';
  }

  function renderInvTab() {
    var totalKg = 0;
    var alertas = 0;
    inv_items.forEach(function(p) { totalKg += p.kg; if (p.status !== 'ok') alertas++; });
    var valor = totalKg * 96.5;

    return '<div class="demo-wrap">' +
      '<div class="demo-kpis" style="grid-template-columns:1fr 1fr 1fr;margin-bottom:10px">' +
        '<div class="demo-kpi"><div class="demo-kpi-val" style="font-size:14px">' + totalKg.toLocaleString() + ' kg</div><div class="demo-kpi-lbl">Stock total</div></div>' +
        '<div class="demo-kpi"><div class="demo-kpi-val" style="font-size:14px">' + fmtMXN(valor) + '</div><div class="demo-kpi-lbl">Valor est.</div></div>' +
        '<div class="demo-kpi"><div class="demo-kpi-val" style="font-size:18px;color:' + (alertas > 0 ? '#dc2626' : '#111') + '">' + alertas + '</div><div class="demo-kpi-lbl">Alertas</div></div>' +
      '</div>' +
      '<table class="demo-stock-table">' +
        '<thead><tr><th>Codigo</th><th>Producto</th><th>Almacen</th><th>Stock</th><th>Estado</th></tr></thead>' +
        '<tbody>' +
          inv_items.map(function(p, i) {
            var panelRow = inv_open === i
              ? ('<tr><td colspan="5">' +
                  '<div class="demo-entry-panel">' +
                    '<div style="font-family:\'JetBrains Mono\',monospace;font-size:9px;color:#aaa;margin-bottom:6px">REGISTRAR MOVIMIENTO · ' + p.cod + '</div>' +
                    '<div class="demo-row">' +
                      '<select class="demo-input" id="dc-inv-tipo" style="flex:.8;padding:5px 8px;font-size:11px"><option>Entrada</option><option>Salida</option></select>' +
                      '<div class="demo-field"><input class="demo-input" id="dc-inv-qty" type="number" min="1" placeholder="kg" style="padding:5px 8px;font-size:11px"></div>' +
                      '<div class="demo-field"><input class="demo-input" id="dc-inv-nota" placeholder="Nota opcional" style="padding:5px 8px;font-size:11px"></div>' +
                      '<button class="demo-btn-sm" onclick="dcInvGuardar(' + i + ')">Guardar</button>' +
                    '</div>' +
                  '</div>' +
                '</td></tr>')
              : '';
            return '<tr style="cursor:pointer" onclick="dcInvToggle(' + i + ')">' +
              '<td class="mock-mono" style="font-size:9px;color:#888">' + p.cod + '</td>' +
              '<td style="font-size:11px;font-weight:600">' + p.prod + '</td>' +
              '<td style="font-size:10px;color:#888">' + p.alm + '</td>' +
              '<td class="mock-mono" style="font-size:11px">' + p.kg.toLocaleString() + ' kg</td>' +
              '<td>' + invBadge(p.status) + '</td>' +
            '</tr>' + panelRow;
          }).join('') +
        '</tbody>' +
      '</table>' +
    '</div>';
  }

  /* -------- PANEL -------- */
  var panel_base = { ventas: 284600, activos: 12, ocs: 3, alertas: 2 };
  var panel_vals = { ventas: 284600, activos: 12, ocs: 3, alertas: 2 };
  var panel_meses = [198000, 223000, 245000, 267000, 258000, 284600];

  function renderPanelTab() {
    var maxV = Math.max.apply(null, panel_meses);
    var labels = ['Ene','Feb','Mar','Abr','May','Jun'];
    var moves = [
      { tipo:'Cotizacion', desc:'COT-0447 Aceros del Norte',   val:'$47,750', fecha:'28 Jun' },
      { tipo:'Pedido',     desc:'VTA-0314 confirmado',         val:'12 un',   fecha:'27 Jun' },
      { tipo:'Inventario', desc:'Entrada R00045 +300 kg',      val:'+300 kg',  fecha:'26 Jun' },
      { tipo:'Pedido',     desc:'VTA-0316 listo para entrega', val:'$12,960', fecha:'25 Jun' },
      { tipo:'Alerta',     desc:'R00047 Acero Pintro en cero', val:'0 kg',    fecha:'24 Jun' },
    ];

    return '<div class="demo-wrap">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">' +
        '<p class="demo-title" style="margin:0">PANEL EJECUTIVO</p>' +
        '<button class="demo-btn-sm" onclick="dcPanelRefresh()">Actualizar</button>' +
      '</div>' +
      '<div class="demo-kpis" style="margin-bottom:12px">' +
        '<div class="demo-kpi"><div class="demo-kpi-val" id="dc-kpi-ventas" style="font-size:14px">' + fmtMXN(panel_vals.ventas) + '</div><div class="demo-kpi-lbl">Ventas del mes</div></div>' +
        '<div class="demo-kpi"><div class="demo-kpi-val" id="dc-kpi-activos">' + panel_vals.activos + '</div><div class="demo-kpi-lbl">Pedidos activos</div></div>' +
        '<div class="demo-kpi"><div class="demo-kpi-val" id="dc-kpi-ocs">' + panel_vals.ocs + '</div><div class="demo-kpi-lbl">OCs pendientes</div></div>' +
        '<div class="demo-kpi"><div class="demo-kpi-val" id="dc-kpi-alertas" style="color:' + (panel_vals.alertas > 0 ? '#dc2626' : '#111') + '">' + panel_vals.alertas + '</div><div class="demo-kpi-lbl">Alertas inv.</div></div>' +
      '</div>' +
      '<div style="margin-bottom:12px">' +
        '<div style="font-family:\'JetBrains Mono\',monospace;font-size:9px;color:#aaa;margin-bottom:6px">VENTAS MENSUALES 2026</div>' +
        '<div class="mock-bar-chart" style="height:60px">' +
          panel_meses.map(function(v, i) {
            var pct = Math.round((v / maxV) * 100);
            return '<div class="mock-bar-col"><div class="mock-bar-fill" style="height:' + pct + '%"></div><span class="mock-bar-lbl">' + labels[i] + '</span></div>';
          }).join('') +
        '</div>' +
      '</div>' +
      '<div style="font-family:\'JetBrains Mono\',monospace;font-size:9px;color:#aaa;margin-bottom:6px">ULTIMOS MOVIMIENTOS</div>' +
      '<div class="demo-activity">' +
        moves.map(function(m) {
          var bg = m.tipo === 'Alerta' ? '#fee2e2' : (m.tipo === 'Inventario' ? '#f0fdf4' : '#f7f7f6');
          var col= m.tipo === 'Alerta' ? '#991b1b' : (m.tipo === 'Inventario' ? '#166534' : '#555');
          return '<div class="demo-activity-item">' +
            '<span style="font-family:\'JetBrains Mono\',monospace;font-size:8px;padding:2px 7px;border-radius:99px;background:' + bg + ';color:' + col + ';flex-shrink:0">' + m.tipo.toUpperCase() + '</span>' +
            '<span class="demo-activity-msg">' + m.desc + '</span>' +
            '<span class="demo-activity-time">' + m.fecha + '</span>' +
          '</div>';
        }).join('') +
      '</div>' +
    '</div>';
  }

  /* -------- RENDER PRINCIPAL (tabs) -------- */
  function renderTabs() {
    var tabs = ['cotizador','pedidos','inventario','panel'];
    var labels = ['Cotizador','Pedidos','Inventario','Panel'];
    var tabBar = '<div class="demo-tabs">' +
      tabs.map(function(t, i) {
        return '<button class="demo-tab' + (activeTab === t ? ' active' : '') + '" onclick="dcTab(\'' + t + '\')">' + labels[i] + '</button>';
      }).join('') +
    '</div>';

    var body = '';
    if (activeTab === 'cotizador')  body = renderCotizadorTab();
    if (activeTab === 'pedidos')    body = renderPedidosTab();
    if (activeTab === 'inventario') body = renderInvTab();
    if (activeTab === 'panel')      body = renderPanelTab();

    return tabBar + body;
  }

  function rerender() {
    var area = document.getElementById('pj-modal-demo');
    if (area) area.innerHTML = renderTabs();
  }

  /* -------- HANDLERS GLOBALES -------- */
  window.dcTab = function(t) {
    activeTab = t;
    if (t === 'pedidos') ped_view = 'list';
    rerender();
  };

  /* cotizador */
  window.dcCotTipo = function(v) { cot_tipo = v; rerender(); };

  window.dcCotPrecio = function(cal) {
    var el = document.getElementById('dc-cot-precio');
    if (el) el.textContent = fmtMXN(precioKg(cal));
  };

  window.dcCotAgregar = function() {
    var matEl  = document.getElementById('dc-cot-mat');
    var calEl  = document.getElementById('dc-cot-cal');
    var anchoEl= document.getElementById('dc-cot-ancho');
    var kgEl   = document.getElementById('dc-cot-kg');
    var mat    = matEl ? matEl.value : 'Galvanizada';
    var cal    = calEl ? calEl.value : '26';
    var ancho  = anchoEl ? anchoEl.value : '1.22m';
    var kg     = parseInt(kgEl ? kgEl.value : '0') || 0;
    if (kg <= 0) return;
    cot_partidas.push({ tipo: cot_tipo, material: mat, calibre: cal, ancho: ancho, kg: kg, pxkg: precioKg(cal) });
    rerender();
  };

  window.dcCotAgregarServ = function() {
    var servEl = document.getElementById('dc-cot-serv');
    var impEl  = document.getElementById('dc-cot-imp');
    var desc   = servEl ? servEl.value.trim() : '';
    var imp    = parseFloat(impEl ? impEl.value : '0') || 0;
    if (!desc || imp <= 0) return;
    cot_partidas.push({ tipo: 'Servicio', material: desc, calibre: '-', ancho: '-', kg: 1, pxkg: imp });
    rerender();
  };

  window.dcCotEliminar = function(i) {
    cot_partidas.splice(i, 1);
    rerender();
  };

  window.dcCotPDF = function() { cot_pdf = true; rerender(); };
  window.dcCotBack = function() { cot_pdf = false; rerender(); };

  /* pedidos */
  window.dcPedDetalle = function(i) {
    ped_active = i; ped_view = 'detail'; rerender();
  };

  window.dcPedBack = function() { ped_view = 'list'; rerender(); };

  window.dcPedAvanzar = function(i) {
    if (ped_orders[i].stage < PED_STAGES.length - 1) ped_orders[i].stage++;
    rerender();
  };

  /* inventario */
  window.dcInvToggle = function(i) {
    inv_open = inv_open === i ? -1 : i;
    rerender();
  };

  window.dcInvGuardar = function(i) {
    var tipoEl = document.getElementById('dc-inv-tipo');
    var qtyEl  = document.getElementById('dc-inv-qty');
    var tipo   = tipoEl ? tipoEl.value : 'Entrada';
    var qty    = parseInt(qtyEl ? qtyEl.value : '0') || 0;
    if (qty <= 0) return;
    if (tipo === 'Entrada') {
      inv_items[i].kg += qty;
    } else {
      inv_items[i].kg = Math.max(0, inv_items[i].kg - qty);
    }
    var kg = inv_items[i].kg;
    inv_items[i].status = kg === 0 ? 'crit' : (kg < 200 ? 'bajo' : 'ok');
    inv_open = -1;
    rerender();
  };

  /* panel */
  window.dcPanelRefresh = function() {
    function rnd(v) { return Math.round(v * (0.90 + Math.random() * 0.20)); }
    panel_vals.ventas   = rnd(panel_base.ventas);
    panel_vals.activos  = rnd(panel_base.activos);
    panel_vals.ocs      = rnd(panel_base.ocs);
    panel_vals.alertas  = rnd(panel_base.alertas);
    rerender();
  };

  return renderTabs();
}

function buildDemoOnoffice() {
  /* ---- estado compartido ---- */
  var ooTab = 'pos';

  /* ---- POS ---- */
  var ooProducts = [
    { id:1, name:'Café Americano', cat:'Bebida',   price:45, stock:50 },
    { id:2, name:'Café Latte',     cat:'Bebida',   price:55, stock:42 },
    { id:3, name:'Agua 600ml',     cat:'Bebida',   price:18, stock:120 },
    { id:4, name:'Refresco 355ml', cat:'Bebida',   price:25, stock:85 },
    { id:5, name:'Sándwich Club',  cat:'Alimento', price:85, stock:15 },
    { id:6, name:'Galletas',       cat:'Alimento', price:32, stock:30 },
  ];
  var ooCart = [];
  var ooPay = false;
  var ooPayMethod = 'efectivo';
  var ooTicketDone = false;
  var ooLastTotal = 0;

  /* ---- Dashboard ---- */
  var ooDashBase = { ventas:3840, tickets:24, ganancia:1152, vendidos:87 };
  var ooDash = { ventas:3840, tickets:24, ganancia:1152, vendidos:87 };
  var ooBars = [2100, 3400, 2850, 4200, 3180, 3840, 800];

  /* ---- Inventario ---- */
  var ooInvFilter = '';
  var ooInv = [
    { id:1, name:'Café Americano', cat:'Bebida',   stock:50,  min:10, precio:45 },
    { id:2, name:'Café Latte',     cat:'Bebida',   stock:42,  min:10, precio:55 },
    { id:3, name:'Agua 600ml',     cat:'Bebida',   stock:120, min:24, precio:18 },
    { id:4, name:'Refresco 355ml', cat:'Bebida',   stock:85,  min:24, precio:25 },
    { id:5, name:'Sándwich Club',  cat:'Alimento', stock:8,   min:20, precio:85 },
    { id:6, name:'Galletas',       cat:'Alimento', stock:0,   min:15, precio:32 },
  ];

  /* ---- Clientes ---- */
  var ooClientes = [
    { id:1, name:'Roberto García', tipo:'Frecuente',   compras:47, total:12480, pendiente:0 },
    { id:2, name:'María López',    tipo:'Regular',     compras:12, total:3200,  pendiente:1 },
    { id:3, name:'Juan Pérez',     tipo:'Nuevo',       compras:2,  total:340,   pendiente:0 },
    { id:4, name:'Ana Torres',     tipo:'Frecuente',   compras:63, total:18900, pendiente:0 },
    { id:5, name:'Empresa XYZ',    tipo:'Corporativo', compras:8,  total:24500, pendiente:2 },
  ];
  var ooClienteIdx = -1;

  /* ---- helpers ---- */
  function fmtMXN(n) {
    return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  function cartQty(id) {
    var item = ooCart.find(function(x) { return x.id === id; });
    return item ? item.qty : 0;
  }
  function cartTotal() {
    return ooCart.reduce(function(s, x) { return s + x.price * x.qty; }, 0);
  }
  function rerender() {
    var area = document.getElementById('pj-modal-demo');
    if (area) area.innerHTML = renderMain();
  }

  /* ---- POS renders ---- */
  function renderTicketOk() {
    return '<div class="demo-wrap" style="align-items:center;justify-content:center;text-align:center;gap:12px;padding-top:32px">' +
      '<div style="font-size:40px;line-height:1">✓</div>' +
      '<div style="font-size:15px;font-weight:700;margin-top:4px">¡Cobro realizado!</div>' +
      '<div style="font-family:\'JetBrains Mono\',monospace;font-size:11px;color:#888;margin-top:2px">Ticket #0847 · ' + fmtMXN(ooLastTotal) + '</div>' +
      '<button class="demo-btn-sm" style="margin-top:12px" onclick="ooNuevaTxn()">+ Nueva venta</button>' +
    '</div>';
  }

  function renderPago() {
    var total = cartTotal();
    return '<div class="demo-wrap">' +
      '<button class="demo-back-btn" onclick="ooPayCancel()">← Carrito</button>' +
      '<p class="demo-title">COBRO</p>' +
      '<div style="display:flex;gap:6px;margin-bottom:12px">' +
        '<button class="demo-btn-sm" onclick="ooPayMeth(\'efectivo\')" style="flex:1' + (ooPayMethod === 'efectivo' ? ';background:#111;color:#fff' : '') + '">Efectivo</button>' +
        '<button class="demo-btn-sm" onclick="ooPayMeth(\'tarjeta\')"  style="flex:1' + (ooPayMethod === 'tarjeta'  ? ';background:#111;color:#fff' : '') + '">Tarjeta</button>' +
      '</div>' +
      '<div style="border:1px solid #e8e8e6;border-radius:10px;padding:14px;margin-bottom:12px">' +
        '<div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700;margin-bottom:10px">' +
          '<span>Total a cobrar</span><span style="font-family:\'JetBrains Mono\',monospace">' + fmtMXN(total) + '</span>' +
        '</div>' +
        (ooPayMethod === 'efectivo'
          ? '<div class="demo-field" style="margin-bottom:8px"><div class="demo-label">MONTO RECIBIDO</div><input class="demo-input" id="oo-efectivo" type="number" placeholder="0.00" oninput="ooCalcCambio()" style="font-size:14px;font-weight:600;text-align:right"></div>' +
            '<div style="display:flex;justify-content:space-between;font-size:12px"><span style="color:#888">Cambio</span><span id="oo-cambio" style="font-family:\'JetBrains Mono\',monospace;font-weight:600">$0.00</span></div>'
          : '<div style="padding:12px;background:#f7f7f6;border-radius:8px;text-align:center;font-size:11px;color:#888">Terminal lista · ' + fmtMXN(total) + '</div>'
        ) +
      '</div>' +
      '<button class="btn-primary" style="width:100%;font-size:12px;padding:10px" onclick="ooConfirmPago()">Confirmar cobro</button>' +
    '</div>';
  }

  function renderPOS() {
    if (ooTicketDone) return renderTicketOk();
    if (ooPay)        return renderPago();
    var total = cartTotal();
    return '<div class="demo-wrap">' +
      '<div style="display:flex;gap:10px">' +
        '<div style="flex:1;display:flex;flex-direction:column;gap:8px">' +
          '<div style="font-family:\'JetBrains Mono\',monospace;font-size:9px;color:#aaa;letter-spacing:.1em">PRODUCTOS</div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">' +
            ooProducts.map(function(p) {
              var qty = cartQty(p.id);
              return '<div style="padding:10px 9px;border:1px solid ' + (qty > 0 ? '#111' : '#e8e8e6') + ';border-radius:8px;cursor:pointer;background:' + (qty > 0 ? '#f7f7f6' : '#fff') + '" onclick="ooAddToCart(' + p.id + ')">' +
                '<div style="font-size:11px;font-weight:600;line-height:1.3">' + p.name + '</div>' +
                '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px">' +
                  '<span style="font-family:\'JetBrains Mono\',monospace;font-size:11px">' + fmtMXN(p.price) + '</span>' +
                  (qty > 0 ? '<span style="font-size:10px;font-weight:700">×' + qty + '</span>' : '') +
                '</div>' +
              '</div>';
            }).join('') +
          '</div>' +
        '</div>' +
        '<div style="width:130px;display:flex;flex-direction:column;gap:5px;border-left:1px solid #e8e8e6;padding-left:10px">' +
          '<div style="font-family:\'JetBrains Mono\',monospace;font-size:9px;color:#aaa;letter-spacing:.1em">CARRITO</div>' +
          (ooCart.length === 0
            ? '<div style="font-size:11px;color:#ccc;padding:14px 0;text-align:center">Vacío</div>'
            : ooCart.map(function(item, idx) {
                return '<div style="font-size:10px;display:flex;flex-direction:column;gap:2px;padding-bottom:5px;border-bottom:1px solid #f0f0ee">' +
                  '<div style="line-height:1.3;font-weight:500">' + item.name + '</div>' +
                  '<div style="display:flex;align-items:center;gap:4px">' +
                    '<button class="demo-btn-sm" style="padding:0 5px;font-size:12px;line-height:16px" onclick="ooCartQty(' + idx + ',-1)">−</button>' +
                    '<span style="font-family:\'JetBrains Mono\',monospace;font-size:10px;min-width:14px;text-align:center">' + item.qty + '</span>' +
                    '<button class="demo-btn-sm" style="padding:0 5px;font-size:12px;line-height:16px" onclick="ooCartQty(' + idx + ',1)">+</button>' +
                    '<span style="margin-left:auto;font-family:\'JetBrains Mono\',monospace;font-size:10px">' + fmtMXN(item.price * item.qty) + '</span>' +
                  '</div>' +
                '</div>';
              }).join('')
          ) +
          '<div style="margin-top:auto;padding-top:8px;border-top:1px solid #e8e8e6">' +
            '<div style="display:flex;justify-content:space-between;font-size:11px;font-weight:700;margin-bottom:8px"><span>Total</span><span style="font-family:\'JetBrains Mono\',monospace">' + fmtMXN(total) + '</span></div>' +
            '<button class="btn-primary" style="width:100%;font-size:11px;padding:8px;' + (ooCart.length === 0 ? 'opacity:.4;pointer-events:none' : '') + '" onclick="ooCobrar()">Cobrar</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /* ---- Dashboard render ---- */
  function renderDashboard() {
    var days = ['L','M','X','J','V','S','H'];
    var maxBar = Math.max.apply(null, ooBars);
    return '<div class="demo-wrap">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">' +
        '<div style="font-family:\'JetBrains Mono\',monospace;font-size:9px;color:#aaa">HOY · SUCURSAL PRINCIPAL</div>' +
        '<button class="demo-btn-sm" onclick="ooDashRefresh()">↻ Actualizar</button>' +
      '</div>' +
      '<div class="mock-kpi-row" style="margin-bottom:10px">' +
        '<div class="mock-kpi"><span class="mock-kpi-val" style="font-size:13px">' + fmtMXN(ooDash.ventas) + '</span><span class="mock-kpi-lbl">Ventas</span></div>' +
        '<div class="mock-kpi"><span class="mock-kpi-val" style="font-size:13px">' + ooDash.tickets + '</span><span class="mock-kpi-lbl">Tickets</span></div>' +
        '<div class="mock-kpi"><span class="mock-kpi-val" style="font-size:13px">' + fmtMXN(ooDash.ganancia) + '</span><span class="mock-kpi-lbl">Ganancia</span></div>' +
        '<div class="mock-kpi"><span class="mock-kpi-val" style="font-size:13px">' + ooDash.vendidos + '</span><span class="mock-kpi-lbl">Piezas</span></div>' +
      '</div>' +
      '<div style="font-family:\'JetBrains Mono\',monospace;font-size:9px;color:#aaa;margin-bottom:6px">VENTAS ÚLTIMOS 7 DÍAS</div>' +
      '<div class="mock-bar-chart">' +
        ooBars.map(function(v, i) {
          var pct = Math.round((v / maxBar) * 100);
          return '<div class="mock-bar-col"><div class="mock-bar-fill" style="height:' + pct + '%;background:' + (i === 6 ? '#111' : '#d4d4d4') + '"></div><span class="mock-bar-lbl">' + days[i] + '</span></div>';
        }).join('') +
      '</div>' +
      '<div style="font-family:\'JetBrains Mono\',monospace;font-size:9px;color:#aaa;margin:10px 0 6px">MÁS VENDIDOS HOY</div>' +
      '<div style="display:flex;flex-direction:column;gap:5px">' +
        [['Café Americano',32],['Agua 600ml',28],['Café Latte',18]].map(function(row, i) {
          var pct = Math.round((row[1] / 32) * 100);
          return '<div style="display:flex;align-items:center;gap:8px">' +
            '<div style="width:110px;font-size:11px;flex-shrink:0">' + (i + 1) + '. ' + row[0] + '</div>' +
            '<div style="flex:1;height:5px;background:#f0f0ee;border-radius:99px"><div style="height:5px;border-radius:99px;background:#111;width:' + pct + '%"></div></div>' +
            '<div style="font-family:\'JetBrains Mono\',monospace;font-size:10px;color:#888;width:24px;text-align:right">' + row[1] + '</div>' +
          '</div>';
        }).join('') +
      '</div>' +
    '</div>';
  }

  /* ---- Inventario render ---- */
  function renderInventario() {
    var list = ooInv.filter(function(p) {
      return !ooInvFilter || p.name.toLowerCase().indexOf(ooInvFilter.toLowerCase()) >= 0;
    });
    return '<div class="demo-wrap">' +
      '<input class="demo-input" placeholder="Buscar producto…" value="' + ooInvFilter + '" oninput="ooInvSearch(this.value)" style="margin-bottom:10px;padding:6px 10px;font-size:11px;width:100%">' +
      '<table class="demo-table">' +
        '<thead><tr><th>Producto</th><th>Cat.</th><th>Stock</th><th>Estado</th></tr></thead>' +
        '<tbody>' +
          list.map(function(p) {
            var s = p.stock === 0 ? 'crit' : (p.stock < p.min ? 'bajo' : 'ok');
            var bg  = s === 'crit' ? '#fee2e2' : (s === 'bajo' ? '#fef3c7' : '#d1fae5');
            var col = s === 'crit' ? '#991b1b' : (s === 'bajo' ? '#92400e' : '#065f46');
            var lbl = s === 'crit' ? 'Crítico' : (s === 'bajo' ? 'Bajo' : 'OK');
            return '<tr>' +
              '<td style="font-size:11px">' + p.name + '</td>' +
              '<td style="font-size:10px;color:#888">' + p.cat + '</td>' +
              '<td class="mock-mono">' + p.stock + '</td>' +
              '<td><span style="font-size:9px;padding:2px 6px;border-radius:99px;background:' + bg + ';color:' + col + '">' + lbl + '</span></td>' +
            '</tr>';
          }).join('') +
        '</tbody>' +
      '</table>' +
    '</div>';
  }

  /* ---- Clientes render ---- */
  function renderClientes() {
    if (ooClienteIdx >= 0) {
      var c = ooClientes[ooClienteIdx];
      var hist = [
        { folio:'T-0847', monto:450,  fecha:'Hoy 10:32' },
        { folio:'T-0831', monto:285,  fecha:'Ayer 14:15' },
        { folio:'T-0812', monto:620,  fecha:'26 Jun 9:40' },
      ];
      return '<div class="demo-wrap">' +
        '<button class="demo-back-btn" onclick="ooClienteBack()">← Clientes</button>' +
        '<div style="margin-bottom:12px">' +
          '<div style="font-size:15px;font-weight:700">' + c.name + '</div>' +
          '<div style="font-size:11px;color:#888">' + c.tipo + ' · ' + c.compras + ' compras</div>' +
        '</div>' +
        '<div class="mock-kpi-row" style="margin-bottom:12px">' +
          '<div class="mock-kpi"><span class="mock-kpi-val" style="font-size:13px">' + fmtMXN(c.total) + '</span><span class="mock-kpi-lbl">Histórico</span></div>' +
          '<div class="mock-kpi"><span class="mock-kpi-val" style="font-size:13px">' + c.pendiente + '</span><span class="mock-kpi-lbl">Pendientes</span></div>' +
        '</div>' +
        '<div style="font-family:\'JetBrains Mono\',monospace;font-size:9px;color:#aaa;margin-bottom:6px">ÚLTIMAS COMPRAS</div>' +
        '<table class="demo-table">' +
          '<thead><tr><th>Folio</th><th>Monto</th><th>Fecha</th></tr></thead>' +
          '<tbody>' +
            hist.map(function(h) {
              return '<tr><td class="mock-mono" style="font-size:10px">' + h.folio + '</td><td class="mock-mono">' + fmtMXN(h.monto) + '</td><td style="font-size:10px;color:#888">' + h.fecha + '</td></tr>';
            }).join('') +
          '</tbody>' +
        '</table>' +
      '</div>';
    }
    return '<div class="demo-wrap">' +
      '<div style="font-family:\'JetBrains Mono\',monospace;font-size:9px;color:#aaa;margin-bottom:8px">CLIENTES</div>' +
      '<div style="display:flex;flex-direction:column;gap:5px">' +
        ooClientes.map(function(c, i) {
          return '<div style="display:flex;align-items:center;gap:8px;padding:9px 10px;border:1px solid #e8e8e6;border-radius:8px;cursor:pointer" onclick="ooClienteVer(' + i + ')">' +
            '<div style="flex:1">' +
              '<div style="font-size:12px;font-weight:600">' + c.name + '</div>' +
              '<div style="font-size:10px;color:#888">' + c.tipo + ' · ' + c.compras + ' compras</div>' +
            '</div>' +
            '<div style="text-align:right">' +
              '<div style="font-family:\'JetBrains Mono\',monospace;font-size:11px">' + fmtMXN(c.total) + '</div>' +
              (c.pendiente > 0 ? '<div style="font-size:9px;color:#dc2626">' + c.pendiente + ' pendiente' + (c.pendiente > 1 ? 's' : '') + '</div>' : '') +
            '</div>' +
          '</div>';
        }).join('') +
      '</div>' +
    '</div>';
  }

  /* ---- tabs ---- */
  var ooTabsKeys   = ['pos','dashboard','inventario','clientes'];
  var ooTabsLabels = ['Punto de Venta','Dashboard','Inventario','Clientes'];

  function renderMain() {
    var tabBar = '<div class="demo-tabs">' +
      ooTabsKeys.map(function(t, i) {
        return '<button class="demo-tab' + (ooTab === t ? ' active' : '') + '" onclick="ooTab_(' + i + ')">' + ooTabsLabels[i] + '</button>';
      }).join('') +
    '</div>';
    var body = '';
    if (ooTab === 'pos')        body = renderPOS();
    if (ooTab === 'dashboard')  body = renderDashboard();
    if (ooTab === 'inventario') body = renderInventario();
    if (ooTab === 'clientes')   body = renderClientes();
    return tabBar + body;
  }

  /* ---- handlers globales ---- */
  window.ooTab_ = function(i) {
    ooTab = ooTabsKeys[i];
    if (ooTab === 'clientes') ooClienteIdx = -1;
    rerender();
  };

  window.ooAddToCart = function(id) {
    var item = ooCart.find(function(x) { return x.id === id; });
    if (item) {
      item.qty++;
    } else {
      var prod = ooProducts.find(function(p) { return p.id === id; });
      if (prod) ooCart.push({ id: prod.id, name: prod.name, price: prod.price, qty: 1 });
    }
    rerender();
  };

  window.ooCartQty = function(idx, delta) {
    ooCart[idx].qty += delta;
    if (ooCart[idx].qty <= 0) ooCart.splice(idx, 1);
    rerender();
  };

  window.ooCobrar    = function() { ooPay = true; rerender(); };
  window.ooPayCancel = function() { ooPay = false; rerender(); };
  window.ooPayMeth   = function(m) { ooPayMethod = m; rerender(); };

  window.ooCalcCambio = function() {
    var el = document.getElementById('oo-efectivo');
    var monto = parseFloat(el ? el.value : '0') || 0;
    var cambio = monto - cartTotal();
    var cel = document.getElementById('oo-cambio');
    if (cel) cel.textContent = fmtMXN(Math.max(0, cambio));
  };

  window.ooConfirmPago = function() {
    ooLastTotal = cartTotal();
    ooTicketDone = true;
    ooCart = [];
    ooPay  = false;
    ooDash.ventas += ooLastTotal;
    ooDash.tickets++;
    rerender();
  };

  window.ooNuevaTxn = function() { ooTicketDone = false; rerender(); };

  window.ooDashRefresh = function() {
    function rnd(v) { return Math.round(v * (0.92 + Math.random() * 0.16)); }
    ooDash.ventas   = rnd(ooDashBase.ventas);
    ooDash.tickets  = rnd(ooDashBase.tickets);
    ooDash.ganancia = rnd(ooDashBase.ganancia);
    ooDash.vendidos = rnd(ooDashBase.vendidos);
    rerender();
  };

  window.ooInvSearch  = function(v) { ooInvFilter = v; rerender(); };
  window.ooClienteVer = function(i) { ooClienteIdx = i; rerender(); };
  window.ooClienteBack = function() { ooClienteIdx = -1; rerender(); };

  return renderMain();
}

function buildDemoTailorp() {
  /* ---- estado ---- */
  var tpTab = 'prospectos';
  var tpDetalle = -1;
  var tpFiltroOp = '';

  var tpProspectos = [
    { id:1, nombre:'Carlos Méndez', tel:'664-123-4567', op:'Compra', estatus:'Calificado', presup:2400000, inm:['INM-001'], pend:[{id:1,txt:'Confirmar visita a INM-001',done:false},{id:2,txt:'Enviar fichas técnicas',done:false}] },
    { id:2, nombre:'Ana García',    tel:'664-987-6543', op:'Renta',  estatus:'Nuevo',       presup:8500,    inm:[],          pend:[{id:3,txt:'Llamar para calificar presupuesto',done:false}] },
    { id:3, nombre:'Roberto Silva', tel:'664-456-7890', op:'Venta',  estatus:'Seguimiento', presup:3800000, inm:['INM-003'], pend:[] },
    { id:4, nombre:'Laura Torres',  tel:'664-321-0987', op:'Compra', estatus:'Cerrado',     presup:1800000, inm:['INM-002'], pend:[] },
    { id:5, nombre:'Marcos Ríos',   tel:'664-555-0101', op:'Compra', estatus:'Calificado',  presup:3200000, inm:[],          pend:[{id:4,txt:'Agendar recorrido INM-004',done:false},{id:5,txt:'Validar documentación',done:false},{id:6,txt:'Enviar propuesta',done:false}] },
  ];

  var tpInmuebles = [
    { id:'INM-001', tipo:'Casa',   zona:'Las Palmas',     precio:2400000, op:'Venta', estatus:'Disponible' },
    { id:'INM-002', tipo:'Depto',  zona:'Centro',         precio:8500,    op:'Renta', estatus:'Disponible' },
    { id:'INM-003', tipo:'Casa',   zona:'Res. Norte',     precio:3800000, op:'Venta', estatus:'Vendido' },
    { id:'INM-004', tipo:'Local',  zona:'Zona Centro',    precio:15000,   op:'Renta', estatus:'Disponible' },
  ];

  var tpNextPend = 10;

  /* ---- helpers ---- */
  function fmtP(n, op) {
    if (op === 'Renta') return '$' + n.toLocaleString('es-MX') + '/mes';
    return '$' + (n / 1000000).toFixed(1) + 'M';
  }
  function statusBg(s) {
    if (s === 'Cerrado')     return 'background:#d1fae5;color:#065f46';
    if (s === 'Calificado')  return 'background:#eff6ff;color:#1e40af';
    if (s === 'Nuevo')       return 'background:#fef3c7;color:#92400e';
    return 'background:#f3f4f6;color:#374151';
  }
  function rerender() {
    var area = document.getElementById('pj-modal-demo');
    if (area) area.innerHTML = renderMain();
  }

  /* ---- Prospectos ---- */
  function renderProspectos() {
    var list = tpProspectos.filter(function(p) {
      return !tpFiltroOp || p.op === tpFiltroOp;
    });
    var formHtml = tpNuevoForm
      ? '<div style="border:1px solid #e8e8e6;border-radius:8px;padding:12px;margin-bottom:10px;display:flex;flex-direction:column;gap:8px">' +
          '<div style="font-family:\'JetBrains Mono\',monospace;font-size:9px;color:#aaa;margin-bottom:2px">NUEVO PROSPECTO</div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">' +
            '<input class="demo-input" id="tp-nuevo-nombre" placeholder="Nombre completo" style="padding:6px 9px;font-size:11px">' +
            '<input class="demo-input" id="tp-nuevo-tel" placeholder="Teléfono" style="padding:6px 9px;font-size:11px">' +
          '</div>' +
          '<select class="demo-input" id="tp-nuevo-op" style="padding:6px 9px;font-size:11px"><option>Compra</option><option>Renta</option><option>Venta</option></select>' +
          '<div style="display:flex;gap:6px">' +
            '<button class="btn-primary" style="font-size:11px;padding:7px 14px" onclick="tpNuevoGuardar()">Guardar</button>' +
            '<button class="demo-btn-sm" onclick="tpNuevoCancel()">Cancelar</button>' +
          '</div>' +
        '</div>'
      : '';
    return '<div class="demo-wrap">' +
      '<div style="display:flex;gap:5px;margin-bottom:10px;flex-wrap:wrap">' +
        ['','Compra','Renta','Venta'].map(function(op) {
          var lbl = op || 'Todos';
          var active = tpFiltroOp === op;
          return '<button class="demo-btn-sm" onclick="tpFiltro(\'' + op + '\')" style="' + (active ? 'background:#111;color:#fff;' : '') + 'padding:4px 10px;font-size:10px">' + lbl + '</button>';
        }).join('') +
        (tpNuevoForm ? '' : '<button class="demo-btn-sm" onclick="tpNuevo()" style="margin-left:auto;padding:4px 10px;font-size:10px">+ Prospecto</button>') +
      '</div>' +
      formHtml +
      '<div style="display:flex;flex-direction:column;gap:5px">' +
        list.map(function(p, i) {
          var pendAct = p.pend.filter(function(t) { return !t.done; }).length;
          return '<div style="display:flex;align-items:center;gap:8px;padding:9px 10px;border:1px solid #e8e8e6;border-radius:8px;cursor:pointer" onclick="tpVerDetalle(' + p.id + ')">' +
            '<div style="flex:1">' +
              '<div style="font-size:12px;font-weight:600">' + p.nombre + '</div>' +
              '<div style="font-size:10px;color:#888">' + p.tel + ' · ' + p.op + '</div>' +
            '</div>' +
            '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">' +
              '<span style="font-size:9px;padding:2px 7px;border-radius:99px;' + statusBg(p.estatus) + '">' + p.estatus + '</span>' +
              (pendAct > 0 ? '<span style="font-size:9px;color:#dc2626">' + pendAct + ' pendiente' + (pendAct > 1 ? 's' : '') + '</span>' : '') +
            '</div>' +
          '</div>';
        }).join('') +
      '</div>' +
    '</div>';
  }

  function renderDetalle(id) {
    var p = tpProspectos.find(function(x) { return x.id === id; });
    if (!p) return renderProspectos();
    var pendAct = p.pend.filter(function(t) { return !t.done; }).length;
    return '<div class="demo-wrap">' +
      '<button class="demo-back-btn" onclick="tpBackLista()">← Prospectos</button>' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">' +
        '<div>' +
          '<div style="font-size:15px;font-weight:700">' + p.nombre + '</div>' +
          '<div style="font-size:11px;color:#888">' + p.tel + '</div>' +
        '</div>' +
        '<select class="demo-input" style="width:auto;padding:5px 8px;font-size:10px" onchange="tpCambiarEstatus(' + p.id + ',this.value)">' +
          ['Nuevo','Calificado','Seguimiento','Cerrado'].map(function(s) {
            return '<option value="' + s + '"' + (s === p.estatus ? ' selected' : '') + '>' + s + '</option>';
          }).join('') +
        '</select>' +
      '</div>' +
      '<div class="mock-kpi-row" style="margin-bottom:12px">' +
        '<div class="mock-kpi"><span class="mock-kpi-val" style="font-size:12px">' + p.op + '</span><span class="mock-kpi-lbl">Operación</span></div>' +
        '<div class="mock-kpi"><span class="mock-kpi-val" style="font-size:12px">' + fmtP(p.presup, p.op) + '</span><span class="mock-kpi-lbl">Presupuesto</span></div>' +
        '<div class="mock-kpi"><span class="mock-kpi-val" style="font-size:12px">' + pendAct + '</span><span class="mock-kpi-lbl">Pendientes</span></div>' +
      '</div>' +
      (p.inm.length > 0
        ? '<div style="font-family:\'JetBrains Mono\',monospace;font-size:9px;color:#aaa;margin-bottom:5px">INMUEBLES DE INTERÉS</div>' +
          '<div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:12px">' +
            p.inm.map(function(id) {
              return '<span style="font-size:10px;padding:3px 9px;border-radius:99px;background:#f0f0ee;font-family:\'JetBrains Mono\',monospace">' + id + '</span>';
            }).join('') +
          '</div>'
        : ''
      ) +
      '<div style="font-family:\'JetBrains Mono\',monospace;font-size:9px;color:#aaa;margin-bottom:6px">PENDIENTES</div>' +
      '<div style="display:flex;flex-direction:column;gap:4px;margin-bottom:10px">' +
        (p.pend.length === 0
          ? '<div style="font-size:11px;color:#ccc;padding:8px 0">Sin pendientes</div>'
          : p.pend.map(function(t) {
              return '<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid #f0f0ee">' +
                '<div style="width:14px;height:14px;border:1.5px solid ' + (t.done ? '#16a34a' : '#ccc') + ';border-radius:3px;flex-shrink:0;background:' + (t.done ? '#d1fae5' : 'transparent') + ';cursor:pointer;display:flex;align-items:center;justify-content:center" onclick="tpTogglePend(' + p.id + ',' + t.id + ')">' +
                  (t.done ? '<span style="font-size:9px;color:#16a34a">✓</span>' : '') +
                '</div>' +
                '<span style="font-size:11px;' + (t.done ? 'text-decoration:line-through;color:#aaa' : '') + '">' + t.txt + '</span>' +
              '</div>';
            }).join('')
        ) +
      '</div>' +
      '<div style="display:flex;gap:6px">' +
        '<input class="demo-input" id="tp-nuevo-pend" placeholder="Agregar pendiente…" style="flex:1;padding:6px 10px;font-size:11px">' +
        '<button class="demo-btn-sm" onclick="tpAgregarPend(' + p.id + ')">+ Agregar</button>' +
      '</div>' +
    '</div>';
  }

  /* ---- Inmuebles ---- */
  function renderInmuebles() {
    return '<div class="demo-wrap">' +
      '<div style="font-family:\'JetBrains Mono\',monospace;font-size:9px;color:#aaa;margin-bottom:8px">CARTERA DE INMUEBLES</div>' +
      '<div style="display:flex;flex-direction:column;gap:6px">' +
        tpInmuebles.map(function(inm) {
          var disp = inm.estatus === 'Disponible';
          return '<div style="padding:10px 12px;border:1px solid ' + (disp ? '#e8e8e6' : '#f0f0ee') + ';border-radius:8px;display:flex;align-items:center;gap:10px;' + (disp ? '' : 'opacity:.6') + '">' +
            '<div style="font-family:\'JetBrains Mono\',monospace;font-size:9px;color:#aaa;min-width:52px">' + inm.id + '</div>' +
            '<div style="flex:1">' +
              '<div style="font-size:12px;font-weight:600">' + inm.tipo + ' · ' + inm.zona + '</div>' +
              '<div style="font-size:10px;color:#888">' + inm.op + '</div>' +
            '</div>' +
            '<div style="text-align:right">' +
              '<div style="font-family:\'JetBrains Mono\',monospace;font-size:11px;font-weight:600">' + fmtP(inm.precio, inm.op) + '</div>' +
              '<span style="font-size:9px;padding:2px 7px;border-radius:99px;background:' + (disp ? '#d1fae5' : '#e5e7eb') + ';color:' + (disp ? '#065f46' : '#6b7280') + '">' + inm.estatus + '</span>' +
            '</div>' +
          '</div>';
        }).join('') +
      '</div>' +
    '</div>';
  }

  /* ---- Dashboard ---- */
  function renderDashboard() {
    var activos = tpProspectos.filter(function(p) { return p.estatus !== 'Cerrado'; }).length;
    var cerrados = tpProspectos.filter(function(p) { return p.estatus === 'Cerrado'; }).length;
    var pendTotal = tpProspectos.reduce(function(s, p) { return s + p.pend.filter(function(t) { return !t.done; }).length; }, 0);
    var disponibles = tpInmuebles.filter(function(i) { return i.estatus === 'Disponible'; }).length;
    var portafolio = tpInmuebles.filter(function(i) { return i.estatus === 'Disponible'; }).reduce(function(s, i) { return s + (i.op === 'Venta' ? i.precio : 0); }, 0);
    return '<div class="demo-wrap">' +
      '<div style="font-family:\'JetBrains Mono\',monospace;font-size:9px;color:#aaa;margin-bottom:10px">RESUMEN OPERATIVO</div>' +
      '<div class="mock-kpi-row" style="margin-bottom:10px">' +
        '<div class="mock-kpi"><span class="mock-kpi-val" style="font-size:15px">' + activos + '</span><span class="mock-kpi-lbl">Prospectos activos</span></div>' +
        '<div class="mock-kpi"><span class="mock-kpi-val" style="font-size:15px">' + cerrados + '</span><span class="mock-kpi-lbl">Cierres</span></div>' +
        '<div class="mock-kpi"><span class="mock-kpi-val" style="font-size:15px">' + pendTotal + '</span><span class="mock-kpi-lbl">Pendientes hoy</span></div>' +
        '<div class="mock-kpi"><span class="mock-kpi-val" style="font-size:15px">' + disponibles + '</span><span class="mock-kpi-lbl">Inmuebles disp.</span></div>' +
      '</div>' +
      '<div style="font-family:\'JetBrains Mono\',monospace;font-size:9px;color:#aaa;margin-bottom:6px">PROSPECTOS POR OPERACIÓN</div>' +
      '<div style="display:flex;flex-direction:column;gap:5px;margin-bottom:12px">' +
        ['Compra','Renta','Venta'].map(function(op) {
          var cnt = tpProspectos.filter(function(p) { return p.op === op; }).length;
          var pct = Math.round((cnt / tpProspectos.length) * 100);
          return '<div style="display:flex;align-items:center;gap:8px">' +
            '<div style="width:48px;font-size:11px;flex-shrink:0">' + op + '</div>' +
            '<div style="flex:1;height:5px;background:#f0f0ee;border-radius:99px"><div style="height:5px;border-radius:99px;background:#111;width:' + pct + '%"></div></div>' +
            '<div style="font-family:\'JetBrains Mono\',monospace;font-size:10px;color:#888;width:18px;text-align:right">' + cnt + '</div>' +
          '</div>';
        }).join('') +
      '</div>' +
      '<div style="padding:10px 14px;background:#f7f7f6;border-radius:8px;display:flex;justify-content:space-between;align-items:center">' +
        '<div style="font-size:11px;color:#555">Portafolio activo en venta</div>' +
        '<div style="font-family:\'JetBrains Mono\',monospace;font-size:13px;font-weight:700">$' + (portafolio / 1000000).toFixed(1) + 'M</div>' +
      '</div>' +
    '</div>';
  }

  /* ---- Tabs ---- */
  var tpTabsKeys   = ['prospectos','inmuebles','dashboard'];
  var tpTabsLabels = ['Prospectos','Inmuebles','Dashboard'];

  function renderMain() {
    var tabBar = '<div class="demo-tabs">' +
      tpTabsKeys.map(function(t, i) {
        return '<button class="demo-tab' + (tpTab === t ? ' active' : '') + '" onclick="tpTab_(' + i + ')">' + tpTabsLabels[i] + '</button>';
      }).join('') +
    '</div>';
    var body = '';
    if (tpTab === 'prospectos') body = tpDetalle >= 0 ? renderDetalle(tpDetalle) : renderProspectos();
    if (tpTab === 'inmuebles')  body = renderInmuebles();
    if (tpTab === 'dashboard')  body = renderDashboard();
    return tabBar + body;
  }

  /* ---- handlers globales ---- */
  window.tpTab_ = function(i) {
    tpTab = tpTabsKeys[i];
    tpDetalle = -1;
    rerender();
  };

  window.tpFiltro = function(op) { tpFiltroOp = op; rerender(); };

  window.tpVerDetalle = function(id) { tpDetalle = id; rerender(); };
  window.tpBackLista  = function()   { tpDetalle = -1; rerender(); };

  window.tpCambiarEstatus = function(id, s) {
    var p = tpProspectos.find(function(x) { return x.id === id; });
    if (p) p.estatus = s;
  };

  window.tpTogglePend = function(pid, tid) {
    var p = tpProspectos.find(function(x) { return x.id === pid; });
    if (!p) return;
    var t = p.pend.find(function(x) { return x.id === tid; });
    if (t) t.done = !t.done;
    rerender();
  };

  window.tpAgregarPend = function(pid) {
    var el = document.getElementById('tp-nuevo-pend');
    var txt = el ? el.value.trim() : '';
    if (!txt) return;
    var p = tpProspectos.find(function(x) { return x.id === pid; });
    if (p) p.pend.push({ id: tpNextPend++, txt: txt, done: false });
    rerender();
  };

  var tpNuevoForm = false;

  window.tpNuevo = function() { tpNuevoForm = true; rerender(); };

  window.tpNuevoCancel = function() { tpNuevoForm = false; rerender(); };

  window.tpNuevoGuardar = function() {
    var nEl = document.getElementById('tp-nuevo-nombre');
    var tEl = document.getElementById('tp-nuevo-tel');
    var oEl = document.getElementById('tp-nuevo-op');
    var nombre = nEl ? nEl.value.trim() : '';
    var tel    = tEl ? tEl.value.trim() : '—';
    var op     = oEl ? oEl.value : 'Compra';
    if (!nombre) return;
    tpProspectos.unshift({ id: tpNextPend++, nombre: nombre, tel: tel || '—', op: op, estatus: 'Nuevo', presup: 0, inm: [], pend: [] });
    tpNuevoForm = false;
    rerender();
  };

  return renderMain();
}

/* ---- placeholder para CATALOG (ya no se usa buildDemoCotizador) ---- */
function buildDemoCotizador_UNUSED() {
  const CATALOG = [
    { name:'Mesa ejecutiva',      price:4500, unit:'PZA' },
    { name:'Silla ergonómica',    price:2800, unit:'PZA' },
    { name:'Librero modular',     price:6200, unit:'PZA' },
    { name:'Archivero 4 cajones', price:3100, unit:'PZA' },
    { name:'Panel divisorio',     price:1800, unit:'M2'  },
    { name:'Servicio instalación',price:1200, unit:'HRS' },
  ];

  let client   = '';
  let discount = 0;
  let items    = [{ ...CATALOG[0], qty: 2 }];
  let view     = 'form';

  function sub()   { return items.reduce((s,it) => s + it.qty * it.price, 0); }
  function disc()  { return sub() * (discount / 100); }
  function iva()   { return (sub() - disc()) * 0.16; }
  function total() { return sub() - disc() + iva(); }
  function fmt(n)  { return '$' + n.toLocaleString('es-MX', { minimumFractionDigits:2, maximumFractionDigits:2 }); }

  function renderForm() {
    return `<div class="demo-wrap">
      <p class="demo-title" style="margin-bottom:8px">COTIZADOR EN LÍNEA</p>
      <div class="demo-form">
        <div class="demo-row">
          <div class="demo-field" style="flex:2">
            <div class="demo-label">CLIENTE</div>
            <input class="demo-input" id="demo-cot-client" placeholder="Nombre del cliente" value="${client}">
          </div>
          <div class="demo-field" style="flex:.9">
            <div class="demo-label">DESCUENTO %</div>
            <input class="demo-input" id="demo-cot-disc" type="number" min="0" max="100" value="${discount}" placeholder="0">
          </div>
        </div>
        <div class="demo-row">
          <div class="demo-field" style="flex:2">
            <div class="demo-label">PRODUCTO DEL CATÁLOGO</div>
            <select class="demo-input" id="demo-cot-sel">
              <option value="">— Seleccionar —</option>
              ${CATALOG.map((p,i) => `<option value="${i}">${p.name} · ${p.unit} · ${fmt(p.price)}</option>`).join('')}
            </select>
          </div>
          <div class="demo-field" style="flex:.6">
            <div class="demo-label">CANT.</div>
            <input class="demo-input" id="demo-cot-qty" type="number" min="1" value="1">
          </div>
          <button class="demo-btn-sm" onclick="demoCotAdd()" style="flex-shrink:0;align-self:flex-end">+ Agregar</button>
        </div>
      </div>
      <table class="demo-table" style="margin-top:8px">
        <thead><tr><th>Producto</th><th>U.</th><th>Cant.</th><th>P.Unit.</th><th>Total</th><th></th></tr></thead>
        <tbody>
          ${items.map((it, i) => `<tr>
            <td>${it.name}</td>
            <td class="mock-mono" style="font-size:10px;color:#aaa">${it.unit||'PZA'}</td>
            <td class="mock-mono">${it.qty}</td>
            <td class="mock-mono">${fmt(it.price)}</td>
            <td class="mock-mono">${fmt(it.qty * it.price)}</td>
            <td><button class="demo-btn-sm" onclick="demoCotRemove(${i})" style="padding:3px 8px;font-size:10px">✕</button></td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div class="demo-total-row" style="margin-top:6px">
        <span class="demo-total-lbl">SUBTOTAL</span>
        <span class="demo-total-val" style="font-size:14px">${fmt(sub())}</span>
      </div>
      ${discount > 0 ? `<div class="demo-total-row" style="border-top:none;padding-top:2px">
        <span class="demo-total-lbl" style="color:#dc2626">DESCUENTO ${discount}%</span>
        <span class="demo-total-val" style="font-size:13px;color:#dc2626">-${fmt(disc())}</span>
      </div>` : ''}
      <div class="demo-total-row" style="border-top:none;padding-top:2px">
        <span class="demo-total-lbl">IVA 16%</span>
        <span class="demo-total-val" style="font-size:13px;color:#888">${fmt(iva())}</span>
      </div>
      <div class="demo-total-row">
        <span class="demo-total-lbl" style="color:#111;font-weight:600">TOTAL</span>
        <span class="demo-total-val" style="font-size:20px">${fmt(total())}</span>
      </div>
      <div style="display:flex;gap:8px;margin-top:10px">
        <button class="btn-primary" style="font-size:12px;padding:10px 20px" onclick="demoCotPreview()">Vista previa PDF</button>
        <button class="demo-btn-sm" onclick="demoCotClear()">Limpiar</button>
      </div>
    </div>`;
  }

  function renderPreview() {
    const today   = new Date();
    const expires = new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000);
    const fmtD    = d => d.toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' });
    const cotNum  = 'COT-2026-' + String(130 + items.length + (discount > 0 ? 5 : 0)).padStart(4, '0');
    return `<div class="demo-wrap">
      <button class="demo-back-btn" onclick="demoCotBack()">← Editar cotización</button>
      <div style="border:1px solid #e8e8e6;border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:10px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div style="font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:600;letter-spacing:.08em">PROJECTER</div>
          <div style="text-align:right">
            <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#aaa">${cotNum}</div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#aaa">${fmtD(today)}</div>
          </div>
        </div>
        <div style="height:1px;background:#f0f0ee"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:11px">
          <div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#aaa;margin-bottom:2px">CLIENTE</div>
            <div style="font-weight:600">${client || 'Sin especificar'}</div>
          </div>
          <div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#aaa;margin-bottom:2px">VÁLIDA HASTA</div>
            <div style="font-family:'JetBrains Mono',monospace">${fmtD(expires)}</div>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:10px">
          <thead><tr style="border-bottom:1px solid #f0f0ee">
            ${['Descripción','U.','Cant.','P.Unit.','Importe'].map(h => `<th style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#aaa;padding:4px 0;text-align:left">${h}</th>`).join('')}
          </tr></thead>
          <tbody>
            ${items.map(it => `<tr style="border-bottom:1px solid #f7f7f6">
              ${[it.name, it.unit||'PZA', it.qty, fmt(it.price), fmt(it.qty*it.price)].map(v => `<td style="padding:5px 0;font-family:'JetBrains Mono',monospace">${v}</td>`).join('')}
            </tr>`).join('')}
          </tbody>
        </table>
        <div style="text-align:right;display:flex;flex-direction:column;gap:3px">
          ${discount > 0 ? `<div style="font-size:10px;color:#dc2626;font-family:'JetBrains Mono',monospace">Descuento ${discount}%: -${fmt(disc())}</div>` : ''}
          <div style="font-size:10px;color:#888;font-family:'JetBrains Mono',monospace">IVA 16%: ${fmt(iva())}</div>
          <div style="font-size:16px;font-weight:700;font-family:'JetBrains Mono',monospace">TOTAL: ${fmt(total())}</div>
        </div>
      </div>
      <button class="btn-primary" style="margin-top:10px;font-size:12px;padding:10px 16px" onclick="demoCotDownload()">↓ Ver nota sobre PDF</button>
    </div>`;
  }

  window.demoCotAdd = function() {
    const sel = document.getElementById('demo-cot-sel');
    const qty = parseInt(document.getElementById('demo-cot-qty')?.value) || 1;
    client   = document.getElementById('demo-cot-client')?.value || '';
    discount = parseInt(document.getElementById('demo-cot-disc')?.value) || 0;
    if (!sel || sel.value === '') return;
    items.push({ ...CATALOG[parseInt(sel.value)], qty });
    const area = document.getElementById('pj-modal-demo');
    if (area) area.innerHTML = renderForm();
  };

  window.demoCotRemove = function(i) {
    client   = document.getElementById('demo-cot-client')?.value || '';
    discount = parseInt(document.getElementById('demo-cot-disc')?.value) || 0;
    items.splice(i, 1);
    const area = document.getElementById('pj-modal-demo');
    if (area) area.innerHTML = renderForm();
  };

  window.demoCotPreview = function() {
    client   = document.getElementById('demo-cot-client')?.value || '';
    discount = parseInt(document.getElementById('demo-cot-disc')?.value) || 0;
    if (items.length === 0) return;
    view = 'preview';
    const area = document.getElementById('pj-modal-demo');
    if (area) area.innerHTML = renderPreview();
  };

  window.demoCotBack = function() {
    view = 'form';
    const area = document.getElementById('pj-modal-demo');
    if (area) area.innerHTML = renderForm();
  };

  window.demoCotClear = function() {
    items = []; client = ''; discount = 0;
    const area = document.getElementById('pj-modal-demo');
    if (area) area.innerHTML = renderForm();
  };

  window.demoCotDownload = function() {
    const area = document.getElementById('pj-modal-demo');
    if (!area) return;
    const msg = area.querySelector('.demo-pdf-note');
    if (msg) return;
    const note = document.createElement('div');
    note.className = 'demo-pdf-note';
    note.style.cssText = 'margin-top:10px;padding:10px 14px;background:#f7f7f6;border-radius:8px;font-size:11px;color:#555;border:1px solid #e8e8e6;line-height:1.5';
    note.innerHTML = 'En el sistema real el PDF se genera y descarga automáticamente con logo, datos fiscales del cliente y folio correlativo.';
    area.querySelector('.demo-wrap').appendChild(note);
  };

  return renderForm();
}

function buildDemoDashboard() {
  const BASE = [
    { val:347200, label:'Ventas del mes',  fmt:n=>'$'+Math.round(n/1000)+'k', id:'kv', trend:+8.4 },
    { val:23,     label:'Pedidos activos', fmt:n=>String(n),                  id:'kp', trend:+2   },
    { val:14,     label:'Clientes nuevos', fmt:n=>String(n),                  id:'kc', trend:+5   },
    { val:68,     label:'Conversión %',    fmt:n=>n+'%',                      id:'kt', trend:-1.2 },
  ];
  const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun'];
  let kpis      = BASE.map(k => ({ ...k }));
  let monthData = [210, 285, 190, 310, 250, 347];

  const ACTIVITY = [
    { msg:'Pedido #0045 avanzó a "Listo para entrega"',      time:'hace 8 min'    },
    { msg:'Cliente Constructora PE — cotización aceptada',    time:'hace 22 min'   },
    { msg:'Stock crítico: Tornillo M8 — 12 uds restantes',   time:'hace 35 min'   },
    { msg:'Nueva cotización COT-2026-0135 generada',          time:'hace 1h'       },
    { msg:'Marco Vidal avanzó a etapa "Propuesta"',           time:'hace 1h 40min' },
    { msg:'Pedido #0043 asignado a producción',               time:'hace 2h'       },
  ];

  function animCount(id, target, fmtFn) {
    const el = document.getElementById(id);
    if (!el) return;
    let s = 0; const step = target / 20;
    const iv = setInterval(() => {
      s = Math.min(s + step, target);
      el.textContent = fmtFn(Math.round(s));
      if (s >= target) clearInterval(iv);
    }, 40);
  }

  function trendBadge(t) {
    const up = t >= 0;
    return `<span style="font-size:10px;font-family:'JetBrains Mono',monospace;color:${up?'#065f46':'#dc2626'};margin-top:2px">${up?'↑':'↓'} ${Math.abs(t).toFixed(1)}%</span>`;
  }

  function render() {
    const maxM = Math.max(...monthData);
    return `<div class="demo-wrap">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <p class="demo-title" style="margin:0">PANEL EJECUTIVO</p>
        <button class="demo-btn-sm" onclick="demoDashRefresh()">↻ Actualizar</button>
      </div>
      <div class="demo-kpis">
        ${kpis.map(k => `<div class="demo-kpi">
          <div class="demo-kpi-val" id="${k.id}">${k.fmt(k.val)}</div>
          <div class="demo-kpi-lbl">${k.label}</div>
          ${trendBadge(k.trend)}
        </div>`).join('')}
      </div>
      <div style="margin-top:10px;border:1px solid #ececeb;border-radius:8px;padding:10px 12px">
        <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#aaa;margin-bottom:8px">VENTAS ÚLTIMOS 6 MESES (miles MXN)</div>
        <div class="mock-bar-chart" style="height:60px">
          ${monthData.map((v, i) => `<div class="mock-bar-col">
            <div class="mock-bar-fill" style="height:${Math.round(v/maxM*100)}%"></div>
            <span class="mock-bar-lbl">${MONTHS[i]}</span>
          </div>`).join('')}
        </div>
        <div style="display:flex;justify-content:space-between;font-family:'JetBrains Mono',monospace;font-size:9px;color:#aaa;margin-top:4px">
          <span>vs mes anterior</span>
          <span style="color:${kpis[0].trend>=0?'#065f46':'#dc2626'}">${kpis[0].trend>=0?'↑':'↓'} ${Math.abs(kpis[0].trend).toFixed(1)}%</span>
        </div>
      </div>
      <div style="margin-top:8px">
        <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#aaa;margin-bottom:4px">ACTIVIDAD RECIENTE</div>
        <div class="demo-activity">
          ${ACTIVITY.slice(0,4).map(a => `<div class="demo-activity-item">
            <div class="demo-activity-msg">${a.msg}</div>
            <div class="demo-activity-time">${a.time}</div>
          </div>`).join('')}
        </div>
      </div>
    </div>`;
  }

  window.demoDashRefresh = function() {
    kpis.forEach((k, i) => {
      k.val   = Math.round(BASE[i].val * (0.82 + Math.random() * 0.36));
      k.trend = parseFloat((-5 + Math.random() * 15).toFixed(1));
    });
    monthData = monthData.map(v => Math.max(80, Math.round(v * (0.85 + Math.random() * 0.32))));
    const area = document.getElementById('pj-modal-demo');
    if (area) {
      area.innerHTML = render();
      kpis.forEach(k => animCount(k.id, k.val, k.fmt));
    }
  };

  const html = render();
  setTimeout(() => kpis.forEach(k => animCount(k.id, k.val, k.fmt)), 80);
  return html;
}

function buildDemoAgenda() {
  const DAYS = ['Lun','Mar','Mié','Jue','Vie'];
  const HOY  = 2; // Miércoles como "hoy" en la demo

  let events = [
    { day:0, hour:'10:00', name:'García Muebles',   type:'visita',   desc:'Presentación de propuesta'  },
    { day:1, hour:'11:00', name:'Torres & Asoc.',    type:'llamada',  desc:'Seguimiento cotización'      },
    { day:2, hour:'09:00', name:'Equipo interno',    type:'tarea',    desc:'Revisión de inventario'      },
    { day:2, hour:'12:00', name:'Constructora PE',   type:'visita',   desc:'Firma de contrato'           },
    { day:3, hour:'10:00', name:'Grupo Vidal',       type:'llamada',  desc:'Demo del sistema'            },
    { day:4, hour:'15:00', name:'Almacenes Durán',   type:'visita',   desc:'Diagnóstico inicial'         },
  ];

  let activeTab = HOY;
  let showForm  = false;

  function typePill(t) {
    const bg  = t==='visita'?'#f0fdf4':t==='tarea'?'#fef3c7':'#eff6ff';
    const col = t==='visita'?'#166534':t==='tarea'?'#92400e':'#1e40af';
    return `<span style="font-family:'JetBrains Mono',monospace;font-size:9px;padding:2px 7px;border-radius:99px;background:${bg};color:${col};flex-shrink:0">${t}</span>`;
  }

  function renderDay(dayIdx) {
    const evs = events
      .filter(e => dayIdx < 0 ? true : e.day === dayIdx)
      .sort((a, b) => a.hour.localeCompare(b.hour));
    if (evs.length === 0) {
      return `<div style="text-align:center;padding:24px 0;color:#bbb;font-size:12px">Sin citas agendadas</div>`;
    }
    return evs.map(ev => `<div class="demo-event-item">
      <div class="demo-event-time">${ev.hour}</div>
      <div class="demo-event-body">
        <div class="demo-event-name">${ev.name}</div>
        <div class="demo-event-sub">${ev.desc}</div>
      </div>
      ${typePill(ev.type)}
    </div>`).join('');
  }

  function renderForm() {
    return `<div class="demo-entry-panel">
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#888;margin-bottom:6px">NUEVA CITA</div>
      <div class="demo-row">
        <div class="demo-field" style="flex:2">
          <div class="demo-label">NOMBRE / EMPRESA</div>
          <input class="demo-input" id="demo-ag-name" placeholder="Cliente o tema">
        </div>
        <div class="demo-field" style="flex:.8">
          <div class="demo-label">HORA</div>
          <select class="demo-input" id="demo-ag-hour">
            ${['08:00','09:00','10:00','11:00','12:00','13:00','15:00','16:00','17:00'].map(h => `<option value="${h}"${h==='10:00'?' selected':''}>${h}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="demo-row">
        <div class="demo-field">
          <div class="demo-label">DÍA</div>
          <select class="demo-input" id="demo-ag-day">
            ${DAYS.map((d, i) => `<option value="${i}"${i===activeTab?' selected':''}>${d}${i===HOY?' (hoy)':''}</option>`).join('')}
          </select>
        </div>
        <div class="demo-field">
          <div class="demo-label">TIPO</div>
          <select class="demo-input" id="demo-ag-type">
            <option value="llamada">Llamada</option>
            <option value="visita">Visita</option>
            <option value="tarea">Tarea</option>
          </select>
        </div>
      </div>
      <div class="demo-field">
        <div class="demo-label">DESCRIPCIÓN (OPCIONAL)</div>
        <input class="demo-input" id="demo-ag-desc" placeholder="Ej: Presentar propuesta comercial">
      </div>
      <div class="demo-row" style="gap:8px">
        <button class="btn-primary" style="font-size:12px;padding:8px 16px" onclick="demoAgendaSave()">Guardar cita</button>
        <button class="demo-btn-sm" onclick="demoAgendaCancelForm()">Cancelar</button>
      </div>
    </div>`;
  }

  function render() {
    return `<div class="demo-wrap">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <p class="demo-title" style="margin:0">AGENDA SEMANAL</p>
        <button class="demo-btn-sm" onclick="demoAgendaShowForm()">+ Nueva cita</button>
      </div>
      <div class="demo-tabs">
        ${DAYS.map((d, i) => `<button class="demo-tab${i===activeTab?' active':''}" onclick="demoAgendaTab(${i})">${d}${i===HOY?'·':''}</button>`).join('')}
        <button class="demo-tab${activeTab===-1?' active':''}" onclick="demoAgendaTab(-1)" style="margin-left:auto">Todos</button>
      </div>
      <div class="demo-events">${renderDay(activeTab)}</div>
      ${showForm ? renderForm() : ''}
    </div>`;
  }

  window.demoAgendaTab = function(i) {
    activeTab = i; showForm = false;
    const area = document.getElementById('pj-modal-demo');
    if (area) area.innerHTML = render();
  };

  window.demoAgendaShowForm = function() {
    showForm = true;
    const area = document.getElementById('pj-modal-demo');
    if (area) area.innerHTML = render();
    document.getElementById('demo-ag-name')?.focus();
  };

  window.demoAgendaCancelForm = function() {
    showForm = false;
    const area = document.getElementById('pj-modal-demo');
    if (area) area.innerHTML = render();
  };

  window.demoAgendaSave = function() {
    const name = document.getElementById('demo-ag-name')?.value.trim();
    const hour = document.getElementById('demo-ag-hour')?.value || '10:00';
    const day  = parseInt(document.getElementById('demo-ag-day')?.value || String(HOY));
    const type = document.getElementById('demo-ag-type')?.value || 'llamada';
    const desc = document.getElementById('demo-ag-desc')?.value.trim() || '';
    if (!name) return;
    events.push({ day, hour, name, type, desc });
    showForm = false; activeTab = day;
    const area = document.getElementById('pj-modal-demo');
    if (area) area.innerHTML = render();
  };

  return render();
}

function buildDemoInventario() {
  let products = [
    { id:1, name:'Tornillo M8',   cat:'Fijación',  stock:12,  min:50,  moves:[{type:'out',qty:35,date:'25 Jun'},{type:'in',qty:100,date:'20 Jun'},{type:'out',qty:50,date:'18 Jun'}] },
    { id:2, name:'Plancha 3mm',   cat:'Acero',     stock:80,  min:40,  moves:[{type:'in',qty:80,date:'22 Jun'},{type:'out',qty:20,date:'15 Jun'}] },
    { id:3, name:'Pintura base',  cat:'Acabados',  stock:28,  min:30,  moves:[{type:'out',qty:10,date:'24 Jun'},{type:'in',qty:30,date:'10 Jun'}] },
    { id:4, name:'Remache pop',   cat:'Fijación',  stock:340, min:100, moves:[{type:'in',qty:500,date:'18 Jun'},{type:'out',qty:60,date:'12 Jun'}] },
    { id:5, name:'Sellador PU',   cat:'Acabados',  stock:5,   min:20,  moves:[{type:'out',qty:15,date:'23 Jun'}] },
  ];

  let view          = 'list';
  let detailId      = -1;
  let filter        = '';
  let entryOpen     = false;
  let entryTargetId = -1;

  function stClass(p) { return p.stock <= 0 ? 'crit' : p.stock < p.min * 0.3 ? 'crit' : p.stock < p.min ? 'low' : 'ok'; }
  function stLabel(p) { return p.stock <= 0 ? 'Sin stock' : p.stock < p.min * 0.3 ? 'Crítico' : p.stock < p.min ? 'Bajo' : 'OK'; }
  function barColor(p) { const c = stClass(p); return c==='ok'?'#111':c==='low'?'#f59e0b':'#dc2626'; }
  function barPct(p)   { return Math.min(100, Math.round(p.stock / Math.max(p.min, 1) * 100)); }

  function entryPanel(id) {
    const p = products.find(x => x.id === id);
    if (!p) return '';
    return `<div class="demo-entry-panel">
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#888;margin-bottom:6px">REGISTRAR ENTRADA · ${p.name.toUpperCase()}</div>
      <div class="demo-row">
        <div class="demo-field">
          <div class="demo-label">CANTIDAD</div>
          <input class="demo-input" id="demo-inv-qty" type="number" min="1" placeholder="0">
        </div>
        <div class="demo-field" style="flex:2">
          <div class="demo-label">NOTA (OPCIONAL)</div>
          <input class="demo-input" id="demo-inv-note" placeholder="Ej: Compra a proveedor">
        </div>
      </div>
      <div class="demo-row" style="gap:8px">
        <button class="btn-primary" style="font-size:12px;padding:8px 16px" onclick="demoInvEntry(${id})">Registrar</button>
        <button class="demo-btn-sm" onclick="demoInvEntryClose()">Cancelar</button>
      </div>
    </div>`;
  }

  function renderList() {
    const list = products.filter(p => !filter || p.name.toLowerCase().includes(filter.toLowerCase()));
    return `<div class="demo-wrap">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <p class="demo-title" style="margin:0">INVENTARIO</p>
        <input class="demo-input" id="demo-inv-search" placeholder="Buscar…" value="${filter}" oninput="demoInvFilter(this.value)" style="width:110px">
      </div>
      <table class="demo-stock-table">
        <thead><tr><th>Producto</th><th>Stock / Mín.</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          ${list.map(p => `<tr>
            <td>
              <div style="font-weight:600;font-size:11px">${p.name}</div>
              <div style="font-size:9px;color:#bbb;font-family:'JetBrains Mono',monospace">${p.cat}</div>
            </td>
            <td>
              <div class="mock-mono" style="font-size:11px">${p.stock}<span style="color:#bbb"> / ${p.min}</span></div>
              <div class="demo-stock-bar-wrap">
                <div class="demo-stock-bar-fill" style="width:${barPct(p)}%;background:${barColor(p)}"></div>
              </div>
            </td>
            <td><span class="demo-badge ${stClass(p)}">${stLabel(p)}</span></td>
            <td style="white-space:nowrap">
              <button class="demo-btn-sm" onclick="demoInvDetail(${p.id})" style="margin-right:4px">Ver</button>
              <button class="demo-btn-sm" onclick="demoInvEntryOpen(${p.id})">+ Entrada</button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
      ${entryOpen && entryTargetId > 0 ? entryPanel(entryTargetId) : ''}
    </div>`;
  }

  function renderDetail(id) {
    const p = products.find(x => x.id === id);
    if (!p) return renderList();
    return `<div class="demo-wrap">
      <button class="demo-back-btn" onclick="demoInvBack()">← Inventario</button>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div>
          <div style="font-size:16px;font-weight:700">${p.name}</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#aaa">${p.cat}</div>
        </div>
        <span class="demo-badge ${stClass(p)}" style="font-size:11px;padding:5px 12px">${stLabel(p)}</span>
      </div>
      <div class="demo-kpis" style="margin-bottom:14px">
        <div class="demo-kpi">
          <div class="demo-kpi-val" style="${p.stock<p.min?'color:#dc2626':''}">${p.stock}</div>
          <div class="demo-kpi-lbl">Stock actual</div>
        </div>
        <div class="demo-kpi">
          <div class="demo-kpi-val">${p.min}</div>
          <div class="demo-kpi-lbl">Stock mínimo</div>
        </div>
      </div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#aaa;margin-bottom:6px">MOVIMIENTOS RECIENTES</div>
      <div style="display:flex;flex-direction:column">
        ${p.moves.map(m => `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f7f7f6">
          <div style="width:26px;height:26px;border-radius:50%;background:${m.type==='in'?'#d1fae5':'#f7f7f6'};display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0">${m.type==='in'?'↑':'↓'}</div>
          <div style="flex:1;font-size:11px;font-weight:600;color:${m.type==='in'?'#065f46':'#555'}">${m.type==='in'?'Entrada':'Salida'} ${m.qty} uds</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#bbb">${m.date}</div>
        </div>`).join('')}
      </div>
      <button class="demo-btn-sm" style="margin-top:12px" onclick="demoInvDetailEntry(${p.id})">+ Registrar entrada</button>
      ${entryOpen && entryTargetId === p.id ? entryPanel(p.id) : ''}
    </div>`;
  }

  window.demoInvFilter = function(v) {
    filter = v; entryOpen = false;
    const area = document.getElementById('pj-modal-demo');
    if (area) area.innerHTML = renderList();
  };

  window.demoInvDetail = function(id) {
    detailId = id; view = 'detail'; entryOpen = false;
    const area = document.getElementById('pj-modal-demo');
    if (area) area.innerHTML = renderDetail(id);
  };

  window.demoInvBack = function() {
    view = 'list'; entryOpen = false;
    const area = document.getElementById('pj-modal-demo');
    if (area) area.innerHTML = renderList();
  };

  window.demoInvEntryOpen = function(id) {
    entryOpen = true; entryTargetId = id;
    const area = document.getElementById('pj-modal-demo');
    if (area) area.innerHTML = renderList();
    setTimeout(() => document.getElementById('demo-inv-qty')?.focus(), 50);
  };

  window.demoInvDetailEntry = function(id) {
    entryOpen = true; entryTargetId = id;
    const area = document.getElementById('pj-modal-demo');
    if (area) area.innerHTML = renderDetail(id);
    setTimeout(() => document.getElementById('demo-inv-qty')?.focus(), 50);
  };

  window.demoInvEntryClose = function() {
    entryOpen = false;
    const area = document.getElementById('pj-modal-demo');
    if (area) area.innerHTML = view === 'detail' ? renderDetail(detailId) : renderList();
  };

  window.demoInvEntry = function(id) {
    const qty  = parseInt(document.getElementById('demo-inv-qty')?.value || '0');
    const note = document.getElementById('demo-inv-note')?.value.trim() || 'Entrada de stock';
    if (!qty || qty <= 0) return;
    const p = products.find(x => x.id === id);
    if (!p) return;
    p.stock += qty;
    p.moves.unshift({ type:'in', qty, date:'Hoy', note });
    entryOpen = false;
    const area = document.getElementById('pj-modal-demo');
    if (area) area.innerHTML = view === 'detail' ? renderDetail(id) : renderList();
  };

  return renderList();
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
