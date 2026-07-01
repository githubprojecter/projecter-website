/* ============================================================
   /api/upload-audio — Sube el audio de una respuesta a Vercel Blob
   Query params: sessionId, question (1-6)
   Body: audio binario crudo (Content-Type: audio/webm | audio/ogg | audio/mp4)
   Returns: { url }
   ============================================================ */

const { put } = require('@vercel/blob');
const { getDateFolder } = require('./_lib/blobPath');

// Vercel solo auto-parsea req.body para JSON/urlencoded/text; para audio/* el
// stream llega intacto y hay que leerlo a mano — no cambiar a req.body aquí.
function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function extFromContentType(contentType) {
  if (!contentType) return 'webm';
  if (contentType.includes('ogg')) return 'ogg';
  if (contentType.includes('mp4')) return 'mp4';
  return 'webm';
}

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { sessionId, question } = req.query || {};
  const questionNumber = parseInt(question, 10);

  if (!sessionId || !questionNumber || questionNumber < 1) {
    return res.status(400).json({ error: 'sessionId y question son requeridos' });
  }

  const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
  if (!BLOB_TOKEN) {
    return res.status(500).json({ error: 'Blob storage no configurado' });
  }

  let audioBuffer;
  try {
    audioBuffer = await readRawBody(req);
  } catch (e) {
    return res.status(400).json({ error: 'Error leyendo el audio' });
  }

  if (!audioBuffer || audioBuffer.length === 0) {
    return res.status(400).json({ error: 'Audio vacío' });
  }

  const contentType = req.headers['content-type'] || 'audio/webm';
  const ext          = extFromContentType(contentType);
  const dateFolder   = getDateFolder();
  const path         = `Diagnostico/${dateFolder}/${sessionId}/${questionNumber}/respuesta.${ext}`;

  try {
    const blob = await put(path, audioBuffer, {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType,
      token: BLOB_TOKEN,
    });
    return res.status(200).json({ url: blob.url });
  } catch (e) {
    console.error('Blob upload error:', e);
    return res.status(500).json({ error: 'Error subiendo audio' });
  }
}

module.exports = handler;
module.exports.config = { maxDuration: 30 };
