/* ============================================================
   /api/analyze — Transcribe audios with Whisper + analyze with GPT
   Receives: { urls: string[], sessionId: string }
   Returns:  { analysis: object, transcriptions: string[] }
   ============================================================ */

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
  "recommendation": "<una oración directa y específica sobre qué tipo de solución necesita este negocio>"
}

REGLAS OBLIGATORIAS:
- Detecta entre 3 y 5 errores (ni más, ni menos)
- Cada error debe estar basado en algo que el empresario mencionó explícitamente en sus respuestas
- Usa solo los porcentajes de las estadísticas listadas arriba, no inventes cifras
- Los títulos deben ser específicos ("Seguimiento manual de clientes", no "Falta de tecnología")
- La descripción de cada error debe referenciar algo concreto que dijo el usuario
- El tono es profesional y directo
- No menciones "PROJECTER" en el análisis`;

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

  return res.status(200).json({ analysis, transcriptions });
}

module.exports = handler;
module.exports.config = { maxDuration: 120 };
