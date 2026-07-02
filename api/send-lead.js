/* ============================================================
   /api/send-lead — Save lead and email PDF to david@projecter.mx
   Receives: { name, whatsapp, contactPreference, sessionId, analysis, pdfBase64 }
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

  const { name, whatsapp, contactPreference, sessionId, analysis, pdfBase64 } = req.body || {};

  if (!name || !whatsapp || !contactPreference) {
    return res.status(400).json({ error: 'name, whatsapp y contactPreference son requeridos' });
  }

  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_KEY) {
    return res.status(500).json({ error: 'Email service no configurado' });
  }

  // Build errors HTML for email body
  const errorsHtml = (analysis?.errors || [])
    .map(
      (e) =>
        `<tr>
          <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;font-weight:600;font-size:13px;color:#111;vertical-align:top">${e.number} · ${e.title}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#444;vertical-align:top">${e.description}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;font-size:11px;color:#888;vertical-align:top;white-space:nowrap">${e.stat_percentage}% · ${e.stat_source}</td>
        </tr>`
    )
    .join('');

  const mainStatHtml = analysis?.main_stat
    ? `<div style="background:#111;color:#f5f5f0;padding:20px 24px;border-radius:8px;margin-bottom:24px">
        <span style="font-size:48px;font-weight:700;font-family:monospace">${analysis.main_stat.percentage}%</span>
        <p style="margin:8px 0 0;font-size:14px;opacity:.8">${analysis.main_stat.description}</p>
        <p style="margin:4px 0 0;font-size:11px;opacity:.5">${analysis.main_stat.source}</p>
      </div>`
    : '';

  const emailHtml = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:'Space Grotesk',Arial,sans-serif">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e8e8e6">

    <!-- Header -->
    <div style="padding:24px;border-bottom:1px solid #f0f0f0">
      <p style="margin:0;font-size:11px;letter-spacing:.1em;color:#888;font-family:monospace">DIAGNÓSTICO DE PROCESOS · PROJECTER</p>
      <h1 style="margin:8px 0 0;font-size:20px;color:#111">Nuevo lead — ${name}</h1>
    </div>

    <!-- Lead info -->
    <div style="padding:20px 24px;background:#fafaf8;border-bottom:1px solid #f0f0f0">
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="padding:6px 0;font-size:11px;color:#888;font-family:monospace;width:100px">NOMBRE</td>
          <td style="padding:6px 0;font-size:14px;color:#111;font-weight:600">${name}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:11px;color:#888;font-family:monospace">WHATSAPP</td>
          <td style="padding:6px 0;font-size:14px;color:#111;font-weight:600">${whatsapp}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:11px;color:#888;font-family:monospace">CONTACTO</td>
          <td style="padding:6px 0;font-size:14px;color:#111;font-weight:600">${contactPreference}</td>
        </tr>
        ${sessionId ? `<tr><td style="padding:6px 0;font-size:11px;color:#888;font-family:monospace">SESIÓN</td><td style="padding:6px 0;font-size:11px;color:#888;font-family:monospace">${sessionId}</td></tr>` : ''}
        <tr>
          <td style="padding:6px 0;font-size:11px;color:#888;font-family:monospace">FECHA</td>
          <td style="padding:6px 0;font-size:13px;color:#111">${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
        </tr>
      </table>
    </div>

    <!-- Analysis -->
    <div style="padding:24px">
      <p style="margin:0 0 16px;font-size:11px;letter-spacing:.1em;color:#888;font-family:monospace">RESULTADO DEL DIAGNÓSTICO</p>
      ${mainStatHtml}

      ${errorsHtml ? `
      <p style="margin:0 0 12px;font-size:11px;letter-spacing:.1em;color:#888;font-family:monospace">PUNTOS CRÍTICOS DETECTADOS</p>
      <table style="width:100%;border-collapse:collapse">
        ${errorsHtml}
      </table>` : ''}

      ${analysis?.recommendation ? `
      <div style="margin-top:20px;padding:16px;background:#f5f5f0;border-radius:8px">
        <p style="margin:0 0 4px;font-size:11px;letter-spacing:.1em;color:#888;font-family:monospace">RECOMENDACIÓN</p>
        <p style="margin:0;font-size:13px;color:#111;line-height:1.6">${analysis.recommendation}</p>
      </div>` : ''}
    </div>

    <!-- Footer -->
    <div style="padding:16px 24px;border-top:1px solid #f0f0f0;background:#fafaf8">
      <p style="margin:0;font-size:11px;color:#aaa;font-family:monospace">PROJECTER · david@projecter.mx · projecter.mx</p>
    </div>
  </div>
</body>
</html>`;

  // Build attachments array
  const attachments = [];
  if (pdfBase64) {
    attachments.push({
      filename: `diagnostico-projecter-${name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}.pdf`,
      content: pdfBase64,
    });
  }

  // Send email via Resend
  let emailOk = false;
  try {
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Diagnóstico Projecter <diagnostico@projecter.io>',
        to: ['david@projecter.mx'],
        subject: `Lead diagnóstico: ${name} · ${whatsapp}`,
        html: emailHtml,
        ...(attachments.length > 0 && { attachments }),
      }),
    });

    if (!emailRes.ok) {
      const err = await emailRes.json().catch(() => ({}));
      console.error('Resend error:', err);
    } else {
      emailOk = true;
    }
  } catch (e) {
    console.error('Email exception:', e);
  }

  // Also persist lead in Vercel Blob regardless of email result
  const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
  if (BLOB_TOKEN && sessionId) {
    try {
      const leadData = {
        name,
        whatsapp,
        contactPreference,
        sessionId,
        timestamp: new Date().toISOString(),
        analysis: analysis || null,
      };
      const path = `Diagnostico/${getDateFolder()}/${sessionId}/lead.json`;
      await put(path, JSON.stringify(leadData, null, 2), {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json',
        token: BLOB_TOKEN,
      });
    } catch {
      // Silent — don't block the response
    }
  }

  if (!emailOk) {
    return res.status(500).json({ error: 'Error enviando email' });
  }

  return res.status(200).json({ ok: true });
}

module.exports = handler;
module.exports.config = { maxDuration: 30 };
