// Administración de productos (/admin).
// - Ingreso con contraseña (secreto ADMIN_PASSWORD en Cloudflare). La sesión es una cookie firmada.
// - Los cambios se guardan como un commit en GitHub (secreto GITHUB_TOKEN). Cloudflare ve el commit,
//   vuelve a armar la web y en 1–2 minutos la tienda muestra lo nuevo.
// Ninguna clave se guarda en el código.

const COOKIE = 'bb_admin';
const DURACION_SESION = 30 * 24 * 3600; // 30 días
const RUTA_PRODUCTOS = 'contenido/productos.json';
const CARPETA_FOTOS = 'contenido/imagenes';
const NOMBRE_FOTO = /^[a-z0-9][a-z0-9._-]{0,90}\.(jpe?g|png|webp)$/i;
const MAX_FOTO_BYTES = 5 * 1024 * 1024;

const json = (datos, status = 200, extra = {}) =>
  new Response(JSON.stringify(datos), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra }
  });

class ErrorAdmin extends Error {
  constructor(mensaje, status = 400) { super(mensaje); this.status = status; }
}

export async function atenderAdmin(request, env, url) {
  const ruta = url.pathname.replace(/^\/api\/admin/, '') || '/';
  try {
    if (!env.ADMIN_PASSWORD) throw new ErrorAdmin('Falta configurar la contraseña del admin (ADMIN_PASSWORD) en Cloudflare.', 503);

    if (ruta === '/login' && request.method === 'POST') return await login(request, env, url);
    if (ruta === '/logout' && request.method === 'POST') return json({ ok: true }, 200, { 'set-cookie': cookie('', 0, url) });

    // Todo lo demás pide sesión iniciada.
    if (!(await sesionValida(request, env))) throw new ErrorAdmin('Tenés que iniciar sesión.', 401);
    if (request.method !== 'GET' && request.headers.get('x-admin') !== '1') throw new ErrorAdmin('Pedido inválido.', 403);

    if (ruta === '/sesion' && request.method === 'GET') return json({ ok: true });
    if (!env.GITHUB_TOKEN) throw new ErrorAdmin('Falta configurar el permiso de GitHub (GITHUB_TOKEN) en Cloudflare.', 503);
    const gh = github(env);

    if (ruta === '/productos' && request.method === 'GET') {
      const archivo = await gh.leerArchivo(RUTA_PRODUCTOS);
      return json({ productos: JSON.parse(archivo.texto), version: archivo.sha });
    }
    if (ruta.startsWith('/foto/') && request.method === 'GET') {
      const nombre = decodeURIComponent(ruta.slice('/foto/'.length));
      if (!NOMBRE_FOTO.test(nombre)) throw new ErrorAdmin('Nombre de foto inválido.');
      return await gh.fotoCruda(`${CARPETA_FOTOS}/${nombre}`);
    }
    if (ruta === '/guardar' && request.method === 'POST') return await guardar(request, gh);

    throw new ErrorAdmin('No encontrado.', 404);
  } catch (err) {
    if (err instanceof ErrorAdmin) return json({ error: err.message }, err.status);
    console.error('Error en el admin:', err);
    return json({ error: 'Algo falló del lado del servidor. Probá de nuevo en un rato.' }, 500);
  }
}

// ---------- Sesión ----------

async function clave(env) {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(`badbrain-admin:${env.ADMIN_PASSWORD}`),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const desdeHex = (h) => new Uint8Array((h.match(/../g) || []).map((x) => parseInt(x, 16)));

function cookie(valor, maxAge, url) {
  const segura = url.protocol === 'https:' ? '; Secure' : '';
  return `${COOKIE}=${valor}; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${segura}`;
}

async function login(request, env, url) {
  const { password } = await request.json().catch(() => ({}));
  const a = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(password ?? ''))));
  const b = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(env.ADMIN_PASSWORD)));
  if (!crypto.subtle.timingSafeEqual(a, b)) {
    await new Promise((r) => setTimeout(r, 1000)); // frena los intentos por fuerza bruta
    throw new ErrorAdmin('Contraseña incorrecta.', 401);
  }
  const vence = Math.floor(Date.now() / 1000) + DURACION_SESION;
  const firma = hex(await crypto.subtle.sign('HMAC', await clave(env), new TextEncoder().encode(String(vence))));
  return json({ ok: true }, 200, { 'set-cookie': cookie(`${vence}.${firma}`, DURACION_SESION, url) });
}

async function sesionValida(request, env) {
  const valor = (request.headers.get('cookie') || '').split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  const [vence, firma] = (valor || '').split('.');
  if (!vence || !firma || !/^\d+$/.test(vence) || Number(vence) < Date.now() / 1000) return false;
  return crypto.subtle.verify('HMAC', await clave(env), desdeHex(firma), new TextEncoder().encode(vence));
}

// ---------- GitHub ----------

function github(env) {
  const base = (env.GITHUB_API || 'https://api.github.com').replace(/\/$/, '');
  const repo = env.GITHUB_REPO;
  const rama = env.GITHUB_BRANCH || 'main';
  const cabeceras = {
    authorization: `Bearer ${env.GITHUB_TOKEN}`,
    'user-agent': 'badbrain3d-admin',
    'x-github-api-version': '2022-11-28'
  };
  async function api(ruta, opciones = {}) {
    const r = await fetch(`${base}/repos/${repo}${ruta}`, {
      ...opciones,
      headers: { ...cabeceras, accept: 'application/vnd.github+json', ...(opciones.body ? { 'content-type': 'application/json' } : {}), ...opciones.headers }
    });
    if (!r.ok) {
      const detalle = await r.text().catch(() => '');
      console.error('GitHub respondió', r.status, ruta, detalle.slice(0, 500));
      if (r.status === 401 || r.status === 403) throw new ErrorAdmin('GitHub rechazó el permiso (GITHUB_TOKEN). Revisá que esté bien cargado y no haya vencido.', 502);
      if (r.status === 409 || r.status === 422) throw new ErrorAdmin('Hubo otro cambio al mismo tiempo. Recargá la página y volvé a intentar.', 409);
      throw new ErrorAdmin('No se pudo conectar con GitHub. Probá de nuevo en un rato.', 502);
    }
    return r;
  }
  const ruta = (p) => p.split('/').map(encodeURIComponent).join('/');
  return {
    async leerArchivo(path) {
      const datos = await (await api(`/contents/${ruta(path)}?ref=${rama}`)).json();
      const bytes = Uint8Array.from(atob(datos.content.replace(/\n/g, '')), (c) => c.charCodeAt(0));
      return { texto: new TextDecoder().decode(bytes), sha: datos.sha };
    },
    async listarFotos() {
      const datos = await (await api(`/contents/${ruta(CARPETA_FOTOS)}?ref=${rama}`)).json();
      return new Set(datos.filter((x) => x.type === 'file').map((x) => x.name));
    },
    async fotoCruda(path) {
      const r = await api(`/contents/${ruta(path)}?ref=${rama}`, { headers: { accept: 'application/vnd.github.raw' } });
      const ext = path.split('.').pop().toLowerCase();
      const tipo = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      return new Response(r.body, { headers: { 'content-type': tipo, 'cache-control': 'private, max-age=600' } });
    },
    // Un solo commit con el JSON, las fotos nuevas y las borradas.
    async commit(mensaje, cambios) {
      const ref = await (await api(`/git/ref/heads/${rama}`)).json();
      const padre = ref.object.sha;
      const base = await (await api(`/git/commits/${padre}`)).json();
      const arbol = [];
      for (const c of cambios) {
        if (c.borrar) arbol.push({ path: c.path, mode: '100644', type: 'blob', sha: null });
        else if (c.base64) {
          const blob = await (await api('/git/blobs', { method: 'POST', body: JSON.stringify({ content: c.base64, encoding: 'base64' }) })).json();
          arbol.push({ path: c.path, mode: '100644', type: 'blob', sha: blob.sha });
        } else arbol.push({ path: c.path, mode: '100644', type: 'blob', content: c.texto });
      }
      const tree = await (await api('/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: base.tree.sha, tree: arbol }) })).json();
      const nuevo = await (await api('/git/commits', { method: 'POST', body: JSON.stringify({ message: mensaje, tree: tree.sha, parents: [padre] }) })).json();
      await api(`/git/refs/heads/${rama}`, { method: 'PATCH', body: JSON.stringify({ sha: nuevo.sha, force: false }) });
      return nuevo.sha;
    }
  };
}

// ---------- Guardar ----------

const texto = (v, max, campo, obligatorio = false) => {
  const t = String(v ?? '').trim();
  if (obligatorio && !t) throw new ErrorAdmin(`Falta completar: ${campo}.`);
  if (t.length > max) throw new ErrorAdmin(`"${campo}" es demasiado largo (máximo ${max} caracteres).`);
  return t;
};
const numero = (v, campo, { min = 0, max = 1e7, entero = false } = {}) => {
  if (v === '' || v == null) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max || (entero && !Number.isInteger(n))) throw new ErrorAdmin(`"${campo}" tiene un valor inválido.`);
  return n;
};

function limpiarProducto(p, fotosDisponibles) {
  const id = texto(p?.id, 60, 'identificador', true);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) throw new ErrorAdmin(`El identificador "${id}" solo puede tener minúsculas, números y guiones.`);
  const nombre = texto(p.nombre, 120, 'nombre', true);
  const imagenes = Array.isArray(p.imagenes) ? p.imagenes.map(String) : [];
  if (imagenes.length > 12) throw new ErrorAdmin(`"${nombre}" tiene demasiadas fotos (máximo 12).`);
  for (const f of imagenes) {
    if (!NOMBRE_FOTO.test(f) || !fotosDisponibles.has(f)) throw new ErrorAdmin(`La foto "${f}" de "${nombre}" no existe.`);
  }
  const colores = (Array.isArray(p.colores) ? p.colores : []).map((c) => texto(c, 30, 'color')).filter(Boolean);
  if (colores.length > 20) throw new ErrorAdmin(`"${nombre}" tiene demasiados colores.`);
  const limpio = {
    id,
    nombre,
    categoria: texto(p.categoria, 40, 'categoría', true),
    material: texto(p.material, 30, 'material'),
    medida: texto(p.medida, 80, 'medida'),
    precio: numero(p.precio, 'precio', { max: 1e8, entero: true }),
    descuento: numero(p.descuento, 'descuento', { min: 1, max: 90, entero: true }),
    imagenes,
    colores,
    descripcion: texto(p.descripcion, 1500, 'descripción'),
    activo: p.activo !== false
  };
  const e = p.envio || {};
  const envio = {
    largo: numero(e.largo, 'largo del envío', { max: 200 }),
    ancho: numero(e.ancho, 'ancho del envío', { max: 200 }),
    alto: numero(e.alto, 'alto del envío', { max: 200 }),
    peso: numero(e.peso, 'peso del envío', { max: 50000 })
  };
  if (Object.values(envio).some((v) => v != null)) limpio.envio = envio;
  if (limpio.descuento == null) delete limpio.descuento;
  const orden = ['id', 'nombre', 'categoria', 'material', 'medida', 'precio', 'descuento', 'imagenes', 'colores', 'descripcion', 'envio', 'activo'];
  return Object.fromEntries(orden.filter((k) => k in limpio).map((k) => [k, limpio[k]]));
}

async function guardar(request, gh) {
  const datos = await request.json().catch(() => null);
  if (!datos || !Array.isArray(datos.productos)) throw new ErrorAdmin('Pedido inválido.');
  if (datos.productos.length > 500) throw new ErrorAdmin('Demasiados productos.');

  // Si alguien guardó después de que cargaste la lista, no se pisa su cambio.
  const actual = await gh.leerArchivo(RUTA_PRODUCTOS);
  if (datos.version !== actual.sha) throw new ErrorAdmin('Los productos cambiaron desde otra pestaña o dispositivo. Recargá la página y volvé a hacer el cambio.', 409);

  const existentes = await gh.listarFotos();
  const cambios = [];
  const disponibles = new Set(existentes);
  for (const f of Array.isArray(datos.fotosNuevas) ? datos.fotosNuevas : []) {
    const nombre = String(f?.nombre || '');
    if (!NOMBRE_FOTO.test(nombre) || existentes.has(nombre)) throw new ErrorAdmin(`Nombre de foto nueva inválido: "${nombre}".`);
    const base64 = String(f.base64 || '').replace(/^data:[^,]*,/, '');
    if (!/^[A-Za-z0-9+/=]+$/.test(base64) || base64.length * 0.75 > MAX_FOTO_BYTES) throw new ErrorAdmin(`La foto "${nombre}" es inválida o pesa más de 5 MB.`);
    cambios.push({ path: `${CARPETA_FOTOS}/${nombre}`, base64 });
    disponibles.add(nombre);
  }

  const productos = datos.productos.map((p) => limpiarProducto(p, disponibles));
  const ids = new Set();
  for (const p of productos) {
    if (ids.has(p.id)) throw new ErrorAdmin(`Hay dos productos con el identificador "${p.id}".`);
    ids.add(p.id);
  }
  const textoProductos = JSON.stringify(productos, null, 2) + '\n';
  cambios.push({ path: RUTA_PRODUCTOS, texto: textoProductos });

  // Fotos que se sacaron de un producto: se borran solo si nada más las usa.
  const pedidasBorrar = (Array.isArray(datos.fotosBorrar) ? datos.fotosBorrar : []).map(String).filter((f) => NOMBRE_FOTO.test(f) && existentes.has(f));
  if (pedidasBorrar.length) {
    const otros = (await Promise.all(['contenido/muestrario.json', 'contenido/sitio.json'].map((p) => gh.leerArchivo(p).then((a) => a.texto)))).join('\n');
    for (const f of pedidasBorrar) {
      if (!textoProductos.includes(`"${f}"`) && !otros.includes(`"${f}"`)) cambios.push({ path: `${CARPETA_FOTOS}/${f}`, borrar: true });
    }
  }

  const mensaje = `Admin: ${texto(datos.mensaje, 120, 'mensaje') || 'cambios en productos'}`;
  const commit = await gh.commit(mensaje, cambios);
  const nuevo = await gh.leerArchivo(RUTA_PRODUCTOS);
  return json({ ok: true, commit, productos, version: nuevo.sha });
}
