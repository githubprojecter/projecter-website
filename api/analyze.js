/* ============================================================
   /api/analyze — Transcribe audios with Whisper + analyze with GPT
   Receives: { urls: string[], sessionId: string }
   Returns:  { analysis: object, transcriptions: string[] }
   ============================================================ */

const { put, list } = require('@vercel/blob');

const QUESTIONS = [
  'Si pudieras escuchar a tu negocio, menciona el proceso que le duele más en este momento.',
  'Menciona el número exacto de procesos que integran tu negocio.',
  'Menciona el proceso repetitivo que les urge eliminar a tus colaboradores.',
  'Menciona un proceso que, cada vez que lo haces, te dices: "esto no lo debería estar haciendo yo".',
  'Si hoy tuvieras un asistente que monitorea toda la trazabilidad de tu negocio y te proporciona información para tomar decisiones, ¿cuánto pagarías por él?',
];

const CATEGORIES = [
  'Compras',
  'Ventas',
  'Gastos y finanzas',
  'Documentación y trámites',
  'Logística y entregas',
  'Manufactura y producción',
  'Atención a clientes',
  'Recursos humanos',
  'Infraestructura y tecnología',
  'Otro',
];

const SYSTEM_PROMPT = `Eres un consultor experto en diagnóstico de procesos para PyMEs mexicanas. Analizas respuestas de voz de empresarios y produces un diagnóstico estructurado basado en estadísticas mexicanas verificadas.

ESTADÍSTICAS MEXICANAS VERIFICADAS (usa solo estas cifras — no inventes números):

DIGITALIZACIÓN Y SISTEMAS:
- 76% de empresas mexicanas no cuentan con software de gestión (INEGI, Censo Económico 2019)
- 78% de las PyMEs mexicanas no tienen procesos digitales integrados (AMITI, 2022)
- Solo 23% de las empresas en México usan algún sistema de administración digital (AMITI, 2023)

FRACASOS EMPRESARIALES:
- 80% de PyMEs en México cierran antes de cumplir 5 años (Secretaría de Economía, 2023)
- 67% de los fracasos empresariales se atribuyen a problemas administrativos y de gestión (IMSS/SIEM, 2022)
- 70% de los negocios fracasan en los primeros 5 años (INEGI/CCE)

EFICIENCIA OPERATIVA:
- 43% del tiempo en PyMEs se dedica a tareas manuales repetitivas (AMITI, 2023)
- 85% de empresas sin automatización tienen errores operativos frecuentes (Secretaría de Economía, 2023)
- Solo 15% de las PyMEs tienen procesos formalmente documentados (IMSS, 2022)

SEGUIMIENTO Y VENTAS:
- 65% de empresas mexicanas pierden ventas por falta de seguimiento sistematizado (AMITI, 2022)
- 48% de negocios tienen cuellos de botella por dependencia de una persona clave (INADEM, 2021)
- 72% de los empresarios no pueden delegar porque no existe proceso documentado (Secretaría de Economía, 2022)

Devuelve EXCLUSIVAMENTE un JSON válido con esta estructura exacta (sin texto adicional, sin markdown):
{
  "main_stat": {
    "percentage": <número entero tomado de las estadísticas de arriba — entre 60 y 85>,
    "description": "<frase corta que complete: 'de empresas mexicanas que [problema principal detectado en el diagnóstico]'>",
    "source": "<fuente exacta de esa estadística>"
  },
  "errors": [
    {
      "number": "01",
      "title": "<título del problema detectado, máximo 5 palabras, específico no genérico>",
      "description": "<una oración que describa lo que el empresario mencionó sobre este problema>",
      "stat_percentage": <número entero de las estadísticas de arriba>,
      "stat_text": "<'de empresas mexicanas [comparten este mismo problema]'>",
      "stat_source": "<fuente exacta>"
    }
  ],
  "recommendation": "<una oración directa y específica sobre qué tipo de solución necesita este negocio>",
  "classifications": [
    { "question": <número de pregunta, 1 a ${QUESTIONS.length}>, "category": "<una categoría EXACTA de la lista de categorías>" }
  ]
}

CATEGORÍAS VÁLIDAS (usa el texto exacto, una por pregunta, la que mejor describa el tema de esa respuesta):
${CATEGORIES.map(c => `- ${c}`).join('\n')}

REGLAS OBLIGATORIAS:
- Detecta entre 3 y 5 errores (ni más, ni menos)
- Cada error debe estar basado en algo que el empresario mencionó explícitamente en sus respuestas
- Usa solo los porcentajes de las estadísticas listadas arriba, no inventes cifras
- Los títulos deben ser específicos ("Seguimiento manual de clientes", no "Falta de tecnología")
- La descripción de cada error debe referenciar algo concreto que dijo el usuario
- El tono es profesional y directo
- No menciones "PROJECTER" en el análisis
- "classifications" debe tener EXACTAMENTE una entrada por cada una de las ${QUESTIONS.length} preguntas, con "category" tomada literalmente de la lista de categorías válidas (usa "Otro" si ninguna aplica)`;

async function readStatsFile(questionNum, token) {
  const path = `Diagnostico/stats/q${questionNum}.json`;
  try {
    const { blobs } = await list({ prefix: path, token, limit: 1 });
    const match = blobs.find((b) => b.pathname === path);
    if (!match) return { categories: {}, total: 0 };
    const res = await fetch(match.url);
    if (!res.ok) return { categories: {}, total: 0 };
    return await res.json();
  } catch {
    return { categories: {}, total: 0 };
  }
}

async function writeStatsFile(questionNum, data, token) {
  const path = `Diagnostico/stats/q${questionNum}.json`;
  await put(path, JSON.stringify(data), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    token,
  });
}

// Registra la clasificación de cada respuesta en los contadores globales por pregunta
// y devuelve, para cada pregunta, el desglose de categorías actualizado con esta respuesta incluida.
async function updateAndGetStats(classifications, blobToken) {
  const stats = [];
  for (let i = 0; i < QUESTIONS.length; i++) {
    const qNum  = i + 1;
    const found = classifications.find((c) => c.question === qNum);
    const category = CATEGORIES.includes(found?.category) ? found.category : 'Otro';

    const data = await readStatsFile(qNum, blobToken);
    data.categories = data.categories || {};
    data.categories[category] = (data.categories[category] || 0) + 1;
    data.total = (data.total || 0) + 1;
    await writeStatsFile(qNum, data, blobToken);

    const breakdown = Object.entries(data.categories)
      .map(([cat, count]) => ({ category: cat, percentage: Math.round((count / data.total) * 100) }))
      .sort((a, b) => b.percentage - a.percentage);

    stats.push({
      question: qNum,
      category,
      percentage: Math.round((data.categories[category] / data.total) * 100),
      totalResponses: data.total,
      breakdown,
    });
  }
  return stats;
}

async function transcribeAudio(url, index, apiKey) {
  if (!url) return `[Sin respuesta para pregunta ${index + 1}]`;

  let audioBuffer;
  try {
    const audioRes = await fetch(url);
    if (!audioRes.ok) return `[Audio no disponible — pregunta ${index + 1}]`;
    audioBuffer = await audioRes.arrayBuffer();
  } catch {
    return `[Error descargando audio — pregunta ${index + 1}]`;
  }

  try {
    const formData = new FormData();
    formData.append(
      'file',
      new Blob([audioBuffer], { type: 'audio/webm' }),
      `q${index + 1}.webm`
    );
    formData.append('model', 'whisper-1');
    formData.append('language', 'es');

    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    });

    if (!whisperRes.ok) {
      const err = await whisperRes.json().catch(() => ({}));
      console.error(`Whisper error q${index + 1}:`, err);
      return `[Error en transcripción — pregunta ${index + 1}]`;
    }

    const data = await whisperRes.json();
    return data.text || `[Sin contenido — pregunta ${index + 1}]`;
  } catch (e) {
    console.error(`Transcription exception q${index + 1}:`, e);
    return `[Error procesando pregunta ${index + 1}]`;
  }
}

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { urls, sessionId } = req.body || {};

  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ error: 'urls[] requeridos' });
  }

  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_KEY) {
    return res.status(500).json({ error: 'API key no configurada' });
  }

  // Transcribe all audios — 3 at a time to respect rate limits
  const transcriptions = new Array(urls.length).fill('');
  for (let i = 0; i < urls.length; i += 3) {
    const batch = urls.slice(i, i + 3);
    const results = await Promise.all(
      batch.map((url, j) => transcribeAudio(url, i + j, OPENAI_KEY))
    );
    results.forEach((text, j) => { transcriptions[i + j] = text; });
  }

  // Build prompt
  const questionsAndAnswers = QUESTIONS.map((q, i) =>
    `PREGUNTA ${i + 1}: ${q}\nRESPUESTA: ${transcriptions[i]}`
  ).join('\n\n---\n\n');

  let analysis;
  try {
    const gptRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Analiza este diagnóstico empresarial y produce el JSON estructurado:\n\n${questionsAndAnswers}`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      }),
    });

    if (!gptRes.ok) {
      const err = await gptRes.json().catch(() => ({}));
      console.error('GPT error:', err);
      return res.status(500).json({ error: 'Error en análisis GPT', detail: err });
    }

    const gptData = await gptRes.json();
    analysis = JSON.parse(gptData.choices[0].message.content);
  } catch (e) {
    console.error('GPT exception:', e);
    return res.status(500).json({ error: 'Error procesando análisis', detail: e.message });
  }

  // Clasificar respuestas en categorías fijas y actualizar la estadística global comparativa.
  // Si falta el token de Blob, se omite sin bloquear el resto del análisis.
  const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
  let stats = [];
  if (BLOB_TOKEN) {
    try {
      const classifications = Array.isArray(analysis.classifications) ? analysis.classifications : [];
      stats = await updateAndGetStats(classifications, BLOB_TOKEN);
    } catch (e) {
      console.error('Stats update error:', e);
    }
  }

  return res.status(200).json({ analysis, transcriptions, stats });
}

module.exports = handler;
module.exports.config = { maxDuration: 120 };
