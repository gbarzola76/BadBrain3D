// Plugin de Vite para buscadores y redes sociales.
// Al compilar, toma el contenido de contenido/*.json y lo escribe directamente en index.html:
//   - título, descripción y vista previa para WhatsApp/Instagram/Facebook (Open Graph),
//   - datos estructurados para Google (tienda + productos con precio),
//   - el texto del catálogo, muestrario y preguntas, para que Google lo lea sin JavaScript.
// También genera robots.txt y sitemap.xml.
// La dirección del sitio se configura en contenido/sitio.json → "seo" → "url".
import { readFileSync } from 'node:fs';

const leer = (archivo) => JSON.parse(readFileSync(new URL(`../contenido/${archivo}`, import.meta.url), 'utf8'));

const esc = (t) =>
  String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const conFoto = (x) => typeof x.imagen === 'string' && x.imagen.trim() !== '';
const tienePrecio = (p) => typeof p.precio === 'number' && p.precio > 0;
const precioTexto = (n, moneda) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: moneda || 'ARS', maximumFractionDigits: 0 }).format(n);

function datos() {
  const sitio = leer('sitio.json');
  const productos = leer('productos.json').filter(conFoto);
  const muestrario = leer('muestrario.json').filter(conFoto);
  const seo = sitio.seo || {};
  const url = String(seo.url || '').replace(/\/+$/, '');
  const abs = (ruta) => (url ? `${url}/${ruta.replace(/^\.?\//, '')}` : ruta);
  const foto = (nombre) => abs(`contenido/imagenes/${nombre}`);
  return { sitio, productos, muestrario, seo, url, abs, foto };
}

function cabecera({ sitio, productos, seo, url, abs, foto }) {
  const titulo = seo.titulo || `${sitio.marca} — ${sitio.eslogan}`;
  const descripcion = seo.descripcion || sitio.hero?.texto || '';
  const imagen = seo.imagen ? foto(seo.imagen) : productos[0] ? foto(productos[0].imagen) : '';
  const c = sitio.contacto || {};

  const tienda = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: sitio.marca,
    description: descripcion,
    ...(url && { url: `${url}/` }),
    ...(imagen && { image: imagen }),
    ...(c.email && { email: c.email }),
    ...(c.whatsapp && { telephone: `+${c.whatsapp}` }),
    ...(c.ciudad && { address: { '@type': 'PostalAddress', addressLocality: c.ciudad, addressCountry: 'AR' } }),
    areaServed: { '@type': 'Country', name: 'Argentina' },
    currenciesAccepted: sitio.moneda || 'ARS',
    ...(c.instagram && c.instagram !== 'tumarca' && { sameAs: [`https://www.instagram.com/${c.instagram}/`] })
  };
  const catalogo = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Catálogo de ${sitio.marca}`,
    itemListElement: productos.filter(tienePrecio).map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Product',
        name: p.nombre,
        description: p.descripcion,
        image: foto(p.imagen),
        material: p.material,
        brand: { '@type': 'Brand', name: sitio.marca },
        offers: {
          '@type': 'Offer',
          price: p.precio,
          priceCurrency: sitio.moneda || 'ARS',
          availability: 'https://schema.org/MadeToOrder',
          ...(url && { url: `${url}/#catalogo` })
        }
      }
    }))
  };
  const json = (o) => JSON.stringify(o).replace(/</g, '\\u003c');

  return [
    `<title>${esc(titulo)}</title>`,
    `<meta name="description" content="${esc(descripcion)}" />`,
    url && `<link rel="canonical" href="${esc(url)}/" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:locale" content="es_AR" />`,
    `<meta property="og:site_name" content="${esc(sitio.marca)}" />`,
    `<meta property="og:title" content="${esc(titulo)}" />`,
    `<meta property="og:description" content="${esc(descripcion)}" />`,
    url && `<meta property="og:url" content="${esc(url)}/" />`,
    imagen && `<meta property="og:image" content="${esc(imagen)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    sitio.colores?.acento && `<meta name="theme-color" content="${esc(sitio.colores.acento)}" />`,
    `<script type="application/ld+json">${json(tienda)}</script>`,
    catalogo.itemListElement.length && `<script type="application/ld+json">${json(catalogo)}</script>`
  ]
    .filter(Boolean)
    .join('\n    ');
}

// Versión en texto de la página. React la reemplaza apenas carga.
function cuerpo({ sitio, productos, muestrario }) {
  const m = sitio.muestrario || {};
  const lista = (items, fila) => `<ul>${items.map((x) => `<li>${fila(x)}</li>`).join('')}</ul>`;
  return `<div class="contenedor" style="padding:2rem 1rem">
      <h1>${esc(sitio.marca)} — ${esc(sitio.hero?.titulo || sitio.eslogan)}</h1>
      <p>${esc(sitio.hero?.texto)}</p>
      <h2>Catálogo</h2>
      ${lista(productos, (p) => `<strong>${esc(p.nombre)}</strong>${tienePrecio(p) ? ` — ${esc(precioTexto(p.precio, sitio.moneda))}` : ''} (${esc(p.material)}). ${esc(p.descripcion)}`)}
      <h2>${esc(m.titulo || 'Muestrario')}</h2>
      ${m.texto ? `<p>${esc(m.texto)}</p>` : ''}
      ${lista(muestrario, (t) => `<strong>${esc(t.titulo)}</strong> (${esc(t.material)}). ${esc(t.descripcion)}`)}
      <h2>Preguntas frecuentes</h2>
      ${lista(sitio.preguntas || [], (q) => `<strong>${esc(q.pregunta)}</strong> ${esc(q.respuesta)}`)}
    </div>`;
}

export default function seo() {
  return {
    name: 'seo-bad-brain',
    transformIndexHtml(html) {
      const d = datos();
      return html
        .replace(/<title>[\s\S]*?<\/title>\s*<meta name="description"[^>]*>/, cabecera(d))
        .replace('<div id="root"></div>', `<div id="root">${cuerpo(d)}</div>`);
    },
    generateBundle() {
      const { url } = datos();
      const robots = ['User-agent: *', 'Allow: /', 'Disallow: /api/', url && `Sitemap: ${url}/sitemap.xml`];
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots.filter(Boolean).join('\n') + '\n' });
      if (url) {
        const hoy = new Date().toISOString().slice(0, 10);
        this.emitFile({
          type: 'asset',
          fileName: 'sitemap.xml',
          source: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${esc(url)}/</loc><lastmod>${hoy}</lastmod></url>
</urlset>
`
        });
      }
    }
  };
}
