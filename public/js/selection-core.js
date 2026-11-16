export const MINIMUM_ORDER = 24;

export function selectionTotal(selection = {}) {
  return Object.values(selection).reduce((sum, quantity) => sum + Math.max(0, Number(quantity) || 0), 0);
}

export function minimumMet(selection = {}, minimum = MINIMUM_ORDER) {
  return selectionTotal(selection) >= minimum;
}

export function buildWhatsAppSummary({ selection, variantsById, lang = 'es', buyer = {} }) {
  const total = selectionTotal(selection);
  const lines = Object.entries(selection)
    .filter(([, quantity]) => Number(quantity) > 0)
    .map(([id, quantity]) => {
      const item = variantsById.get(id);
      if (!item) return null;
      const colorName = lang === 'es' ? item.variant.colorNameEs : item.variant.colorNameEn;
      return `• ${item.variant.code} · ${colorName} × ${quantity}`;
    })
    .filter(Boolean);
  const optional = [
    buyer.name ? `${lang === 'es' ? 'Contacto' : 'Contact'}: ${buyer.name}` : '',
    buyer.business ? `${lang === 'es' ? 'Óptica' : 'Optical store'}: ${buyer.business}` : '',
    buyer.notes ? `${lang === 'es' ? 'Notas' : 'Notes'}: ${buyer.notes}` : ''
  ].filter(Boolean);
  const heading = lang === 'es' ? 'Solicitud B2B · Thalia Sodi Eyewear' : 'B2B request · Thalia Sodi Eyewear';
  const totalLine = lang === 'es' ? `Total: ${total} piezas` : `Total: ${total} pieces`;
  const closing = lang === 'es' ? 'Solicito validación de disponibilidad y condiciones comerciales.' : 'Please confirm availability and commercial terms.';
  return [heading, '', ...lines, '', totalLine, ...(optional.length ? ['', ...optional] : []), '', closing].join('\n');
}
