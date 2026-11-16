export function initCatalog({ lang }) {
  const resultLabel = lang === 'es' ? 'modelos disponibles' : 'styles available';
  const cards = [...document.querySelectorAll('[data-catalog-card][data-card-variants]')];
  const searches = [...document.querySelectorAll('[data-catalog-search]')];
  const touch = matchMedia('(hover: none)').matches || 'ontouchstart' in window;

  function variantsFor(card) {
    try { return JSON.parse(card.dataset.cardVariants || '[]'); } catch { return []; }
  }

  function updateCard(card, index, { preview = false } = {}) {
    const variants = variantsFor(card);
    if (!variants.length) return;
    const normalized = (index + variants.length) % variants.length;
    const variant = variants[normalized];
    const image = card.querySelector('[data-card-image]');
    if (image) {
      image.classList.add('is-changing');
      image.src = variant.image;
      image.alt = `${variant.code} · Thalia Sodi Eyewear`;
      requestAnimationFrame(() => image.classList.remove('is-changing'));
    }
    card.querySelector('[data-card-code]')?.replaceChildren(variant.code);
    card.querySelector('[data-card-title]')?.replaceChildren(variant.title);
    card.querySelector('[data-card-color]')?.replaceChildren(variant.colorName);
    card.dataset.activeVariantIndex = String(normalized);
    if (preview) return;
    card.querySelectorAll('[data-card-link]').forEach((link) => { link.href = variant.url; });
    const add = card.querySelector('[data-add-selection]');
    if (add) { add.dataset.addSelection = variant.id; add.disabled = !variant.selectable; }
  }

  function selectedIndex(card) {
    const variants = variantsFor(card);
    const selected = card.querySelector('[data-card-color-select]')?.value;
    const index = variants.findIndex((variant) => variant.id === selected);
    return index < 0 ? 0 : index;
  }

  cards.forEach((card) => {
    const variants = variantsFor(card);
    if (!variants.length) return;
    let timer;
    const stop = (restore = true) => { clearInterval(timer); timer = undefined; if (restore) updateCard(card, selectedIndex(card)); };
    const start = () => {
      if (variants.length < 2 || timer) return;
      let index = Number(card.dataset.activeVariantIndex || selectedIndex(card));
      timer = setInterval(() => { index = (index + 1) % variants.length; updateCard(card, index, { preview:true }); }, 1350);
    };
    card._startColorCycle = start;
    card._stopColorCycle = stop;
    updateCard(card, 0);
    card.querySelector('[data-card-color-select]')?.addEventListener('change', (event) => {
      stop(false);
      const index = variants.findIndex((variant) => variant.id === event.currentTarget.value);
      updateCard(card, index < 0 ? 0 : index);
    });
    const media = card.querySelector('.product-card-media');
    if (!touch && media && variants.length > 1) {
      media.addEventListener('mouseenter', start);
      media.addEventListener('mouseleave', () => stop(true));
    }
  });

  if (touch && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      if (!matchMedia('(max-width: 760px)').matches) return;
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio >= .58) entry.target._startColorCycle?.();
        else entry.target._stopColorCycle?.(true);
      });
    }, { threshold:[0, .35, .58, .85] });
    cards.filter((card) => variantsFor(card).length > 1).forEach((card) => observer.observe(card));
  }

  function filter(query) {
    const normalized = query.trim().toLowerCase().replaceAll(' ', '');
    let visible = 0;
    cards.forEach((card) => {
      const haystack = `${card.dataset.model}${card.textContent}${card.dataset.cardVariants}`.toLowerCase().replaceAll(' ', '');
      const show = !normalized || haystack.includes(normalized);
      card.hidden = !show;
      if (show) visible += 1;
    });
    document.querySelectorAll('[data-catalog-count]').forEach((node) => { node.textContent = `${visible} ${resultLabel}`; });
    document.querySelectorAll('[data-no-results]').forEach((node) => { node.hidden = visible > 0; });
  }

  searches.forEach((input) => input.addEventListener('input', () => {
    searches.forEach((other) => { if (other !== input) other.value = input.value; });
    filter(input.value);
  }));
}
