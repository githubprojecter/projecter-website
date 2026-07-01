/* ============================================================
   /api/save-metadata — Guarda el mapeo pregunta→url de audio de una sesión
   Receives: { sessionId, meta }
   Returns:  { ok: true }
   ============================================================ */

const { put } = require('@vercel/blob');
const { getDateFolder } = require('./_lib/blobPath');

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { sessionId, meta } = req.body || {};
  if (!sessionId || !meta) {
    return res.status(400).json({ error: 'sessionId y meta son requeridos' });
  }

  const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
  if (!BLOB_TOKEN) return res.status(500).json({ error: 'Blob storage no configurado' });

  const path = `Diagnostico/${getDateFolder()}/${sessionId}/metadata.json`;

  try {
    await put(path, JSON.stringify(meta, null, 2), {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
      token: BLOB_TOKEN,
    });
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('save-metadata error:', e);
    return res.status(500).json({ error: 'Error guardando metadata' });
  }
}

module.exports = handler;
module.exports.config = { maxDuration: 15 };
