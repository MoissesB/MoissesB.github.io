import { initCatalog } from './catalog.js';
import { initProduct } from './product.js';
import { createSelection } from './selection.js';

const lang = document.documentElement.lang === 'en' ? 'en' : 'es';
const toastNode = document.querySelector('[data-toast]');
let toastTimer;
function toast(message) { if (!toastNode) return; toastNode.textContent = message; toastNode.classList.add('is-visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toastNode.classList.remove('is-visible'), 2200); }

const [products, site] = await Promise.all([
  fetch('/data/products.json').then((response) => response.json()),
  fetch('/data/site.json').then((response) => response.json())
]);

if (document.body.dataset.audience !== 'b2c' && document.body.dataset.audience !== 'neutral') {
  createSelection({ products, site, lang, toast });
}
initCatalog({ products, lang });
initProduct({ products, lang, toast });

const topbar = document.querySelector('[data-topbar]');
const updateHeader = () => topbar?.classList.toggle('is-scrolled', scrollY > 20);
updateHeader(); addEventListener('scroll', updateHeader, { passive:true });

const menuButton = document.querySelector('[data-menu-toggle]');
const mobileNav = document.querySelector('[data-mobile-nav]');
menuButton?.addEventListener('click', () => { const open = !mobileNav.classList.contains('is-open'); mobileNav.classList.toggle('is-open', open); menuButton.setAttribute('aria-expanded', String(open)); });
mobileNav?.addEventListener('click', () => { mobileNav.classList.remove('is-open'); menuButton?.setAttribute('aria-expanded','false'); });

document.querySelector('[data-audio-toggle]')?.addEventListener('click', (event) => {
  const video = document.querySelector('#temple-video'); if (!video) return;
  video.muted = !video.muted; event.currentTarget.setAttribute('aria-pressed', String(!video.muted));
  event.currentTarget.textContent = video.muted ? (lang === 'es' ? 'Activar audio' : 'Enable audio') : (lang === 'es' ? 'Desactivar audio' : 'Mute audio');
  video.play().catch(()=>{});
});
