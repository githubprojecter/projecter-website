/* ============================================================
   Helpers compartidos para construir rutas de Vercel Blob
   ============================================================ */

const MESES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// Fecha en zona horaria de Ciudad de México, formato DD-NombreMes-AAAA (ej. 01-Julio-2026)
function getDateFolder(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Mexico_City',
    day: '2-digit',
    month: 'numeric',
    year: 'numeric',
  }).formatToParts(date);

  const day   = parts.find(p => p.type === 'day').value;
  const month = parseInt(parts.find(p => p.type === 'month').value, 10);
  const year  = parts.find(p => p.type === 'year').value;

  return `${day}-${MESES_ES[month - 1]}-${year}`;
}

module.exports = { getDateFolder, MESES_ES };
