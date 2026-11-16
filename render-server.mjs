import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const staticRoot = path.join(here, 'public');
const fallbackFile = path.join(staticRoot, 'index.html');
const upstream = new URL(process.env.THALIA_UPSTREAM || 'https://thalia-sodi-eyewear-b2b.moisses.chatgpt.site');
const port = Number(process.env.PORT || 10000);

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.gif', 'image/gif'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.mp4', 'video/mp4'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webm', 'video/webm'],
  ['.webp', 'image/webp'],
  ['.xml', 'application/xml; charset=utf-8'],
]);

function safeStaticFile(pathname) {
  let decoded;
  try { decoded = decodeURIComponent(pathname); }
  catch { return null; }
  const candidate = path.resolve(staticRoot, `.${decoded}`);
  if (candidate !== staticRoot && !candidate.startsWith(`${staticRoot}${path.sep}`)) return null;
  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
    const indexFile = path.join(candidate, 'index.html');
    if (fs.existsSync(indexFile)) return indexFile;
  }
  if (!path.extname(candidate)) {
    const indexFile = path.join(candidate, 'index.html');
    if (fs.existsSync(indexFile)) return indexFile;
  }
  return null;
}

function serveFile(request, response, file) {
  const stat = fs.statSync(file);
  response.writeHead(200, {
    'content-type': contentTypes.get(path.extname(file).toLowerCase()) || 'application/octet-stream',
    'content-length': String(stat.size),
    'cache-control': file.endsWith('.html') ? 'no-cache' : 'public, max-age=3600',
    'x-content-type-options': 'nosniff',
  });
  if (request.method === 'HEAD') return response.end();
  fs.createReadStream(file).pipe(response);
}

async function proxyPortal(request, response, incomingUrl) {
  const target = new URL(`${incomingUrl.pathname}${incomingUrl.search}`, upstream);
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (value == null || ['host', 'connection', 'content-length', 'transfer-encoding'].includes(name.toLowerCase())) continue;
    headers.set(name, Array.isArray(value) ? value.join(', ') : value);
  }
  headers.set('accept-encoding', 'identity');
  if (!['GET', 'HEAD'].includes(request.method)) {
    headers.set('origin', upstream.origin);
    headers.set('referer', `${upstream.origin}/clientes/`);
  }

  const chunks = [];
  if (!['GET', 'HEAD'].includes(request.method)) for await (const chunk of request) chunks.push(chunk);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  const upstreamResponse = await fetch(target, { method: request.method, headers, body, redirect: 'follow' });
  const outgoingHeaders = {};
  for (const [name, value] of upstreamResponse.headers) {
    if (['connection', 'transfer-encoding', 'content-encoding'].includes(name.toLowerCase())) continue;
    outgoingHeaders[name] = value;
  }
  response.writeHead(upstreamResponse.status, outgoingHeaders);
  if (request.method === 'HEAD' || !upstreamResponse.body) return response.end();
  Readable.fromWeb(upstreamResponse.body).pipe(response);
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  try {
    if (requestUrl.pathname === '/healthz') {
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      return response.end(JSON.stringify({ ok: true, service: 'thalia-web' }));
    }
    if (requestUrl.pathname.startsWith('/api/client-')) return await proxyPortal(request, response, requestUrl);
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, { allow: 'GET, HEAD' });
      return response.end('Method not allowed');
    }
    const file = safeStaticFile(requestUrl.pathname);
    return serveFile(request, response, file || fallbackFile);
  } catch (error) {
    console.error('Thalia Render proxy:', error?.message || error);
    if (!response.headersSent) response.writeHead(502, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    response.end(JSON.stringify({ error: 'Servicio temporalmente no disponible' }));
  }
});

server.listen(port, '0.0.0.0', () => console.log(`Thalia web listening on ${port}`));

