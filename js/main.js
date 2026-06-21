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

/* ===== CANVAS / AUDIO ===== */

let canvas = null;
let ctx2d  = null;
let t0     = performance.now();
let level  = 0.12;
let transStart = 0;
let transP     = 0;

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
  SCREENS.intro.classList.toggle('hidden', phase !== 'intro');
  SCREENS.voice.classList.toggle('hidden', !voiceActive);
  SCREENS.final.classList.toggle('hidden', phase !== 'final');
  SCREENS.landing.classList.toggle('hidden', phase !== 'landing');

  // Barra de progreso
  $('progress-bar').classList.toggle('hidden', !voiceActive);

  // Footer
  const showFooter = phase === 'intro' || phase === 'final' || phase === 'landing';
  $('footer').classList.toggle('hidden', !showFooter);

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
    <div class="card-preview" style="aspect-ratio:${ratio}">
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
  return div;
}

function renderFinal() {
  const container = $('final-projects');
  container.innerHTML = '';
  $('final-project-count').textContent = `[ ${PROJECTS.length} ]`;
  PROJECTS.forEach(p => container.appendChild(createProjectCard(p, '16/9')));
}

function renderLanding() {
  // Servicios
  const svc = $('landing-services');
  svc.innerHTML = '';
  SERVICES.forEach(s => {
    const div = document.createElement('div');
    div.className = 'service-card';
    div.innerHTML = `
      <span class="service-n">${s.n}</span>
      <h3 class="service-title">${s.title}</h3>
      <p class="service-desc">${s.desc}</p>
    `;
    svc.appendChild(div);
  });

  // Proyectos
  const proj = $('landing-projects');
  proj.innerHTML = '';
  $('landing-project-count').textContent = `[ ${PROJECTS.length} ]`;
  PROJECTS.forEach(p => proj.appendChild(createProjectCard(p, '16/10')));
}

/* ===== CANVAS · LOOP PRINCIPAL ===== */

function rafLoop() {
  requestAnimationFrame(rafLoop);

  if (!canvas) return;
  if (!ctx2d) ctx2d = canvas.getContext('2d');

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cw  = canvas.clientWidth;
  const ch  = canvas.clientHeight;
  if (!cw || !ch) return;

  if (canvas.width  !== Math.round(cw * dpr) ||
      canvas.height !== Math.round(ch * dpr)) {
    canvas.width  = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
  }

  const w = canvas.width;
  const h = canvas.height;
  ctx2d.setTransform(1, 0, 0, 1, 0, 0);
  ctx2d.clearRect(0, 0, w, h);

  const now     = performance.now();
  const elapsed = now - t0;
  const phase   = state.phase;

  // Nivel de energía para el blob
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

  // Círculo de transición
  if (phase === 'transition') {
    ctx2d.beginPath();
    ctx2d.arc(cx, cy, R * 0.6 + transP * Math.min(w, h) * 0.95, 0, Math.PI * 2);
    ctx2d.strokeStyle = hexToRgba(accent, 0.28 * (1 - transP));
    ctx2d.lineWidth   = 2 * dpr;
    ctx2d.stroke();
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

/* ===== INICIALIZACIÓN ===== */

document.addEventListener('DOMContentLoaded', () => {
  canvas = $('blob-canvas');

  // Detectar primera visita
  let isFirstVisit = true;
  try { isFirstVisit = !localStorage.getItem('pj_visited'); } catch (_) {}
  const target = isFirstVisit ? 'intro' : 'landing';
  if (isFirstVisit) {
    try { localStorage.setItem('pj_visited', '1'); } catch (_) {}
  }

  // Pre-renderizar contenido estático
  renderLanding();

  // Iniciar loop de canvas
  rafLoop();

  // Render inicial (la pantalla de carga cubre todo)
  state.phase = 'loading';
  // Mostrar la pantalla destino debajo del overlay de carga
  SCREENS.intro.classList.toggle('hidden', target !== 'intro');
  SCREENS.landing.classList.toggle('hidden', target !== 'landing');
  $('footer').classList.add('hidden');
  $('progress-bar').classList.add('hidden');

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

  // Landing: todos los botones "Iniciar diagnóstico"
  document.querySelectorAll('.btn-goto-intro').forEach(btn => {
    btn.addEventListener('click', gotoIntro);
  });

  // Voz
  $('btn-record').addEventListener('click', startRecording);
  $('btn-stop').addEventListener('click', stopAndAdvance);
});
