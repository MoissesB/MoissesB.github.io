export function initProduct({ products, lang, toast }) {
  const body = document.body;
  if (!['product', 'consumerProduct'].includes(body.dataset.page)) return;

  let model;
  let variant;
  for (const candidate of products) {
    const match = candidate.variants.find((item) => item.id === body.dataset.variantId);
    if (match) { model = candidate; variant = match; break; }
  }
  if (!model || !variant) return;

  const text = lang === 'es'
    ? { copied:'Enlace copiado', unavailable:'No disponible', activate360:'Activar 360°', viewImages:'Ver imágenes', drag360:'Arrastra para girar', frame:'Vista', play:'Play', pause:'Pausa', loading360:'Cargando giro 360°…', ready360:'Giro 360° listo', error360:'No se pudo cargar el giro 360°', views:['vista frontal','vista diagonal derecha','vista diagonal izquierda'] }
    : { copied:'Link copied', unavailable:'Unavailable', activate360:'Activate 360°', viewImages:'View images', drag360:'Drag to rotate', frame:'View', play:'Play', pause:'Pause', loading360:'Loading 360° view…', ready360:'360° view ready', error360:'The 360° view could not be loaded', views:['front view','right-angle view','left-angle view'] };
  const colorName = lang === 'es' ? variant.colorNameEs : variant.colorNameEn;
  const alt = (index) => `${variant.code} · ${text.views[index] || `${lang === 'es' ? 'vista' : 'view'} ${index + 1}`} · ${colorName} · Thalia Sodi Eyewear`;
  let imageIndex = 0;
  let showVideo = false;
  let is360Animating = false;
  let videoFrameCallback = null;
  let dialogMode = 'image';
  let scale = 1, inlineScale = 1, inlineTranslateX = 0, inlineTranslateY = 0;
  let translateX = 0, translateY = 0, drag = null, inlineDrag = null, inlineWasDragged = false;
  const main = document.querySelector('[data-main-media]');
  const thumbs = document.querySelector('[data-gallery-thumbs]');
  const dialog = document.querySelector('[data-media-dialog]');
  const dialogImage = document.querySelector('[data-dialog-image]');
  const dialogVideo = document.querySelector('[data-dialog-video]');
  const stage = document.querySelector('[data-dialog-stage]');
  const q = (selector) => document.querySelector(selector);
  const productScrollKey = 'thalia-product-scroll';

  const hashScrollMatch = location.hash.match(/^#product-scroll=(\d+)$/);
  const hashScroll = hashScrollMatch ? Number(hashScrollMatch[1]) : null;
  let storedScroll = null;

  try {
    const savedScroll = JSON.parse(sessionStorage.getItem(productScrollKey) || 'null');
    storedScroll = savedScroll?.path === location.pathname && Date.now() - savedScroll.savedAt < 30000
      ? savedScroll.y
      : null;
    sessionStorage.removeItem(productScrollKey);
  } catch {}

  const scrollTarget = hashScroll ?? storedScroll;
  if (scrollTarget !== null) {
    const restoreScroll = () => scrollTo({ top:Math.min(scrollTarget, Math.max(0, document.documentElement.scrollHeight - innerHeight)), behavior:'auto' });
    requestAnimationFrame(() => requestAnimationFrame(restoreScroll));
    addEventListener('load', restoreScroll, { once:true });
    if (hashScroll !== null) history.replaceState(null, '', `${location.pathname}${location.search}`);
  }

  function updateTransform() {
    dialogImage.style.transform = `translate(${translateX}px,${translateY}px) scale(${scale})`;
  }
  function resetTransform() {
    scale = 1; translateX = 0; translateY = 0; updateTransform();
  }
  function updateInlineZoom() {
    const image = main.querySelector('[data-main-image]');
    if (!image) return;
    image.style.transform = `translate(${inlineTranslateX}px,${inlineTranslateY}px) scale(${inlineScale})`;
    image.style.touchAction = inlineScale > 1 ? 'none' : 'pan-y';
  }
  function resetInlineZoom() {
    inlineScale = 1; inlineTranslateX = 0; inlineTranslateY = 0; updateInlineZoom();
  }
  function renderThumbs() {
    thumbs.innerHTML = variant.images.map((url, index) => `<button type="button" data-gallery-thumb="${index}" aria-pressed="${index === imageIndex}"><img src="${url}" alt="${alt(index)}" loading="lazy"></button>`).join('');
  }
  function stop360Animation() {
    is360Animating = false;
    const video = main.querySelector('[data-main-video]');
    if (videoFrameCallback?.type === 'video' && video?.cancelVideoFrameCallback) video.cancelVideoFrameCallback(videoFrameCallback.id);
    if (videoFrameCallback?.type === 'animation') cancelAnimationFrame(videoFrameCallback.id);
    videoFrameCallback = null;
    if (video) video.pause();
    const playButton = main.querySelector('[data-360-play]');
    if (playButton) { playButton.textContent = text.play; playButton.setAttribute('aria-pressed', 'false'); }
  }
  function update360Readout(frame) {
    const scrubber = main.querySelector('[data-360-scrubber]');
    if (!scrubber) return;
    const frames = Number(scrubber.max) + 1;
    const normalized = Math.max(0, Math.min(frames - 1, Math.round(Number(frame))));
    scrubber.value = String(normalized);
    const output = main.querySelector('[data-360-frame]');
    if (output) output.textContent = `${text.frame} ${normalized + 1} / ${frames}`;
  }
  function sync360Playback(video) {
    if (!is360Animating || !Number.isFinite(video.duration) || !video.duration) return;
    const scrubber = main.querySelector('[data-360-scrubber]');
    if (!scrubber) { stop360Animation(); return; }
    update360Readout(video.currentTime / video.duration * Number(scrubber.max));
    if (video.requestVideoFrameCallback) {
      videoFrameCallback = { type:'video', id:video.requestVideoFrameCallback(() => sync360Playback(video)) };
    } else {
      videoFrameCallback = { type:'animation', id:requestAnimationFrame(() => sync360Playback(video)) };
    }
  }
  function set360Frame(frame) {
    const video = main.querySelector('[data-main-video]');
    const scrubber = main.querySelector('[data-360-scrubber]');
    if (!video || !scrubber || !Number.isFinite(video.duration) || !video.duration) return false;
    const frames = Number(scrubber.max) + 1;
    const requested = Math.round(Number(frame));
    if (!Number.isFinite(requested)) return false;
    const normalized = Math.max(0, Math.min(frames - 1, requested));
    video.pause();
    video.currentTime = normalized / Math.max(1, frames - 1) * Math.max(0, video.duration - .01);
    update360Readout(normalized);
    return true;
  }
  function updateMain() {
    stop360Animation();
    const image = variant.images[imageIndex];
    const is360 = showVideo && variant.video && variant.videoStatus !== 'broken';
    main.classList.toggle('is-360', is360);
    if (is360) {
      main.innerHTML = `<div class="frame-360-viewer" data-360-viewer><video src="${variant.video}" muted playsinline preload="auto" data-main-video aria-label="${variant.code} 360°"></video><div class="frame-360-controls"><span class="viewer-360-mark">360<small>°</small></span><button type="button" data-360-play aria-pressed="false" disabled>${text.play}</button><label><span>${text.drag360}</span><input type="range" min="0" max="35" step="1" value="0" data-360-scrubber aria-label="${text.drag360}"></label><output data-360-frame>${text.frame} 1 / 36</output><span class="viewer-360-status" data-360-status role="status">${text.loading360}</span></div></div>`;
      const video = main.querySelector('[data-main-video]');
      const scrubber = main.querySelector('[data-360-scrubber]');
      const playButton = main.querySelector('[data-360-play]');
      const status = main.querySelector('[data-360-status]');
      let scrubPointerId = null;
      const scrubFromPointer = (event) => {
        const bounds = scrubber.getBoundingClientRect();
        if (!bounds.width) return;
        const ratio = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
        set360Frame(Math.round(ratio * Number(scrubber.max)));
      };
      const prepare = () => {
        if (!video.duration || !Number.isFinite(video.duration)) return;
        video.loop = true;
        scrubber.disabled = false;
        playButton.disabled = false;
        set360Frame(Number(scrubber.value));
        status.textContent = text.ready360;
      };
      const fail = () => {
        stop360Animation();
        scrubber.disabled = true;
        playButton.disabled = true;
        status.textContent = text.error360;
      };
      scrubber.disabled = true;
      scrubber.addEventListener('pointerdown', (event) => {
        stop360Animation();
        scrubPointerId = event.pointerId;
        scrubber.focus({ preventScroll:true });
        try { scrubber.setPointerCapture(event.pointerId); } catch {}
        scrubFromPointer(event);
        event.preventDefault();
      });
      scrubber.addEventListener('pointermove', (event) => {
        if (event.pointerId !== scrubPointerId) return;
        scrubFromPointer(event);
        event.preventDefault();
      });
      const finishScrub = (event) => {
        if (event.pointerId !== scrubPointerId) return;
        scrubFromPointer(event);
        try { scrubber.releasePointerCapture(event.pointerId); } catch {}
        scrubPointerId = null;
      };
      scrubber.addEventListener('pointerup', finishScrub);
      scrubber.addEventListener('pointercancel', finishScrub);
      video.addEventListener('loadedmetadata', prepare, { once:true });
      video.addEventListener('loadeddata', prepare, { once:true });
      video.addEventListener('error', fail, { once:true });
      if (video.readyState >= 1) prepare();
    } else if (image) {
      main.innerHTML = `<img src="${image}" alt="${alt(imageIndex)}" data-main-image>`;
    } else {
      main.innerHTML = `<div class="media-placeholder"><b>${variant.code}</b><small>${text.unavailable}</small></div>`;
    }
    main.classList.toggle('is-empty', !image && !showVideo);
    resetInlineZoom();
  }
  function render() {
    imageIndex = Math.min(imageIndex, Math.max(0, variant.images.length - 1));
    const videoButton = q('[data-video-open]');
    videoButton.disabled = !variant.video || variant.videoStatus === 'broken';
    videoButton.textContent = showVideo ? text.viewImages : text.activate360;
    videoButton.setAttribute('aria-pressed', String(showVideo));
    q('[data-zoom-in]').disabled = !variant.images.length || showVideo;
    q('[data-zoom-out]').disabled = !variant.images.length || showVideo;
    updateMain();
    renderThumbs();
  }
  function openDialog(mode = 'image') {
    if (mode === 'image' && !variant.images.length) return;
    if (mode === 'video' && (!variant.video || variant.videoStatus === 'broken')) return;
    dialogMode = mode;
    resetTransform();
    dialog.classList.toggle('is-video', mode === 'video');
    dialogImage.src = variant.images[imageIndex] || '';
    dialogImage.alt = alt(imageIndex);
    dialogImage.style.display = mode === 'image' ? 'block' : 'none';
    dialogVideo.style.display = mode === 'video' ? 'block' : 'none';
    if (mode === 'video') {
      dialogVideo.src = variant.video;
      dialogVideo.play().catch(() => {});
    } else {
      dialogVideo.pause();
      dialogVideo.removeAttribute('src');
    }
    if (!dialog.open) dialog.showModal();
  }
  function closeDialog() {
    dialogVideo.pause(); dialog.close(); dialog.classList.remove('is-video'); resetTransform();
  }
  function step(delta) {
    if (!variant.images.length) return;
    imageIndex = (imageIndex + delta + variant.images.length) % variant.images.length;
    updateMain(); renderThumbs();
    if (dialog.open) { dialogImage.src = variant.images[imageIndex]; dialogImage.alt = alt(imageIndex); resetTransform(); }
  }

  document.addEventListener('click', async (event) => {
    const productStep = event.target.closest('[data-product-step]');
    if (productStep) {
      const destination = new URL(productStep.href);
      try { sessionStorage.setItem(productScrollKey, JSON.stringify({ path:destination.pathname, y:scrollY, savedAt:Date.now() })); } catch {}
      destination.hash = `product-scroll=${Math.round(scrollY)}`;
      productStep.href = destination.href;
      return;
    }
    const thumb = event.target.closest('[data-gallery-thumb]');
    if (thumb) { imageIndex = Number(thumb.dataset.galleryThumb); showVideo = false; updateMain(); renderThumbs(); return; }
    if (event.target.closest('[data-main-image]') && inlineWasDragged) { inlineWasDragged = false; event.preventDefault(); return; }
    if (event.target.closest('[data-zoom-in]') || event.target.closest('[data-main-image]')) { inlineScale = Math.min(3, inlineScale + .25); updateInlineZoom(); return; }
    if (event.target.closest('[data-zoom-out]')) { inlineScale = Math.max(1, inlineScale - .25); updateInlineZoom(); return; }
    if (event.target.closest('[data-video-open]')) {
      showVideo = !showVideo;
      render();
      if (showVideo) requestAnimationFrame(() => main.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block:'start' }));
      return;
    }
    if (event.target.closest('[data-360-play]')) {
      const playButton = event.target.closest('[data-360-play]');
      if (is360Animating) { stop360Animation(); return; }
      const video = main.querySelector('[data-main-video]');
      if (!video) return;
      is360Animating = true;
      playButton.textContent = text.pause;
      playButton.setAttribute('aria-pressed', 'true');
      video.loop = true;
      video.play().then(() => sync360Playback(video)).catch(() => stop360Animation());
      return;
    }
    if (event.target.closest('[data-dialog-close]')) { closeDialog(); return; }
    if (event.target.closest('[data-dialog-prev]')) { step(-1); return; }
    if (event.target.closest('[data-dialog-next]')) { step(1); return; }
    if (event.target.closest('[data-dialog-zoom-in]')) { scale = Math.min(4, scale + .25); updateTransform(); return; }
    if (event.target.closest('[data-dialog-zoom-out]')) { scale = Math.max(1, scale - .25); if (scale === 1) { translateX = 0; translateY = 0; } updateTransform(); return; }
    if (event.target.closest('[data-dialog-reset]')) { resetTransform(); return; }
    if (event.target.closest('[data-dialog-toggle-360]')) { openDialog(dialogMode === 'video' ? 'image' : 'video'); return; }
    const accordion = event.target.closest('[data-accordion]');
    if (accordion) {
      const expanded = accordion.getAttribute('aria-expanded') === 'true';
      accordion.setAttribute('aria-expanded', String(!expanded));
      accordion.querySelector('span').textContent = expanded ? '+' : '−';
      accordion.nextElementSibling.hidden = expanded;
      return;
    }
    if (event.target.closest('[data-share-product]')) {
      try {
        if (navigator.share) await navigator.share({ title: document.title, url: location.href });
        else { await navigator.clipboard.writeText(location.href); toast(text.copied); }
      } catch {}
    }
  });
  document.addEventListener('input', (event) => {
    const scrubber = event.target.closest('[data-360-scrubber]');
    if (!scrubber) return;
    stop360Animation();
    set360Frame(Number(scrubber.value));
  });
  document.querySelector('[data-product-color-select]')?.addEventListener('change', (event) => {
    const route = event.currentTarget.value;
    if (route) location.href = route;
  });
  dialog.addEventListener('click', (event) => { if (event.target === dialog) closeDialog(); });
  dialog.addEventListener('close', () => { dialogVideo.pause(); dialogVideo.removeAttribute('src'); dialog.classList.remove('is-video'); resetTransform(); });
  dialog.addEventListener('wheel', (event) => { if (dialogMode !== 'image') return; event.preventDefault(); scale = Math.max(1, Math.min(4, scale + (event.deltaY < 0 ? .15 : -.15))); if (scale === 1) { translateX = 0; translateY = 0; } updateTransform(); }, { passive:false });
  stage.addEventListener('pointerdown', (event) => { if (dialogMode !== 'image' || scale === 1) return; drag = { x:event.clientX, y:event.clientY, tx:translateX, ty:translateY }; stage.setPointerCapture(event.pointerId); stage.classList.add('is-dragging'); });
  stage.addEventListener('pointermove', (event) => { if (!drag) return; translateX = drag.tx + event.clientX - drag.x; translateY = drag.ty + event.clientY - drag.y; updateTransform(); });
  stage.addEventListener('pointerup', () => { drag = null; stage.classList.remove('is-dragging'); });
  main.addEventListener('pointerdown', (event) => { if (showVideo || inlineScale === 1 || !event.target.closest('[data-main-image]')) return; inlineDrag = { x:event.clientX, y:event.clientY, tx:inlineTranslateX, ty:inlineTranslateY }; main.setPointerCapture(event.pointerId); });
  main.addEventListener('pointermove', (event) => { if (!inlineDrag) return; inlineTranslateX = inlineDrag.tx + event.clientX - inlineDrag.x; inlineTranslateY = inlineDrag.ty + event.clientY - inlineDrag.y; inlineWasDragged = true; updateInlineZoom(); event.preventDefault(); });
  main.addEventListener('pointerup', () => { inlineDrag = null; });
  main.addEventListener('pointercancel', () => { inlineDrag = null; });
  document.addEventListener('keydown', (event) => { if (!dialog.open) return; if (event.key === 'ArrowLeft') step(-1); if (event.key === 'ArrowRight') step(1); });
  render();
}
