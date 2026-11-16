const $ = (id) => document.getElementById(id);
const state = { lang: 'es', tab: 'models', catalog: null, byId: new Map(), selected: new Set(), query: '', color: '', language: '', format: '' };
const copy = {
  es: { skip:'Ir al contenido', back:'Volver al catálogo', logout:'Salir', eyebrow:'THALIA SODI EYEWEAR · PARA ÓPTICAS', headline:'La colección, lista para compartir.', intro:'Explora imágenes de cada modelo, videos y piezas para tus canales. Selecciona solo lo que necesitas y prepara tus descargas.', heroCaptionTop:'BIBLIOTECA PROFESIONAL', accessKicker:'ACCESO PARA ÓPTICAS', accessTitle:'Entra con el correo aprobado.', accessIntro:'Si tu correo está autorizado, recibirás un enlace privado de acceso.', email:'Correo electrónico', requestLink:'Solicitar enlace', opening:'Abriendo tu biblioteca…', retryIntro:'La biblioteca está tardando en abrir. Tu acceso sigue activo.', retryButton:'Reintentar entrada', accessNote:'El enlace es personal y caduca a los 15 minutos.', libraryKicker:'BIBLIOTECA PARA TU ÓPTICA', libraryTitle:'Encuentra el recurso correcto.', libraryIntro:'Filtra, amplía y prepara una selección para descargar.', approved:'Acceso aprobado', preview:'Vista local', modelsTab:'Modelos', videosTab:'Videos', socialTab:'Publicidad y redes', logosTab:'Logos', filters:'Filtros', searchLabel:'Buscar', color:'Color', allColors:'Todos', format:'Formato', allFormats:'Todos los formatos', vertical:'Vertical', horizontal:'Horizontal', square:'Cuadrado', language:'Idioma', allLanguages:'Todos', spanish:'Español', pendingLanguage:'Por revisar', clear:'Limpiar', selectionHint:'Puedes elegir modelos completos o archivos individuales.', empty:'No hay recursos con estos filtros.', myDownloads:'Mis descargas', cartTitle:'Tu selección', cartIntro:'Los lotes ZIP incluirán únicamente los archivos elegidos.', clearSelection:'Vaciar selección', downloadZip:'Descargar ZIP', view:'Ver detalle', previewMedia:'Ampliar', add:'Añadir', remove:'Quitar', download:'Descargar', addModel:'Añadir modelo completo', removeModel:'Quitar modelo', files:'archivos', models:'modelos', pending:'Idioma por revisar', setup:'El acceso aún no está disponible. Inténtalo más tarde.', sent:'Si el correo está aprobado, enviaremos un enlace privado.', invalid:'El enlace no es válido o ha caducado. Solicita uno nuevo.', zipError:'No se pudo preparar el ZIP.', emptyCart:'Selecciona al menos un archivo.', gallery:'Imágenes del modelo', individual:'Archivos individuales', video:'Video 360°', accessDenied:'Acceso no autorizado.' },
  en: { skip:'Skip to content', back:'Back to catalog', logout:'Sign out', eyebrow:'THALIA SODI EYEWEAR · FOR OPTICIANS', headline:'The collection, ready to share.', intro:'Explore images of every style, videos, and content for your channels. Select only what you need and prepare your downloads.', heroCaptionTop:'PROFESSIONAL LIBRARY', accessKicker:'OPTICIAN ACCESS', accessTitle:'Enter your approved email.', accessIntro:'If your email is approved, we will send you a private access link.', email:'Email address', requestLink:'Request access link', opening:'Opening your library…', retryIntro:'The library is taking longer to open. Your access is still active.', retryButton:'Try opening again', accessNote:'The personal link expires after 15 minutes.', libraryKicker:'LIBRARY FOR YOUR STORE', libraryTitle:'Find the right resource.', libraryIntro:'Filter, enlarge, and prepare a download selection.', approved:'Approved access', preview:'Local preview', modelsTab:'Styles', videosTab:'Videos', socialTab:'Advertising and social', logosTab:'Logos', filters:'Filters', searchLabel:'Search', color:'Color', allColors:'All', format:'Format', allFormats:'All formats', vertical:'Portrait', horizontal:'Landscape', square:'Square', language:'Language', allLanguages:'All', spanish:'Spanish', pendingLanguage:'To review', clear:'Clear', selectionHint:'Choose complete styles or individual files.', empty:'No resources match these filters.', myDownloads:'My downloads', cartTitle:'Your selection', cartIntro:'ZIP batches contain only the files you selected.', clearSelection:'Clear selection', downloadZip:'Download ZIP', view:'View details', previewMedia:'Enlarge', add:'Add', remove:'Remove', download:'Download', addModel:'Add complete style', removeModel:'Remove style', files:'files', models:'styles', pending:'Language to review', setup:'Access is not available yet. Please try later.', sent:'If the email is approved, we will send a private link.', invalid:'This link is invalid or has expired. Request a new one.', zipError:'The ZIP could not be prepared.', emptyCart:'Select at least one file.', gallery:'Style images', individual:'Individual files', video:'360° video', accessDenied:'Access denied.' },
};
Object.assign(copy.es, { downloadTitle:'Preparando tu descarga', downloadWait:'Mantén esta página abierta hasta que termine.', downloadSaving:'Descargando', downloadChoose:'Elige dónde guardar el archivo.', downloadFailed:'No se pudo completar la descarga.' });
Object.assign(copy.en, { downloadTitle:'Preparing your download', downloadWait:'Keep this page open until the download finishes.', downloadSaving:'Downloading', downloadChoose:'Choose where to save the file.', downloadFailed:'The download could not be completed.' });
Object.assign(copy.es, { sendingLink:'Enviando enlace…', sendingDetail:'Estamos verificando tu solicitud y preparando el correo.', sent:'Solicitud recibida. Si tu correo está aprobado, revisa Recibidos y Spam. Si pediste un enlace hace poco, usa el mensaje más reciente.', sendTimeout:'No pudimos confirmar el envío. Revisa tu correo antes de intentarlo de nuevo.' });
Object.assign(copy.en, { sendingLink:'Sending link…', sendingDetail:'We are checking your request and preparing the email.', sent:'Request received. If your email is approved, check your inbox and spam folder. If you recently requested a link, use the latest message.', sendTimeout:'We could not confirm delivery. Check your email before trying again.' });
const t = (key) => copy[state.lang][key] || key;
const esc = (value) => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const mediaUrl = (id, download = false) => `/api/client-media/${encodeURIComponent(id)}${download ? '?download=1' : ''}`;
const asset = (id) => state.byId.get(id);
let videoObserver;
let accessRequestPending = false;
let requestFeedbackKey = '';

function setRequestFeedback(stateName, message, key = '') {
  const feedback = $('requestFeedback');
  requestFeedbackKey = key;
  feedback.dataset.state = stateName;
  feedback.textContent = message;
  feedback.hidden = false;
}

function translate() {
  document.documentElement.lang = state.lang;
  document.querySelectorAll('[data-t]').forEach((element) => { element.textContent = t(element.dataset.t); });
  $('languageButton').textContent = state.lang === 'es' ? 'EN' : 'ES';
  $('accessSubmit').textContent = t(accessRequestPending ? 'sendingLink' : 'requestLink');
  if (requestFeedbackKey) $('requestFeedback').textContent = t(requestFeedbackKey);
  if (state.catalog) render();
}

let toastTimer;
function toast(message) {
  const element = $('toast'); element.textContent = message; element.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { element.hidden = true; }, 4500);
}

async function finishOpening(started) {
  if (started && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    await new Promise((resolve) => setTimeout(resolve, Math.max(0, 650 - (performance.now() - started))));
  }
  document.documentElement.classList.remove('access-pending');
  sessionStorage.removeItem('thalia-entry-reloaded');
}

async function api(url, options = {}) {
  const { timeoutMs, ...requestOptions } = options;
  const response = await fetch(url, { credentials: 'same-origin', ...requestOptions, ...(timeoutMs ? { signal: AbortSignal.timeout(timeoutMs) } : {}) });
  if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.error || `HTTP ${response.status}`); }
  return response;
}

async function enterLibrary(preview) {
  const response = await api('/api/client-catalog', { timeoutMs: 12000 });
  state.catalog = await response.json();
  state.byId = new Map(state.catalog.assets.map((item) => [item.id, item]));
  $('access').hidden = true; $('library').hidden = false; $('cartButton').hidden = false; $('logoutButton').hidden = false;
  $('accessBadge').textContent = t(preview ? 'preview' : 'approved');
  document.querySelector('.hero-image').style.backgroundImage = `url("${state.catalog.hero}")`;
  fillColors(); render(); updateCart();
}

function fillColors() {
  const select = $('colorFilter');
  const colors = [...new Set(state.catalog.models.map((model) => model.color).filter(Boolean))].sort((a,b) => a.localeCompare(b));
  select.replaceChildren(new Option(t('allColors'), ''));
  colors.forEach((color) => select.add(new Option(color, color)));
}

function showAccess(message) { document.documentElement.classList.remove('access-pending'); sessionStorage.removeItem('thalia-entry-reloaded'); $('access').hidden = false; $('accessForm').hidden = false; $('accessStatus').hidden = true; $('library').hidden = true; $('cartButton').hidden = true; $('logoutButton').hidden = true; requestFeedbackKey = ''; $('requestFeedback').hidden = true; if (message) toast(message); }

async function enterLibraryWithRetry(preview) {
  try { await enterLibrary(preview); }
  catch { await enterLibrary(preview); }
}

function showRetry() {
  document.documentElement.classList.remove('access-pending');
  sessionStorage.removeItem('thalia-entry-reloaded');
  $('access').hidden = false; $('accessForm').hidden = true; $('library').hidden = true;
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'primary'; button.textContent = t('retryButton');
  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      const session = await (await api('/api/client-session', { timeoutMs: 12000 })).json();
      await enterLibraryWithRetry(session.preview);
      $('accessStatus').hidden = true;
    } catch { toast(t('setup')); }
    finally { button.disabled = false; }
  });
  $('accessStatus').replaceChildren(document.createTextNode(t('retryIntro')), document.createElement('br'), button);
  $('accessStatus').hidden = false;
}

function imageFor(item) { return item.previewUrl || mediaUrl(item.id); }
function mediaFormat(item) {
  const width = Number(item.width), height = Number(item.height);
  if (!(width > 0 && height > 0)) return '';
  if (Math.abs(width - height) / Math.max(width, height) <= 0.05) return 'square';
  return width > height ? 'horizontal' : 'vertical';
}

function modelCard(model) {
  const first = asset(model.images[0]);
  const chosen = model.images.every((id) => state.selected.has(id)) && (!model.videoId || state.selected.has(model.videoId));
  return `<article class="resource-card image-card"><button class="card-media" type="button" data-open-model="${esc(model.id)}" aria-label="${esc(t('view'))} ${esc(model.code)}"><img src="${esc(imageFor(first))}" alt="${esc(model.code)}" loading="lazy"></button><div class="card-body"><span class="card-overline">THALIA SODI EYEWEAR</span><h3>${esc(model.code)}</h3><p>${esc(state.lang === 'en' ? (model.colorEn || model.color) : model.color)}</p><div class="card-actions"><button type="button" data-open-model="${esc(model.id)}">${t('view')}</button><button type="button" data-toggle-model="${esc(model.id)}" class="${chosen ? 'selected' : ''}">${t(chosen ? 'remove' : 'add')}</button></div></div></article>`;
}

function mediaCard(item) {
  const selected = state.selected.has(item.id);
  const format = mediaFormat(item);
  const badge = format ? `<span class="format-badge">${esc(t(format))}</span>` : '';
  const visual = item.kind === 'video' ? `<div class="video-art"><video class="video-thumb" data-src="${esc(mediaUrl(item.id))}#t=0.5" muted playsinline preload="none" aria-hidden="true"></video><span aria-hidden="true">▶</span></div>${badge}` : `<img src="${esc(imageFor(item))}" alt="${esc(item.title)}" loading="lazy">${badge}`;
  const logoClass = item.category === 'logos' ? ` logo-card${logoNeedsDarkBackground(item) ? ' logo-on-dark' : ''}` : '';
  return `<article class="resource-card${item.kind === 'image' ? ' image-card' : ''}${logoClass}"><button class="card-media" type="button" data-open-media="${esc(item.id)}" aria-label="${esc(t('previewMedia'))} ${esc(item.title)}">${visual}</button><div class="card-body"><span class="card-overline">${esc(item.category === 'logos' ? 'THALIA SODI' : item.kind === 'video' ? t('videosTab') : t('socialTab'))}</span><h3>${esc(item.title)}</h3><div class="card-actions"><button type="button" data-open-media="${esc(item.id)}">${t('previewMedia')}</button><a href="${esc(mediaUrl(item.id,true))}" download="${esc(item.name)}" data-download-asset="${esc(item.id)}">${t('download')}</a><button type="button" data-toggle-asset="${esc(item.id)}" class="${selected ? 'selected' : ''}">${t(selected ? 'remove' : 'add')}</button></div></div></article>`;
}

function logoNeedsDarkBackground(item) { return item.category === 'logos' && /_White\.png$/i.test(item.name); }

function render() {
  const query = state.query.trim().toLocaleLowerCase(); let matches;
  if (state.tab === 'models') matches = state.catalog.models.filter((model) => (!state.color || model.color === state.color) && (!query || [model.code, model.color, model.description].some((value) => String(value || '').toLocaleLowerCase().includes(query))));
  else matches = state.catalog.assets.filter((item) => item.category === state.tab && (!state.format || mediaFormat(item) === state.format) && (!query || [item.title, item.name].some((value) => String(value || '').toLocaleLowerCase().includes(query))));
  $('cardGrid').innerHTML = matches.map((item) => state.tab === 'models' ? modelCard(item) : mediaCard(item)).join('');
  $('cardGrid').classList.toggle('models-grid', state.tab === 'models');
  videoObserver?.disconnect();
  const thumbs = [...$('cardGrid').querySelectorAll('video[data-src]')];
  if (thumbs.length && 'IntersectionObserver' in window) {
    videoObserver = new IntersectionObserver((entries, observer) => entries.forEach((entry) => { if (!entry.isIntersecting) return; const video = entry.target; video.src = video.dataset.src; video.load(); observer.unobserve(video); }), { rootMargin: '240px' });
    thumbs.forEach((video) => videoObserver.observe(video));
  } else thumbs.forEach((video) => { video.src = video.dataset.src; video.load(); });
  $('resultsCount').textContent = `${matches.length} ${t(state.tab === 'models' ? 'models' : 'files')}`;
  $('emptyState').hidden = matches.length > 0;
  $('colorFilterWrap').hidden = state.tab !== 'models'; $('formatFilterWrap').hidden = state.tab === 'models'; $('languageFilterWrap').hidden = true;
  document.querySelectorAll('[data-tab]').forEach((tab) => { const active = tab.dataset.tab === state.tab; tab.classList.toggle('active', active); tab.setAttribute('aria-selected', String(active)); });
}

function updateCart() {
  $('cartCount').textContent = state.selected.size;
  $('cartList').innerHTML = [...state.selected].map((id) => { const item = asset(id) || { name: id }; return `<li><span>${esc(item.name)}</span><button type="button" data-remove="${esc(id)}" aria-label="${esc(t('remove'))} ${esc(item.name)}">×</button></li>`; }).join('');
  $('downloadZip').disabled = state.selected.size === 0;
  if (state.catalog) render();
}

function toggleModel(id) {
  const model = state.catalog.models.find((entry) => entry.id === id); if (!model) return;
  const ids = [...model.images, ...(model.videoId ? [model.videoId] : [])];
  const all = ids.every((item) => state.selected.has(item)); ids.forEach((item) => all ? state.selected.delete(item) : state.selected.add(item)); updateCart();
}

function openModel(id) {
  const model = state.catalog.models.find((entry) => entry.id === id); if (!model) return;
  const pictures = model.images.map(asset);
  const imageTiles = pictures.map((item,index) => `<button type="button" data-show-image="${esc(item.id)}" aria-label="${esc(t('gallery'))} ${index + 1}" aria-pressed="${index === 0}"><img src="${esc(imageFor(item))}" alt=""></button>`);
  const videoTile = model.videoId ? `<button type="button" class="video-tile" data-show-video="${esc(model.videoId)}" aria-label="${esc(t('video'))}" aria-pressed="false"><img src="${esc(imageFor(pictures[0]))}" alt=""><span aria-hidden="true">▶</span></button>` : '';
  if (videoTile) imageTiles.splice(1, 0, videoTile);
  $('detailBody').dataset.modelId = model.id;
  $('detailBody').innerHTML = `<div class="detail-layout"><div><div class="detail-main" id="detailMain"><img src="${esc(imageFor(pictures[0]))}" alt="${esc(model.code)}"></div><div class="detail-thumbs">${imageTiles.join('')}</div></div><div class="detail-copy"><span class="kicker">${esc(model.code)}</span><h2>${esc(model.code)}</h2><p>${esc(state.lang === 'en' ? model.descriptionEn || model.description : model.description)}</p><h3>${t('individual')}</h3><ul>${pictures.map((item,index) => `<li><span>${esc(t('gallery'))} ${index + 1}</span><span><a href="${esc(mediaUrl(item.id,true))}" download="${esc(item.name)}">${t('download')}</a> · <button type="button" data-toggle-asset="${esc(item.id)}">${t(state.selected.has(item.id) ? 'remove' : 'add')}</button></span></li>`).join('')}${model.videoId ? `<li><span>${t('video')}</span><span><button type="button" data-show-video="${esc(model.videoId)}">${t('view')}</button> · <button type="button" data-toggle-asset="${esc(model.videoId)}">${t(state.selected.has(model.videoId) ? 'remove' : 'add')}</button></span></li>` : ''}</ul><button class="primary" type="button" data-toggle-model="${esc(model.id)}">${t('addModel')}</button></div></div>`;
  $('detailDialog').showModal();
}

function showModelMedia(id, isVideo) {
  const model = state.catalog.models.find((entry) => entry.id === $('detailBody').dataset.modelId);
  if (!model || (isVideo ? model.videoId !== id : !model.images.includes(id))) return;
  const main = $('detailMain');
  main.querySelector('video')?.pause();
  main.classList.toggle('video-active', isVideo);
  if (isVideo) {
    const poster = asset(model.images[0]);
    main.innerHTML = `<video src="${esc(mediaUrl(id))}#t=0.2" poster="${esc(imageFor(poster))}" controls playsinline preload="metadata" aria-label="${esc(t('video'))}"></video>`;
    main.querySelector('video').play().catch(() => {});
  } else {
    main.innerHTML = `<img src="${esc(imageFor(asset(id)))}" alt="${esc(model.code)}">`;
  }
  $('detailBody').querySelectorAll('.detail-thumbs button').forEach((button) => {
    button.setAttribute('aria-pressed', String((isVideo ? button.dataset.showVideo : button.dataset.showImage) === id));
  });
}

function openMedia(id) {
  const item = asset(id) || state.catalog?.models.find((model) => model.videoId === id) && { id, name: `${id}.mp4`, title: id, kind: 'video' };
  if (!item) return;
  $('mediaTitle').textContent = item.title;
  const model = item.modelId && state.catalog?.models.find((entry) => entry.id === item.modelId);
  const poster = model?.images?.[0] && asset(model.images[0]) ? ` poster="${esc(imageFor(asset(model.images[0])))}"` : '';
  $('mediaBody').classList.toggle('logo-card', item.category === 'logos');
  $('mediaBody').classList.toggle('logo-on-dark', logoNeedsDarkBackground(item));
  $('mediaBody').classList.toggle('image-card', item.kind === 'image');
  $('mediaBody').innerHTML = item.kind === 'video' ? `<video src="${esc(mediaUrl(id))}#t=0.2"${poster} controls playsinline preload="metadata"></video>` : `<img src="${esc(imageFor(item))}" alt="${esc(item.title)}">`;
  $('mediaDialog').showModal();
}

function closeMedia() { const video = $('mediaBody').querySelector('video'); if (video) video.pause(); $('mediaDialog').close(); $('mediaBody').replaceChildren(); }
function openCart() { $('drawer').hidden = false; $('scrim').hidden = false; $('closeCart').focus(); }
function closeCart() { $('drawer').hidden = true; $('scrim').hidden = true; $('cartButton').focus(); }

function downloadBlob(blob, name) { const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = name; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000); }
let downloadInProgress = false;
function setDownloadPercent(value) {
  const percent = Math.max(0, Math.min(100, Math.floor(value)));
  $('downloadProgressFill').style.width = `${percent}%`;
  $('downloadProgress').setAttribute('aria-valuenow', String(percent));
  $('downloadPercent').textContent = `${percent}%`;
}
async function receiveDownload(task, report, fileHandle) {
  const response = await api(task.url, task.options || {});
  const total = Number(response.headers.get('content-length')) || task.estimate || 0;
  const type = response.headers.get('content-type') || 'application/octet-stream';
  const reader = response.body?.getReader();
  const writer = fileHandle ? await fileHandle.createWritable() : null;
  const chunks = [];
  let loaded = 0;
  try {
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        loaded += value.byteLength;
        if (writer) await writer.write(value);
        else chunks.push(value);
        report(loaded, total);
      }
    } else {
      const blob = await response.blob();
      loaded = blob.size;
      if (writer) await writer.write(blob);
      else chunks.push(blob);
      report(loaded, total);
    }
    if (writer) await writer.close();
    else downloadBlob(new Blob(chunks, { type }), task.name);
  } catch (error) {
    await writer?.abort().catch(() => {});
    throw error;
  }
}
async function runDownloads(tasks) {
  if (downloadInProgress || !tasks.length) return;
  downloadInProgress = true;
  const dialog = $('downloadDialog');
  const priorOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  setDownloadPercent(0);
  $('downloadStatus').textContent = `${t('downloadSaving')} ${tasks[0].name}`;
  dialog.showModal();
  try {
    const totalEstimate = tasks.reduce((sum, task) => sum + Math.max(1, task.estimate || 1_000_000), 0);
    let fileHandle, directoryHandle;
    if (totalEstimate > 100_000_000 && tasks.length === 1 && window.showSaveFilePicker) {
      $('downloadStatus').textContent = t('downloadChoose');
      fileHandle = await window.showSaveFilePicker({ suggestedName: tasks[0].name });
    } else if (totalEstimate > 100_000_000 && tasks.length > 1 && window.showDirectoryPicker) {
      $('downloadStatus').textContent = t('downloadChoose');
      directoryHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    }
    let completedWeight = 0;
    for (let index = 0; index < tasks.length; index++) {
      const task = tasks[index];
      const weight = Math.max(1, task.estimate || 1_000_000);
      $('downloadStatus').textContent = `${t('downloadSaving')} ${task.name}${tasks.length > 1 ? ` (${index + 1}/${tasks.length})` : ''}`;
      const destination = directoryHandle ? await directoryHandle.getFileHandle(task.name, { create: true }) : fileHandle;
      await receiveDownload(task, (loaded, total) => {
        const fraction = total > 0 ? Math.min(1, loaded / total) : 0;
        setDownloadPercent(Math.min(99, (completedWeight + weight * fraction) / totalEstimate * 100));
      }, destination);
      completedWeight += weight;
      setDownloadPercent(Math.min(99, completedWeight / totalEstimate * 100));
    }
    setDownloadPercent(100);
    await new Promise((resolve) => setTimeout(resolve, 350));
  } catch (error) {
    if (error.name !== 'AbortError') toast(error.message || t('downloadFailed'));
  } finally {
    dialog.close();
    document.body.style.overflow = priorOverflow;
    downloadInProgress = false;
  }
}
function downloadAsset(id) {
  const item = asset(id); if (!item) return;
  return runDownloads([{ name: item.name, url: mediaUrl(id, true), estimate: item.size || 0 }]);
}
async function downloadSelection() {
  if (!state.selected.size) return toast(t('emptyCart'));
  const button = $('downloadZip'); button.disabled = true;
  const tasks = []; let group = []; let size = 0;
  const addGroup = () => { if (group.length) tasks.push({ kind: 'zip', ids: group, estimate: size }); group = []; size = 0; };
  for (const id of state.selected) {
    const item = asset(id); if (!item) continue;
    const estimate = item.size || 1_000_000;
    if (estimate > 20_000_000) { addGroup(); tasks.push({ kind: 'asset', name: item.name, url: mediaUrl(id, true), estimate }); continue; }
    if (group.length && (size + estimate > 20_000_000 || group.length >= 30)) addGroup();
    group.push(id); size += estimate;
  }
  addGroup();
  const zipCount = tasks.filter((task) => task.kind === 'zip').length;
  let zipIndex = 0;
  tasks.forEach((task) => { if (task.kind === 'zip') { zipIndex++; task.name = `Thalia_Recursos_${String(zipIndex).padStart(2,'0')}-de-${String(zipCount).padStart(2,'0')}.zip`; task.url = '/api/client-bundle'; task.options = { method:'POST', headers:{ 'content-type':'application/json' }, body:JSON.stringify({ ids: task.ids }) }; } });
  try {
    await runDownloads(tasks);
  } catch (error) { toast(error.message || t('zipError')); }
  finally { button.disabled = false; }
}

async function init() {
  $('languageButton').addEventListener('click', () => { state.lang = state.lang === 'es' ? 'en' : 'es'; translate(); });
  $('accessForm').addEventListener('submit', async (event) => {
    event.preventDefault(); const email = $('accessEmail').value.trim().toLowerCase(); const button = $('accessSubmit'); button.disabled = true; accessRequestPending = true; button.textContent = t('sendingLink'); setRequestFeedback('pending', t('sendingDetail'), 'sendingDetail');
    try {
      const response = await api('/api/client-access/request', { method:'POST', headers:{ 'content-type':'application/json' }, body: JSON.stringify({ email }), timeoutMs: 30000 }); const result = await response.json(); setRequestFeedback('success', t('sent'), 'sent'); if (result.previewLink) { const link = document.createElement('a'); link.href = result.previewLink; link.textContent = 'Abrir enlace de prueba'; $('previewLinkWrap').replaceChildren(link); $('previewLinkWrap').hidden = false; }
    } catch (error) { const timedOut = error.name === 'TimeoutError' || error.name === 'AbortError'; setRequestFeedback('error', timedOut ? t('sendTimeout') : error.message || t('setup'), timedOut ? 'sendTimeout' : ''); }
    finally { accessRequestPending = false; button.disabled = false; button.textContent = t('requestLink'); }
  });
  $('logoutButton').addEventListener('click', async () => { await api('/api/client-access/logout', { method:'POST' }).catch(() => {}); state.selected.clear(); showAccess(); });
  document.querySelectorAll('[data-tab]').forEach((tab) => tab.addEventListener('click', () => { state.tab = tab.dataset.tab; state.query = state.format = ''; $('searchInput').value = $('formatFilter').value = ''; render(); }));
  $('searchInput').addEventListener('input', (event) => { state.query = event.target.value; render(); });
  $('colorFilter').addEventListener('change', (event) => { state.color = event.target.value; render(); });
  $('formatFilter').addEventListener('change', (event) => { state.format = event.target.value; render(); });
  $('languageFilter').addEventListener('change', (event) => { state.language = event.target.value; render(); });
  $('clearFilters').addEventListener('click', () => { state.query = state.color = state.language = state.format = ''; $('searchInput').value = $('colorFilter').value = $('languageFilter').value = $('formatFilter').value = ''; render(); });
  $('filterToggle').addEventListener('click', () => { $('filters').hidden = !$('filters').hidden; $('filterToggle').setAttribute('aria-expanded', String(!$('filters').hidden)); });
  $('cardGrid').addEventListener('click', (event) => { const target = event.target.closest('[data-open-model],[data-open-media],[data-toggle-model],[data-toggle-asset]'); if (!target) return; if (target.dataset.openModel) openModel(target.dataset.openModel); else if (target.dataset.openMedia) openMedia(target.dataset.openMedia); else if (target.dataset.toggleModel) toggleModel(target.dataset.toggleModel); else if (target.dataset.toggleAsset) { const id = target.dataset.toggleAsset; state.selected.has(id) ? state.selected.delete(id) : state.selected.add(id); updateCart(); } });
  $('detailBody').addEventListener('click', (event) => { const target = event.target.closest('[data-show-image],[data-show-video],[data-toggle-model],[data-toggle-asset]'); if (!target) return; if (target.dataset.showImage) showModelMedia(target.dataset.showImage, false); else if (target.dataset.showVideo) showModelMedia(target.dataset.showVideo, true); else if (target.dataset.toggleModel) { toggleModel(target.dataset.toggleModel); target.textContent = t('removeModel'); } else if (target.dataset.toggleAsset) { const id = target.dataset.toggleAsset; state.selected.has(id) ? state.selected.delete(id) : state.selected.add(id); target.textContent = t(state.selected.has(id) ? 'remove' : 'add'); updateCart(); } });
  $('closeDetail').addEventListener('click', () => $('detailDialog').close()); $('detailDialog').addEventListener('close', () => $('detailMain')?.querySelector('video')?.pause()); $('closeMedia').addEventListener('click', closeMedia);
  $('mediaDialog').addEventListener('close', () => { $('mediaBody').querySelector('video')?.pause(); $('mediaBody').replaceChildren(); });
  $('cartButton').addEventListener('click', openCart); $('closeCart').addEventListener('click', closeCart); $('scrim').addEventListener('click', closeCart);
  $('cartList').addEventListener('click', (event) => { const button = event.target.closest('[data-remove]'); if (button) { state.selected.delete(button.dataset.remove); updateCart(); } });
  $('clearCart').addEventListener('click', () => { state.selected.clear(); updateCart(); }); $('downloadZip').addEventListener('click', downloadSelection);
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[download][href*="/api/client-media/"]');
    if (!link) return;
    event.preventDefault();
    const path = new URL(link.href).pathname;
    downloadAsset(decodeURIComponent(path.slice('/api/client-media/'.length)));
  });
  $('downloadDialog').addEventListener('cancel', (event) => event.preventDefault());
  document.addEventListener('keydown', (event) => { if (!downloadInProgress && event.key === 'Escape' && !$('drawer').hidden) closeCart(); });
  translate();
  const params = new URLSearchParams(location.search);
  if (location.hostname === '127.0.0.1' && params.has('preview') && !params.has('auth_preview')) await api('/api/client-access/preview', { method:'POST' }).catch(() => {});
  const token = params.get('access');
  if (token) {
    const openingStarted = performance.now();
    const cleanUrl = new URL(location.href); cleanUrl.searchParams.delete('access');
    $('accessForm').hidden = true;
    let preview = false;
    try { await api('/api/client-access/consume', { method:'POST', headers:{ 'content-type':'application/json' }, body: JSON.stringify({ token }) }); }
    catch {
      try { const session = await (await api('/api/client-session', { timeoutMs: 12000 })).json(); preview = session.preview; }
      catch { history.replaceState({}, '', cleanUrl.pathname + cleanUrl.search + cleanUrl.hash); showAccess(t('invalid')); return; }
    }
    history.replaceState({}, '', cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
    try { await enterLibraryWithRetry(preview); await finishOpening(openingStarted); }
    catch { showRetry(); }
    return;
  }
  let session;
  try { session = await (await api('/api/client-session', { timeoutMs: 12000 })).json(); }
  catch { showAccess(); return; }
  try { await enterLibraryWithRetry(session.preview); }
  catch { showRetry(); }
}
init().catch((error) => { console.error('Thalia portal:', error); showAccess(t('setup')); });
