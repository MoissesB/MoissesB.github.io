import { MINIMUM_ORDER, buildWhatsAppSummary, minimumMet, selectionTotal } from './selection-core.js';

const STORAGE_KEY = 'thalia-b2b-selection-v1';
const BUYER_KEY = 'thalia-b2b-buyer-v1';

function safeParse(key) {
  try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; }
}

export function createSelection({ products, site, lang, toast }) {
  const selection = safeParse(STORAGE_KEY);
  const buyer = safeParse(BUYER_KEY);
  const variantsById = new Map();
  products.forEach((model) => model.variants.forEach((variant) => variantsById.set(variant.id, { model, variant })));
  const text = lang === 'es' ? {
    added:'añadido a tu selección', empty:'Tu selección está vacía.', remaining:'piezas por completar', ready:'Selección lista', locked:'WhatsApp disponible al completar 24 piezas', open:'Preparar resumen en WhatsApp', remove:'Quitar'
  } : {
    added:'added to your selection', empty:'Your selection is empty.', remaining:'pieces remaining', ready:'Selection ready', locked:'WhatsApp becomes available at 24 pieces', open:'Prepare WhatsApp summary', remove:'Remove'
  };

  const drawers = [...document.querySelectorAll('[data-selection-drawer]')];
  const overlays = [...document.querySelectorAll('[data-selection-overlay]')];

  function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(selection)); }
  function saveBuyer() { localStorage.setItem(BUYER_KEY, JSON.stringify(buyer)); }
  function total() { return selectionTotal(selection); }
  function summaryText() { return buildWhatsAppSummary({ selection, variantsById, lang, buyer }); }
  function pdfSafe(value) {
    return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[•×]/g, '-').replace(/[()\\]/g, '\\$&');
  }
  function wrapLine(value, width = 88) {
    const words = pdfSafe(value).split(/\s+/);
    const lines = [];
    let line = '';
    words.forEach((word) => {
      const next = line ? `${line} ${word}` : word;
      if (next.length > width && line) { lines.push(line); line = word; } else line = next;
    });
    if (line) lines.push(line);
    return lines;
  }
  function downloadPdf() {
    const lines = summaryText().split('\n').flatMap((line) => line ? wrapLine(line) : ['']);
    const operations = ['BT', '/F1 11 Tf', '50 795 Td'];
    lines.forEach((line, index) => {
      if (index) operations.push('0 -16 Td');
      operations.push(`(${line}) Tj`);
    });
    operations.push('ET');
    const stream = operations.join('\n');
    const objects = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
    ];
    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    objects.forEach((object, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
    const xref = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n`; });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    const url = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `pedido-thalia-sodi-${new Date().toISOString().slice(0, 10)}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }
  function openDrawer() {
    drawers.forEach((drawer) => { drawer.classList.add('is-open'); drawer.setAttribute('aria-hidden','false'); });
    overlays.forEach((overlay) => { overlay.hidden = false; });
    document.body.classList.add('drawer-open');
  }
  function closeDrawer() {
    drawers.forEach((drawer) => { drawer.classList.remove('is-open'); drawer.setAttribute('aria-hidden','true'); });
    overlays.forEach((overlay) => { overlay.hidden = true; });
    document.body.classList.remove('drawer-open');
  }

  function add(id, quantity = 1) {
    const item = variantsById.get(id);
    if (!item?.variant.selectable) return;
    selection[id] = Math.max(0, Number(selection[id] || 0) + quantity);
    if (!selection[id]) delete selection[id];
    save(); render();
    if (quantity > 0) toast(`${item.variant.code} ${text.added}`);
  }

  function rowMarkup(id, quantity) {
    const item = variantsById.get(id);
    if (!item) return '';
    const name = lang === 'es' ? item.variant.colorNameEs : item.variant.colorNameEn;
    const image = item.variant.images[0];
    return `<article class="selection-row" data-selection-row="${id}">${image ? `<img src="${image}" alt="">` : '<span class="selection-placeholder"></span>'}<div><h3>${item.variant.code}</h3><p>${name}</p></div><div class="quantity-control"><button type="button" data-selection-change="-1" data-id="${id}" aria-label="−">−</button><span>${quantity}</span><button type="button" data-selection-change="1" data-id="${id}" aria-label="+">+</button></div><button class="remove-row" type="button" data-selection-remove data-id="${id}">${text.remove}</button></article>`;
  }

  function render() {
    const entries = Object.entries(selection).filter(([id, quantity]) => variantsById.has(id) && Number(quantity) > 0);
    const count = total();
    const progress = Math.min(100, count / MINIMUM_ORDER * 100);
    document.querySelectorAll('[data-selection-items],[data-selection-page-items]').forEach((container) => { container.innerHTML = entries.map(([id, quantity]) => rowMarkup(id, quantity)).join(''); });
    document.querySelectorAll('[data-selection-empty],[data-selection-page-empty]').forEach((empty) => { empty.hidden = entries.length > 0; });
    document.querySelectorAll('[data-selection-total],[data-selection-page-total]').forEach((node) => { node.textContent = count; });
    document.querySelectorAll('[data-selection-badge]').forEach((node) => { node.textContent = count; });
    document.querySelectorAll('[data-selection-progress]').forEach((node) => { node.style.width = `${progress}%`; });
    const status = count >= MINIMUM_ORDER ? text.ready : `${text.remaining}: ${MINIMUM_ORDER - count}`;
    document.querySelectorAll('[data-selection-status],[data-selection-page-status]').forEach((node) => { node.textContent = status; });
    document.querySelectorAll('[data-whatsapp-action]').forEach((link) => {
      if (minimumMet(selection)) {
        const message = summaryText();
        link.href = `https://wa.me/${site.whatsappNumber}?text=${encodeURIComponent(message)}`;
        link.textContent = text.open;
        link.classList.remove('is-disabled');
        link.setAttribute('aria-disabled','false');
        link.removeAttribute('tabindex');
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      } else {
        link.removeAttribute('href');
        link.textContent = text.locked;
        link.classList.add('is-disabled');
        link.setAttribute('aria-disabled','true');
        link.setAttribute('tabindex','-1');
      }
    });
    document.querySelectorAll('[data-selection-pdf]').forEach((button) => { button.disabled = !minimumMet(selection); });
    document.querySelectorAll('[data-email-action]').forEach((link) => {
      if (minimumMet(selection)) {
        const subject = lang === 'es' ? 'Pedido B2B · Thalia Sodi Eyewear' : 'B2B order · Thalia Sodi Eyewear';
        const body = `${summaryText()}\n\n${lang === 'es' ? 'Adjunto el PDF de mi pedido para su validación comercial.' : 'I have attached my order PDF for commercial validation.'}`;
        link.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        link.classList.remove('is-disabled');
        link.setAttribute('aria-disabled', 'false');
        link.removeAttribute('tabindex');
      } else {
        link.removeAttribute('href');
        link.classList.add('is-disabled');
        link.setAttribute('aria-disabled', 'true');
        link.setAttribute('tabindex', '-1');
      }
    });
    document.querySelectorAll('[data-email-hint]').forEach((hint) => { hint.hidden = !minimumMet(selection); });
  }

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-selection-trigger]');
    if (trigger) { event.preventDefault(); openDrawer(); return; }
    if (event.target.closest('[data-selection-close]') || event.target.closest('[data-selection-overlay]')) { closeDrawer(); return; }
    const addButton = event.target.closest('[data-add-selection]');
    if (addButton && !addButton.disabled) { add(addButton.dataset.addSelection, 1); return; }
    const change = event.target.closest('[data-selection-change]');
    if (change) { add(change.dataset.id, Number(change.dataset.selectionChange)); return; }
    const remove = event.target.closest('[data-selection-remove]');
    if (remove) { delete selection[remove.dataset.id]; save(); render(); return; }
    if (event.target.closest('[data-selection-clear]')) { Object.keys(selection).forEach((id) => delete selection[id]); save(); render(); }
    if (event.target.closest('[data-selection-pdf]') && minimumMet(selection)) { downloadPdf(); return; }
  });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeDrawer(); });
  document.querySelectorAll('[data-buyer-name]').forEach((input) => { input.value = buyer.name || ''; input.addEventListener('input', () => { buyer.name = input.value.trim(); saveBuyer(); render(); }); });
  document.querySelectorAll('[data-business-name]').forEach((input) => { input.value = buyer.business || ''; input.addEventListener('input', () => { buyer.business = input.value.trim(); saveBuyer(); render(); }); });
  document.querySelectorAll('[data-buyer-notes]').forEach((input) => { input.value = buyer.notes || ''; input.addEventListener('input', () => { buyer.notes = input.value.trim(); saveBuyer(); render(); }); });
  render();
  return { add, openDrawer, render, total, selection };
}
